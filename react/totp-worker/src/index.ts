/*
 * Hands each e2e sign-in its own 30-second TOTP step, since Google rejects a reused code. Answers with
 * the instant to generate the code at.
 */

import type { DurableObjectId, DurableObjectState } from '@cloudflare/workers-types'

const stepMs = 30_000

// Skips to the next step unless at least 20s of the current one remain for the caller to submit in.
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
        // Otherwise crawlers would spend steps and delay waiting tests.
        if (new URL(request.url).pathname !== '/totp-slot') {
            return new Response('Not found\n', { status: 404 })
        }
        // One object, so every request shares one cursor
        const id = env.TOTP_SLOTS.idFromName('slots')
        return env.TOTP_SLOTS.get(id).fetch(request)
    },
}
