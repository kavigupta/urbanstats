import { chromium } from 'playwright'

const origin = process.env.URBANSTATS_ORIGIN ?? 'http://localhost:8000'
const url = name => `${origin}/article.html?longname=${encodeURIComponent(name)}`

// Alternating, so neither condition gets a systematically warmer cache than the other.
const articles = [
    'Seattle city, Washington, USA',
    'Boston city, Massachusetts, USA',
    'Denver city, Colorado, USA',
    'Portland city, Oregon, USA',
    'Miami city, Florida, USA',
    'Atlanta city, Georgia, USA',
]

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 1 })
const page = await context.newPage()

await page.goto(url('Chicago city, Illinois, USA'), { waitUntil: 'load' })
await page.waitForFunction(() => window.testUtils?.screencap !== undefined && window.testUtils.navigate !== undefined, undefined, { timeout: 30000 })
await page.evaluate(() => window.testUtils.screencap({ scale: 0.5 }))

const results = { on: [], off: [] }

for (const [index, name] of articles.entries()) {
    const basemap = index % 2 === 0 ? 'on' : 'off'

    await page.evaluate((target) => {
        window.testUtils.screencap = undefined
        return window.testUtils.navigate(target)
    }, url(name))
    await page.waitForFunction(() => window.testUtils.screencap !== undefined, undefined, { timeout: 30000 })

    if (basemap === 'off') {
        await page.evaluate(() => { window.testUtils.disableBasemapLayers() })
    }

    const start = Date.now()
    await page.evaluate(() => window.testUtils.screencap({ scale: 0.5 }))
    const ms = Date.now() - start

    results[basemap].push(ms)
    console.log(`  ${name.split(',')[0].padEnd(14)} basemap ${basemap.padEnd(3)}  first capture ${String(ms).padStart(5)}ms`)
}

const mean = xs => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
console.log(`\n  basemap on:  ${mean(results.on)}ms mean`)
console.log(`  basemap off: ${mean(results.off)}ms mean`)

await browser.close()
