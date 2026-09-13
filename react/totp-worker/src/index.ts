/*
 * Hands out TOTP time slots to the e2e tests that sign in to Google.
 *
 * Google will not accept a TOTP code it has already seen, so two tests signing in at once must
 * generate their codes from different 30-second steps. Each request reserves the next unused step
 * and answers with the instant to generate at; the caller sleeps until then.
 */

import type { DurableObjectId, DurableObjectState } from '@cloudflare/workers-types'

const stepMs = 30_000

// Nudges the choice of step forward, and with the rounding below reserves the next step unless at
// least 20s of the current one remain -- room for the caller to generate and submit inside it.
const leadMs = 5_000

// Narrower than the runtime's own DurableObjectNamespace, which speaks its Request and Response
// rather than the DOM ones this file is checked against.
interface SlotsNamespace {
    idFromName: (name: string) => DurableObjectId
    get: (id: DurableObjectId) => { fetch: (request: Request) => Promise<Response> }
}

interface Env {
    // eslint-disable-next-line no-restricted-syntax -- The binding name comes from wrangler.toml.
    TOTP_SLOTS: SlotsNamespace
}

export class TOTPSlots {
    private readonly state: DurableObjectState

    constructor(state: DurableObjectState) {
        this.state = state
    }

    async fetch(): Promise<Response> {
        const useAfter = await this.state.blockConcurrencyWhile(async () => {
            const earliest = Math.round((Date.now() + leadMs) / stepMs)
            const step = Math.max(await this.state.storage.get<number>('nextStep') ?? 0, earliest)
            await this.state.storage.put('nextStep', step + 1)
            return step * stepMs
        })
        return new Response(JSON.stringify({ useAfter }), { headers: { 'content-type': 'application/json' } })
    }
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Anything else reaching the hostname -- a crawler, a scanner -- would otherwise spend a
        // step and push every waiting test further out.
        if (new URL(request.url).pathname !== '/totp-slot') {
            return new Response('Not found\n', { status: 404 })
        }
        // One object, hence one cursor: drawing from the same sequence is the whole point.
        const id = env.TOTP_SLOTS.idFromName('slots')
        return env.TOTP_SLOTS.get(id).fetch(request)
    },
}
