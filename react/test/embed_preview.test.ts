import { ClientFunction, Selector } from 'testcafe'

import { ogPort, ogRenderCost, ogWorkerBundleCost, runOgWorkerForTest } from './og_worker_test_utils'
import { safeReload, screencap, urbanstatsFixture } from './test_utils'

const article = '/article.html?longname=San Marino city, California, USA'

urbanstatsFixture('embed preview', `/embed-preview.html?target=${encodeURIComponent(article)}&ogPort=${ogPort}`, async (t) => {
    await runOgWorkerForTest()
    // The panel gave up on the Worker when the page first loaded, before we had started it.
    await safeReload(t)
})

const cardImageLoaded = ClientFunction(() => {
    const image = document.querySelector('[data-test-id=embed-card] img')
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
})

test('embed-preview-article-card', async (t) => {
    // The Worker renders the card on demand, and the first render also has to compile resvg's wasm.
    await t.expect(cardImageLoaded()).ok({ timeout: 120_000 })
    // Just the card: a full-page shot would include the article in the frame, map and all.
    // fullPage: false because the panel fills a zero-height body, which nothing can hover.
    await screencap(t, { fullPage: false, selector: Selector('[data-test-id=embed-card]') })
})

/*
 * Drawing a PNG per request is far more than a Worker usually does, and none of what it costs is
 * visible in the page it produces, so it is worth failing a test over rather than finding on a
 * bill. A CI container and a laptop disagree on the CPU numbers by more than is worth arguing
 * about, so the bounds sit well above today's values and catch a change in kind. Every measurement
 * is logged, which is where a smaller drift would show up.
 */
test('embed-worker-resources', async (t) => {
    const { gzipKiB, startupCpuMs } = await ogWorkerBundleCost()
    console.warn(`Embed Worker bundle: ${gzipKiB} KiB gzip, ${startupCpuMs} ms startup CPU`)
    // Currently ~1320. Dropping the panel stubs from wrangler.toml would take it to ~2200, which is
    // what this is really watching for; the plan's own ceiling is 3 MiB gzip on free, 10 on paid.
    await t.expect(gzipKiB).lt(2_000)
    // Currently ~45, against a hard 400 ms limit, and paid for on every cold start.
    await t.expect(startupCpuMs).lt(300)

    const { cpuMs, subrequests, originBytes } = await ogRenderCost(article)
    console.warn(`Embed Worker render: ${cpuMs} ms CPU, ${subrequests} subrequests, ${originBytes} bytes from the site`)
    // Currently ~230, and the whole of what a render is billed for once the response is cached.
    await t.expect(cpuMs).lt(1_000)
    // Currently 8, out of the 50 a free-plan request is allowed. Growth here means the card started
    // reading shards it does not need.
    await t.expect(subrequests).lt(20)
    await t.expect(originBytes).lt(600_000)
})
