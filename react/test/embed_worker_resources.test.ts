import { ogRenderCost, ogWorkerBundleCost, runMeasuredOgWorkerForTest } from './og_worker_test_utils'
import { urbanstatsFixture } from './test_utils'

const article = '/article.html?longname=San Marino city, California, USA'

// Its own file, and its own Worker on a port of its own, because measuring a render deadlocks
// workerd's inspector and leaves that Worker unusable afterwards.
urbanstatsFixture('embed worker resources', '/index.html', async () => {
    await runMeasuredOgWorkerForTest()
})

/*
 * Drawing a PNG per request costs more than a Worker usually does, and none of it is visible in the
 * page it produces, so it is worth failing a test over rather than finding on a bill. CI and a
 * laptop disagree on the CPU numbers, so the bounds sit well above today's values and catch a
 * change in kind; the logged measurements are where a smaller drift would show up.
 */
test('embed-worker-resources', async (t) => {
    const { gzipKiB, startupCpuMs } = await ogWorkerBundleCost()
    console.warn(`Embed Worker bundle: ${gzipKiB} KiB gzip, ${startupCpuMs} ms startup CPU`)
    // Currently ~1320. Dropping the panel stubs from wrangler.toml would take it to ~2200, which is
    // what this is watching for; the plan's own ceiling is 3 MiB gzip on free, 10 on paid.
    await t.expect(gzipKiB).lt(2_000)
    // Currently ~45, against a hard 400 ms limit, paid on every cold start.
    await t.expect(startupCpuMs).lt(300)

    const { cpuMs, subrequests, originBytes } = await ogRenderCost(article)
    console.warn(`Embed Worker render: ${cpuMs} ms CPU, ${subrequests} subrequests, ${originBytes} bytes from the site`)
    // Currently ~230, and the whole of what a render is billed for once the response is cached.
    await t.expect(cpuMs).lt(1_000)
    // Currently 8, out of the 50 a free-plan request is allowed.
    await t.expect(subrequests).lt(20)
    await t.expect(originBytes).lt(800_000)
})
