import { chromium } from 'playwright'

const origin = 'http://localhost:8000'
const articles = [
    'Houston city, Texas, USA',
    'Seattle city, Washington, USA',
    'Boston city, Massachusetts, USA',
]

const url = name => `${origin}/article.html?longname=${encodeURIComponent(name)}`

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 1 })
const page = await context.newPage()
await page.goto(url('Chicago city, Illinois, USA'), { waitUntil: 'load' })
await page.waitForFunction(() => window.testUtils?.screencap !== undefined && window.testUtils.navigate !== undefined, undefined, { timeout: 30000 })
await page.evaluate(() => window.testUtils.screencap())

for (const { scale, type } of [
    { scale: 1, type: 'image/png' },
    { scale: 0.5, type: 'image/png' },
    { scale: 0.25, type: 'image/png' },
    { scale: 0.5, type: 'image/jpeg' },
    { scale: 0.5, type: 'image/webp' },
]) {
    const results = []
    for (const name of articles) {
        await page.evaluate((target) => {
            window.testUtils.screencap = undefined
            return window.testUtils.navigate(target)
        }, url(name))
        await page.waitForFunction(() => window.testUtils.screencap !== undefined, undefined, { timeout: 30000 })
        const start = Date.now()
        const dataUrl = await page.evaluate(
            options => window.testUtils.screencap(options),
            { scale, type },
        )
        const ms = Date.now() - start
        const bytes = Math.floor((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4)
        const dims = await page.evaluate(async (src) => {
            const img = new Image()
            img.src = src
            await img.decode()
            return `${img.width}x${img.height}`
        }, dataUrl)
        results.push({ ms, bytes, dims })
    }
    const mean = key => Math.round(results.reduce((a, r) => a + r[key], 0) / results.length)
    console.log(`scale ${String(scale).padEnd(5)} ${type.padEnd(11)} capture ${String(mean('ms')).padStart(5)}ms  ${String(Math.round(mean('bytes') / 1024)).padStart(5)}KB  ${results[0].dims}`)
}

await browser.close()
