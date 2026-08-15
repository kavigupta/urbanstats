import http from 'node:http'

import { chromium } from 'playwright'

const origin = process.env.URBANSTATS_ORIGIN ?? 'http://localhost:8000'
const port = Number(process.env.PORT ?? 8010)
const poolSize = Number(process.env.POOL_SIZE ?? 3)
const renderTimeout = Number(process.env.RENDER_TIMEOUT_MS ?? 25000)
const cacheDir = process.env.CACHE_DIR ?? '/tmp/urbanstats-og-render'
// Half scale lands at roughly 1200px wide, which is all an embed displays. Going smaller saves
// bytes but no time, since what is left of the capture is DOM work rather than pixel work.
const captureOptions = { scale: Number(process.env.CAPTURE_SCALE ?? 0.5), type: process.env.IMAGE_TYPE ?? 'image/png' }

// Pages that produce a useful embed, which is to say the ones that have a screenshot button.
const entrypoints = new Set(['/article.html', '/comparison.html', '/statistic.html', '/syau.html'])

// Loaded during warmup so a pooled page arrives at its first real request with the bundle parsed
// and the data files already in the browser cache.
const warmupPath = '/article.html?longname=Chicago+city%2C+Illinois%2C+USA'

const viewport = { width: 1400, height: 1600 }

/**
 * Hands out pages one at a time, so the pool size is also the concurrency limit. Pages are kept in
 * a single browser context, which is what lets them share a warm HTTP cache.
 */
class PagePool {
    constructor(context) {
        this.context = context
        this.idle = []
        this.waiting = []
    }

    async fill(size) {
        for (let i = 0; i < size; i++) {
            this.idle.push(await this.newPage())
        }
    }

    async newPage() {
        const page = await this.context.newPage()
        await page.goto(`${origin}${warmupPath}`, { waitUntil: 'load' })
        await page.waitForFunction(
            () => window.testUtils?.screencap !== undefined && window.testUtils.navigate !== undefined,
            undefined,
            { timeout: renderTimeout },
        )
        // The first capture on a page is slower than the rest, so spend it here rather than on a request.
        await screencap(page)
        return page
    }

    acquire() {
        const page = this.idle.pop()
        if (page !== undefined) {
            return Promise.resolve(page)
        }
        return new Promise((resolve) => { this.waiting.push(resolve) })
    }

    release(page) {
        const waiter = this.waiting.shift()
        if (waiter !== undefined) {
            waiter(page)
        }
        else {
            this.idle.push(page)
        }
    }

    /** A page that threw is of unknown state, so it gets thrown away rather than handed on. */
    async replace(page) {
        await page.close().catch(() => {})
        this.release(await this.newPage())
    }
}

const screencap = page => page.evaluate(options => window.testUtils.screencap(options), captureOptions)

async function render(pool, path) {
    const page = await pool.acquire()
    try {
        // Navigating in-page rather than reloading is what makes a warm page worth keeping: it skips
        // the document load and reuses everything already fetched, tiles included.
        await page.evaluate((target) => {
            window.testUtils.screencap = undefined
            return window.testUtils.navigate(target)
        }, `${origin}${path}`)
        // Re-registered once the new page has mounted, so it doubles as the signal that the capture
        // would be of the page we asked for rather than the one before it.
        await page.waitForFunction(() => window.testUtils.screencap !== undefined, undefined, { timeout: renderTimeout })
        // `evaluate` has no timeout of its own, and a capture that never settles would hold a page
        // out of the pool forever.
        const dataUrl = await Promise.race([
            screencap(page),
            new Promise((_, reject) => setTimeout(() => { reject(new Error('screencap timed out')) }, renderTimeout)),
        ])
        pool.release(page)
        return Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64')
    }
    catch (e) {
        await pool.replace(page)
        throw e
    }
}

const cache = new Map()
const inFlight = new Map()

function cacheKey(url) {
    const params = [...url.searchParams].sort(([a], [b]) => a < b ? -1 : 1)
    return `${url.pathname}?${new URLSearchParams(params).toString()}`
}

async function handle(pool, url) {
    const key = cacheKey(url)
    const cached = cache.get(key)
    if (cached !== undefined) {
        return { png: cached, source: 'cache' }
    }
    // Collapses a burst of requests for the same link into one render.
    let pending = inFlight.get(key)
    if (pending === undefined) {
        pending = render(pool, `${url.pathname}${url.search}`).finally(() => inFlight.delete(key))
        inFlight.set(key, pending)
    }
    const png = await pending
    cache.set(key, png)
    return { png, source: 'render' }
}

// Persistent so the disk cache -- bundle, data files, map tiles -- survives a restart of the service.
const context = await chromium.launchPersistentContext(cacheDir, { viewport, deviceScaleFactor: 1 })
const pool = new PagePool(context)

console.log(`warming ${poolSize} page(s) against ${origin}`)
const warmStart = Date.now()
await pool.fill(poolSize)
console.log(`warm in ${Date.now() - warmStart}ms`)

http.createServer((req, res) => {
    void (async () => {
        const url = new URL(req.url, 'http://render.invalid')
        const path = url.pathname.replace(/^\/render/, '')
        if (!entrypoints.has(path)) {
            res.writeHead(404).end(`no embed for ${path}\n`)
            return
        }
        const start = Date.now()
        try {
            const { png, source } = await handle(pool, new URL(`${path}${url.search}`, 'http://render.invalid'))
            console.log(`${source} ${Date.now() - start}ms ${path}${url.search}`)
            res.writeHead(200, {
                'content-type': captureOptions.type,
                'content-length': png.length,
                'cache-control': 'public, max-age=86400',
            }).end(png)
        }
        catch (e) {
            console.error(`failed ${Date.now() - start}ms ${path}${url.search}`, e)
            res.writeHead(500).end(`${e}\n`)
        }
    })()
}).listen(port, () => { console.log(`listening on :${port}`) })
