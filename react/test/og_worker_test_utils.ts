import { execa } from 'execa'

import { target } from './test_utils'

// Matches OG_PORT's default in og-worker/preview.sh and ogPort's default in PageDescriptor.
export const ogPort = 8787

const startupTimeoutMs = 120_000

/**
 * Brings up the embed Worker the same way quiz_test_utils brings up the quiz server: reuse whatever
 * is already listening, otherwise start one and take it down with the runner.
 */
export async function runOgWorkerForTest(): Promise<void> {
    if (await isWorkerAvailable()) {
        console.warn('Embed Worker found. Using existing embed Worker.')
        return
    }
    console.warn('No embed Worker found. Starting new embed Worker...')
    // Its own process group, so that killing it also takes down the wrangler and workerd
    // processes that `npm run og-preview` spawns underneath itself.
    const worker = execa('npm', ['run', 'og-preview'], {
        stdio: 'inherit',
        detached: true,
        env: {
            OG_PORT: `${ogPort}`,
            SITE_ORIGIN: target,
            // Otherwise wrangler's first run stops to ask about usage metrics.
            WRANGLER_SEND_METRICS: 'false',
        },
    })
    worker.catch((error: unknown) => { console.warn('Embed Worker exited', error) })
    process.on('exit', () => { process.kill(-worker.pid!, 'SIGKILL') })

    const deadline = Date.now() + startupTimeoutMs
    while (!(await isWorkerAvailable())) {
        if (worker.exitCode !== null || Date.now() > deadline) {
            throw new Error('Embed Worker did not start')
        }
        await new Promise(resolve => setTimeout(resolve, 100))
    }
    console.warn('Embed Worker started.')
}

async function isWorkerAvailable(): Promise<boolean> {
    try {
        await fetch(`http://localhost:${ogPort}/index.html`)
        return true
    }
    catch {
        return false
    }
}
