import { chromium } from 'playwright'

const origin = process.env.URBANSTATS_ORIGIN ?? 'http://localhost:8000'
const url = name => `${origin}/article.html?longname=${encodeURIComponent(name)}`
const articles = ['Seattle city, Washington, USA', 'Boston city, Massachusetts, USA', 'Denver city, Colorado, USA']

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 1 })
const page = await context.newPage()

await page.goto(url('Chicago city, Illinois, USA'), { waitUntil: 'load' })
await page.waitForFunction(() => window.testUtils?.screencap !== undefined && window.testUtils.navigate !== undefined, undefined, { timeout: 30000 })
await page.evaluate(() => window.testUtils.screencap({ scale: 0.5 }))

const goTo = async (name) => {
    await page.evaluate((target) => {
        window.testUtils.screencap = undefined
        return window.testUtils.navigate(target)
    }, url(name))
    await page.waitForFunction(() => window.testUtils.screencap !== undefined, undefined, { timeout: 30000 })
}

const time = async (fn) => {
    const start = Date.now()
    const bytes = await fn()
    return { ms: Date.now() - start, kb: Math.round(bytes / 1024) }
}

console.log('per article: dom-to-image (the app pipeline) vs native compositor screenshot\n')
for (const name of articles) {
    await goTo(name)
    const dom = await time(async () => {
        const dataUrl = await page.evaluate(() => window.testUtils.screencap({ scale: 0.5 }))
        return (dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4
    })
    // Same region the app composes, captured by the compositor instead.
    const box = await page.evaluate(() => {
        const main = document.querySelector('.main_panel') ?? document.body
        const { x, y, width, height } = main.getBoundingClientRect()
        return { x, y: y + window.scrollY, width, height }
    })
    const native = await time(async () => (await page.screenshot({ clip: box, type: 'png' })).length)
    const nativeFull = await time(async () => (await page.screenshot({ fullPage: true, type: 'png' })).length)
    console.log(`  ${name.split(',')[0].padEnd(14)} dom-to-image ${String(dom.ms).padStart(5)}ms ${String(dom.kb).padStart(4)}KB   native clip ${String(native.ms).padStart(5)}ms ${String(native.kb).padStart(4)}KB   native full ${String(nativeFull.ms).padStart(5)}ms ${String(nativeFull.kb).padStart(4)}KB`)
}

await browser.close()
