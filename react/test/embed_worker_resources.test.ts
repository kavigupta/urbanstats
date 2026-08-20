import { measuredPort, ogRenderCost, ogWorkerBundleCost, runOgWorkerForTest } from './og_worker_test_utils'
import { urbanstatsFixture } from './test_utils'

const article = '/article.html?longname=San Marino city, California, USA'
// The map the mapper opens on: the USA's states, over its five insets.
const map = '/mapper.html'

/*
 * Drawing a PNG per request costs more than a Worker usually does, and none of it is visible in the
 * page it produces, so it is worth failing a test over rather than finding on a bill. CI and a
 * laptop disagree on the CPU numbers, so the bounds sit well above today's values and catch a
 * change in kind; the logged measurements are where a smaller drift would show up.
 *
 * Its own file, and its own Worker, so that nothing else's requests land in the numbers.
 */
urbanstatsFixture('embed worker resources', '/index.html', async () => {
    await runOgWorkerForTest(measuredPort)
})

/** The two numbers Cloudflare checks before the Worker is allowed to run at all. */
test('embed-worker-startup-cost', async (t) => {
    const { gzipKiB, startupCpuMs } = await ogWorkerBundleCost()
    console.warn(`Embed Worker bundle: ${gzipKiB} KiB gzip, ${startupCpuMs} ms startup CPU`)
    // Currently ~1320. Dropping the panel stubs from wrangler.toml would take it to ~2200, which is
    // what this is watching for; the plan's own ceiling is 3 MiB gzip on free, 10 on paid.
    await t.expect(gzipKiB).lt(2_000)
    // Currently ~325 against a hard 1000 ms limit, paid on every cold start.
    await t.expect(startupCpuMs).lt(400)
})

test('embed-worker-article-render-cost', async (t) => {
    const { cpuMs, subrequests, originBytes } = await ogRenderCost(article)
    console.warn(`Embed Worker article render: ${cpuMs} ms CPU, ${subrequests} subrequests, ${originBytes} bytes from the site`)
    // Currently ~230, and the whole of what a render is billed for once the response is cached.
    await t.expect(cpuMs).lt(1_000)
    // Currently 8, out of the 50 a free-plan request is allowed.
    await t.expect(subrequests).lt(20)
    await t.expect(originBytes).lt(800_000)
})

// A map card draws a whole geography rather than one shape, so it is the expensive end of a render.
test('embed-worker-map-render-cost', async (t) => {
    const { cpuMs, subrequests, originBytes } = await ogRenderCost(map)
    console.warn(`Embed Worker map render: ${cpuMs} ms CPU, ${subrequests} subrequests, ${originBytes} bytes from the site`)
    // Currently ~620, closer to three times an article's.
    await t.expect(cpuMs).lt(2_000)
    // Currently 19, out of the 50 a free-plan request is allowed.
    await t.expect(subrequests).lt(35)
    // Currently ~12 MB, against an article's 0.7: shapes and tiles for the whole country.
    await t.expect(originBytes).lt(20_000_000)
})
