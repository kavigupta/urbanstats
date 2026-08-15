import { chromium } from 'playwright'

const origin = process.env.URBANSTATS_ORIGIN ?? 'http://localhost:8000'
const url = name => `${origin}/article.html?longname=${encodeURIComponent(name)}`
const articles = ['Seattle city, Washington, USA', 'Boston city, Massachusetts, USA', 'Denver city, Colorado, USA']

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 1 })
const page = await context.newPage()

await page.exposeFunction('__ogCaptureElements', async boxes => Promise.all(
    boxes.map(async box => `data:image/png;base64,${(await page.screenshot({ clip: box, type: 'png' })).toString('base64')}`),
))

const setNative = on => page.evaluate((enabled) => {
    window.testUtils.captureElements = enabled ? boxes => window.__ogCaptureElements(boxes) : undefined
}, on)

const capture = async () => {
    const start = Date.now()
    await page.evaluate(() => window.testUtils.screencap({ scale: 0.5 }))
    return Date.now() - start
}

await page.goto(url('Chicago city, Illinois, USA'), { waitUntil: 'load' })
await page.waitForFunction(() => window.testUtils?.screencap !== undefined && window.testUtils.navigate !== undefined, undefined, { timeout: 30000 })

console.log('capture only, on a settled page. first run per article is discarded (it absorbs the tile wait).\n')
for (const name of articles) {
    await page.evaluate((target) => {
        window.testUtils.screencap = undefined
        return window.testUtils.navigate(target)
    }, url(name))
    await page.waitForFunction(() => window.testUtils.screencap !== undefined, undefined, { timeout: 30000 })

    await setNative(false)
    const settle = await capture()

    // Alternate, so neither path gets a systematically warmer page than the other.
    await setNative(false)
    const dom1 = await capture()
    await setNative(true)
    const nat1 = await capture()
    await setNative(false)
    const dom2 = await capture()
    await setNative(true)
    const nat2 = await capture()

    console.log(`  ${name.split(',')[0].padEnd(14)} settle ${String(settle).padStart(5)}ms   dom-to-image ${String(dom1).padStart(4)}/${String(dom2).padStart(4)}ms   native ${String(nat1).padStart(4)}/${String(nat2).padStart(4)}ms`)
}

await browser.close()
