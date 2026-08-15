import { chromium } from 'playwright'

const origin = process.env.URBANSTATS_ORIGIN ?? 'http://localhost:8000'
const url = name => `${origin}/article.html?longname=${encodeURIComponent(name)}`

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1400, height: 1600 }, deviceScaleFactor: 1 })
const page = await context.newPage()

await page.goto(url('Chicago city, Illinois, USA'), { waitUntil: 'load' })
await page.waitForFunction(() => window.testUtils?.screencap !== undefined && window.testUtils.navigate !== undefined, undefined, { timeout: 30000 })
await page.evaluate(() => window.testUtils.screencap({ scale: 0.5 }))

// Navigate first, so the profile covers the capture rather than the page load.
await page.evaluate((target) => {
    window.testUtils.screencap = undefined
    return window.testUtils.navigate(target)
}, url('Seattle city, Washington, USA'))
await page.waitForFunction(() => window.testUtils.screencap !== undefined, undefined, { timeout: 30000 })

const cdp = await context.newCDPSession(page)
await cdp.send('Profiler.enable')
await cdp.send('Profiler.setSamplingInterval', { interval: 200 })
await cdp.send('Profiler.start')

const start = Date.now()
await page.evaluate(() => window.testUtils.screencap({ scale: 0.5 }))
const wall = Date.now() - start

const { profile } = await cdp.send('Profiler.stop')

// Self time per node, from the sample stream.
const selfTime = new Map()
for (let i = 0; i < profile.samples.length; i++) {
    const id = profile.samples[i]
    selfTime.set(id, (selfTime.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0))
}

const byFunction = new Map()
for (const node of profile.nodes) {
    const micros = selfTime.get(node.id) ?? 0
    if (micros === 0) {
        continue
    }
    const { functionName, url: src, lineNumber } = node.callFrame
    const where = src ? `${src.split('/').pop()}:${lineNumber}` : '(native)'
    const key = `${functionName || '(anonymous)'}  ${where}`
    byFunction.set(key, (byFunction.get(key) ?? 0) + micros)
}

const total = [...byFunction.values()].reduce((a, b) => a + b, 0)
console.log(`capture wall ${wall}ms, sampled ${Math.round(total / 1000)}ms of JS\n`)
console.log('top self-time:')
for (const [key, micros] of [...byFunction.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18)) {
    console.log(`  ${String(Math.round(micros / 1000)).padStart(5)}ms  ${(100 * micros / total).toFixed(1).padStart(5)}%  ${key}`)
}

await browser.close()
