import { chromium } from 'playwright'

const origin = 'http://localhost:8000'
const articles = [
    'Chicago city, Illinois, USA',
    'Houston city, Texas, USA',
    'Seattle city, Washington, USA',
    'Boston city, Massachusetts, USA',
    'Portland city, Oregon, USA',
    'Denver city, Colorado, USA',
]

const url = name => `${origin}/article.html?longname=${encodeURIComponent(name)}`

const ready = page => page.waitForFunction(() => window.testUtils?.screencap !== undefined, undefined, { timeout: 30000 })

async function timed(label, fn) {
    const t = Date.now()
    const value = await fn()
    return { label, ms: Date.now() - t, value }
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 1 })

// Count external (tile) requests so we can see how much is not ours to cache.
let externalRequests = 0
await context.route('**', (route) => {
    if (!route.request().url().startsWith(origin)) {
        externalRequests++
    }
    void route.continue()
})

const page = await context.newPage()

console.log('=== full navigation (page.goto) ===')
for (const name of articles) {
    externalRequests = 0
    const goto = await timed('goto', () => page.goto(url(name), { waitUntil: 'load' }))
    const rdy = await timed('ready', () => ready(page))
    const cap = await timed('capture', () => page.evaluate(() => window.testUtils.screencap()))
    console.log(`  ${name.split(',')[0].padEnd(16)} goto ${String(goto.ms).padStart(5)}ms  ready ${String(rdy.ms).padStart(5)}ms  capture ${String(cap.ms).padStart(5)}ms  total ${goto.ms + rdy.ms + cap.ms}ms  (${externalRequests} external reqs)`)
}

console.log('=== spa navigation (hashchange) ===')
await page.goto(url(articles[0]), { waitUntil: 'load' })
await ready(page)
for (const name of articles.slice(1)) {
    externalRequests = 0
    const nav = await timed('nav', async () => {
        await page.evaluate((target) => {
            history.replaceState(null, '', target)
            window.dispatchEvent(new HashChangeEvent('hashchange'))
        }, url(name))
        // The capture reads whatever is mounted, so wait for the new article to actually be on screen.
        await page.waitForFunction(
            expected => document.body.innerText.includes(expected),
            name.split(',')[0],
            { timeout: 30000 },
        )
        await page.waitForFunction(() => window.testUtils.waitForLoading('probe').then(() => true), undefined, { timeout: 30000 })
    })
    const cap = await timed('capture', () => page.evaluate(() => window.testUtils.screencap()))
    console.log(`  ${name.split(',')[0].padEnd(16)} nav ${String(nav.ms).padStart(5)}ms  capture ${String(cap.ms).padStart(5)}ms  total ${nav.ms + cap.ms}ms  (${externalRequests} external reqs)`)
}

await browser.close()
