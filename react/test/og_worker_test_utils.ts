import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { createServer } from 'http'
import { createConnection } from 'net'
import { tmpdir } from 'os'
import { join } from 'path'
import { gunzipSync, gzipSync } from 'zlib'

import { execa } from 'execa'
import { WebSocket } from 'ws'

import { target } from './test_utils'

// Matches OG_PORT's default in og-worker/preview.sh and ogPort's default in PageDescriptor.
export const ogPort = 8787

// Matches preview.sh, which derives it the same way.
const inspectorPort = ogPort + 1

const startupTimeoutMs = 120_000

/** Reuses whatever is already listening, otherwise starts one and takes it down with the runner. */
export async function runOgWorkerForTest(): Promise<void> {
    if (await isWorkerAvailable()) {
        console.warn('Embed Worker found. Using existing embed Worker.')
        return
    }
    console.warn('No embed Worker found. Starting new embed Worker...')
    await startOgWorker()
}

/**
 * For the resources test, which deadlocks workerd's inspector measuring a render: the Worker it
 * runs against is good for that one file and nothing after it.
 */
export async function runOwnOgWorkerForTest(): Promise<void> {
    if (await isPortListening(ogPort)) {
        throw new Error(`Something is already listening on port ${ogPort}. Measuring a render leaves the Worker deadlocked, so this test has to start its own. Stop yours and run this file by itself.`)
    }
    await startOgWorker()
}

async function startOgWorker(): Promise<void> {
    // Its own process group, so killing it also takes down the wrangler and workerd processes
    // underneath.
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
    // A deadlocked Worker takes the connection and never answers; node's fetch would wait five
    // minutes on that.
    const giveUp = new AbortController()
    const timer = setTimeout(() => { giveUp.abort() }, 10_000)
    try {
        await fetch(`http://localhost:${ogPort}/index.html`, { signal: giveUp.signal })
        return true
    }
    catch {
        return false
    }
    finally {
        clearTimeout(timer)
    }
}

/**
 * Whether anything at all holds the port, which a request cannot tell us: a Worker still starting
 * and a deadlocked one both take the connection.
 */
async function isPortListening(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = createConnection({ port, host: '127.0.0.1' })
        socket.on('connect', () => { socket.destroy(); resolve(true) })
        socket.on('error', () => { resolve(false) })
    })
}

/*
 * Vector tiles served in place of openfreemap's, so a card screenshot stays put when openfreemap
 * rebuilds its planet. The Worker fetches them itself, out of reach of the browser's CDP, so this
 * stands in as an origin rather than intercepting anything.
 */
const tileSnapshots = join(__dirname, 'assets', 'og-tiles')

// Not ogPort + 1, which is the Worker's inspector.
const tilePort = ogPort + 2

export const snapshotTiles = `http://localhost:${tilePort}`

/** Every tile missing, so a card drawn from this one has no basemap under its shape. */
export const noTiles = `${snapshotTiles}/blank`

// Fetches whatever a run asks for and does not find, for committing.
const recording = process.env.RECORD_OG_TILES !== undefined

let openfreemapTemplate: Promise<string> | undefined

async function recordTile(z: string, x: string, y: string): Promise<Buffer | undefined> {
    openfreemapTemplate ??= fetch('https://tiles.openfreemap.org/planet')
        .then(async response => ((await response.json()) as { tiles: string[] }).tiles[0])
    const url = (await openfreemapTemplate).replaceAll('{z}', z).replaceAll('{x}', x).replaceAll('{y}', y)
    const response = await fetch(url)
    if (!response.ok) {
        console.warn(`openfreemap answered ${response.status} for tile ${z}/${x}/${y}`)
        return undefined
    }
    return Buffer.from(await response.arrayBuffer())
}

async function tileBytes(z: string, x: string, y: string): Promise<Buffer | undefined> {
    // Compressed on disk: a city tile is a few hundred KiB of protobuf.
    const file = join(tileSnapshots, `${z}-${x}-${y}.pbf.gz`)
    if (existsSync(file)) {
        return gunzipSync(readFileSync(file))
    }
    if (!recording) {
        console.warn(`No snapshot of tile ${z}/${x}/${y}. Rerun with RECORD_OG_TILES=1 to fetch it.`)
        return undefined
    }
    const bytes = await recordTile(z, x, y)
    if (bytes !== undefined) {
        mkdirSync(tileSnapshots, { recursive: true })
        writeFileSync(file, gzipSync(bytes))
    }
    return bytes
}

let tileServer: Promise<void> | undefined

export async function runTileServerForTest(): Promise<void> {
    tileServer ??= startTileServer()
    return tileServer
}

async function startTileServer(): Promise<void> {
    const server = createServer((request, response) => {
        void (async (): Promise<void> => {
            const path = new URL(request.url!, snapshotTiles).pathname
            if (path === '/planet' || path === '/blank/planet') {
                // The TileJSON basemap.ts reads the tile path out of. The blank one's tiles are all
                // missing, since only the numbered path below serves anything.
                const prefix = path === '/planet' ? '' : '/blank'
                response.writeHead(200, { 'content-type': 'application/json' })
                response.end(JSON.stringify({ tiles: [`${snapshotTiles}${prefix}/{z}/{x}/{y}.pbf`] }))
                return
            }
            const tile = /^\/(\d+)\/(\d+)\/(\d+)\.pbf$/.exec(path)
            const bytes = tile === null ? undefined : await tileBytes(tile[1], tile[2], tile[3])
            if (bytes === undefined) {
                response.writeHead(404).end()
                return
            }
            response.writeHead(200, { 'content-type': 'application/x-protobuf' })
            response.end(bytes)
        })().catch((error: unknown) => {
            // Otherwise the Worker waits on a request nothing is going to answer.
            console.warn('Tile server failed', error)
            response.writeHead(500).end()
        })
    })
    await new Promise<void>(resolve => server.listen(tilePort, '127.0.0.1', resolve))
    // Otherwise it holds the runner open once the tests are done.
    server.unref()
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
    // Excludes idle time, so this is what the 400ms startup limit is measured against.
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
 * fetch latency; workerd's inspector is the only place the metered numbers show up.
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
    // Editing the Worker's source restarts wrangler, and a reply that never arrives would hang the
    // test until the whole run times out.
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

        // The Worker memoizes the site's indices, so a cold isolate fetches things no later request
        // does. A warm isolate is the steady state.
        const run = Date.now()
        await render(articleUrl, `${run}-warmup`)
        // JIT and GC make a single render's CPU vary by half again as much as the render itself, so
        // take the cheapest of several. Subrequests and bytes do not vary.
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
 * The page's zod schemas drop params they do not know, so the buster changes only the cache key.
 */
async function render(articleUrl: string, cacheBuster: string): Promise<void> {
    const url = new URL(articleUrl, `http://localhost:${ogPort}`)
    url.searchParams.set('renderCost', cacheBuster)
    const image = `http://localhost:${ogPort}/og${url.pathname}${url.search}`
    // Otherwise a Worker that went away mid-run is a bare 'fetch failed'.
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
