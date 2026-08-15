import { tmpdir } from 'os'
import { join } from 'path'

import { execa } from 'execa'
import { WebSocket } from 'ws'

import { target } from './test_utils'

// Matches OG_PORT's default in og-worker/preview.sh and ogPort's default in PageDescriptor.
export const ogPort = 8787

// Matches preview.sh, which derives it from the same port for the reason given there.
const inspectorPort = ogPort + 1

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

/**
 * The two numbers Cloudflare checks before a Worker is allowed to run at all: the compressed
 * bundle it has to ship, and the CPU the top level of that bundle burns on a cold isolate.
 */
export async function ogWorkerBundleCost(): Promise<{ gzipKiB: number, startupCpuMs: number }> {
    const { all } = await execa('npx', ['wrangler', 'check', 'startup', '--outfile', join(tmpdir(), 'og-worker-startup.cpuprofile')], {
        cwd: 'og-worker',
        all: true,
        env: { WRANGLER_SEND_METRICS: 'false' },
    })
    const gzipKiB = /gzip: ([\d.]+) KiB/.exec(all!)
    // Excludes the profile's idle time, so it is the number the 400ms startup limit is measured against.
    const startupCpuMs = /Active: ([\d.]+) ms/.exec(all!)
    if (gzipKiB === null || startupCpuMs === null) {
        throw new Error(`Could not read bundle cost from wrangler:\n${all}`)
    }
    return { gzipKiB: parseFloat(gzipKiB[1]), startupCpuMs: parseFloat(startupCpuMs[1]) }
}

interface RenderCost {
    cpuMs: number
    subrequests: number
    originBytes: number
}

/**
 * What one card render costs. `wrangler dev` reports wall time, which on a local origin is mostly
 * fetch latency; workerd's inspector is the only place the CPU and subrequest numbers that
 * Cloudflare actually meters show up.
 */
export async function ogRenderCost(articleUrl: string): Promise<RenderCost> {
    const socket = new WebSocket(`ws://localhost:${inspectorPort}/ws`)
    let nextId = 0
    const replies = new Map<number, (result: unknown) => void>()
    let subrequests = 0
    let originBytes = 0
    socket.on('message', (raw: Buffer) => {
        const message = JSON.parse(raw.toString()) as { id?: number, method?: string, result?: unknown, params?: { encodedDataLength?: number } }
        if (message.id !== undefined) {
            replies.get(message.id)?.(message.result)
            replies.delete(message.id)
        }
        else if (message.method === 'Network.requestWillBeSent') {
            subrequests += 1
        }
        else if (message.method === 'Network.loadingFinished') {
            originBytes += message.params!.encodedDataLength!
        }
    })
    // Editing the Worker's source restarts wrangler, and a reply that will never arrive is a test
    // that hangs until the whole run times out rather than one that says what happened.
    const disconnected = new Promise<never>((_, reject) => {
        const fail = (): void => { reject(new Error(`Embed Worker's inspector on port ${inspectorPort} closed mid-measurement; was the Worker restarted?`)) }
        socket.on('close', fail)
        socket.on('error', fail)
    })
    disconnected.catch(() => undefined)
    async function send(method: string, params: object = {}): Promise<unknown> {
        const id = nextId++
        socket.send(JSON.stringify({ id, method, params }))
        return Promise.race([new Promise(resolve => replies.set(id, resolve)), disconnected])
    }

    try {
        await Promise.race([new Promise(resolve => socket.on('open', resolve)), disconnected])
        await send('Profiler.enable')
        await send('Profiler.setSamplingInterval', { interval: 100 })

        // The Worker memoizes the site's indices, so a request into a cold isolate fetches things
        // no later one does. Renders are measured against a warm isolate, which is the steady state.
        const run = Date.now()
        await render(articleUrl, `${run}-warmup`)
        // JIT and GC make a single render's CPU vary by half again as much as the render itself, so
        // several renders and the cheapest of them. Subrequests and bytes do not vary.
        const cpus: number[] = []
        for (const attempt of [1, 2, 3]) {
            subrequests = 0
            originBytes = 0
            await send('Network.enable')
            await send('Profiler.start')
            await render(articleUrl, `${run}-${attempt}`)
            cpus.push(activeCpuMs(await send('Profiler.stop')))
            await send('Network.disable')
        }
        return { cpuMs: Math.min(...cpus), subrequests, originBytes }
    }
    finally {
        socket.close()
    }
}

/**
 * `caches.default` would serve every render after the first, and wrangler persists it across runs.
 * The page's zod schemas drop params they do not know, so this changes the cache key and nothing else.
 */
async function render(articleUrl: string, cacheBuster: string): Promise<void> {
    const url = new URL(articleUrl, `http://localhost:${ogPort}`)
    url.searchParams.set('renderCost', cacheBuster)
    const image = `http://localhost:${ogPort}/og${url.pathname}${url.search}`
    // Otherwise a Worker that went away mid-run surfaces as a bare 'fetch failed'.
    const response = await fetch(image).catch((error: unknown) => {
        throw new Error(`Could not reach the embed Worker at ${image}: ${String(error)}`)
    })
    if (!response.ok) {
        throw new Error(`Embed Worker returned ${response.status} for ${image}`)
    }
    await response.arrayBuffer()
}

interface CpuProfile {
    profile: {
        nodes: { id: number, callFrame: { functionName: string } }[]
        samples: number[]
        timeDeltas: number[]
    }
}

function activeCpuMs(result: unknown): number {
    const { profile } = result as CpuProfile
    const names = new Map(profile.nodes.map(node => [node.id, node.callFrame.functionName]))
    const microseconds = profile.samples.reduce((total, sample, index) => {
        const name = names.get(sample)
        // V8's two synthetic frames for time the isolate was not running our code.
        return name === '(idle)' || name === '(program)' ? total : total + profile.timeDeltas[index]
    }, 0)
    return microseconds / 1000
}
