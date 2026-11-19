import { measuredPort, ogRenderCost, ogWorkerBundleCost, runOgWorkerForTest } from './og_worker_test_utils'
import { urbanstatsFixture } from './test_utils'

const article = '/article.html?longname=San Marino city, California, USA'
// Two regions close enough to share a map, which is what makes this the expensive comparison.
const comparison = '/comparison.html?longnames=["San Marino city, California, USA","Pasadena city, California, USA"]'
const table = 'customNode(""); condition (population > 100000); table(columns=[column(values=density_pw_1km), column(values=population), column(values=area, name="Area")])'
const statistic = `/statistic.html?uss=${encodeURIComponent(table)}&article_type=City&start=1&amount=20&order=descending&universe=USA`
// The map the mapper opens on: the USA's states, over its five insets.
const map = '/mapper.html'

/*
 * Render costs are invisible on the page, so they fail a test here rather than show up on a bill. Bounds
 * are loose since CI and laptops disagree; the logs show smaller drift. Its own Worker keeps others out.
 */
urbanstatsFixture('embed worker resources', '/index.html', async () => {
    await runOgWorkerForTest(measuredPort)
})

/** The two numbers Cloudflare checks before the Worker is allowed to run at all. */
test('embed-worker-startup-cost', async (t) => {
    const { gzipKiB, startupCpuMs } = await ogWorkerBundleCost()
    console.warn(`Embed Worker bundle: ${gzipKiB} KiB gzip, ${startupCpuMs} ms startup CPU`)
    // Currently ~1760. Dropping the panel stubs would add ~900. Cloudflare's ceiling is 3 MiB on free.
    await t.expect(gzipKiB).lt(2_000)
    // Cloudflare allows 1000, but this sits just above CI's 25-42, since every cold start pays it.
    await t.expect(startupCpuMs).lt(100)
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
    // Currently 25, out of the 50 a free-plan request is allowed.
    await t.expect(subrequests).lt(35)
    // Currently ~13 MB, against an article's 0.7: shapes and tiles for the whole country.
    await t.expect(originBytes).lt(20_000_000)
})

// Both regions' shapes on one map, which is the comparison layout that draws a map at all.
test('embed-worker-comparison-render-cost', async (t) => {
    const { cpuMs, subrequests, originBytes } = await ogRenderCost(comparison)
    console.warn(`Embed Worker comparison render: ${cpuMs} ms CPU, ${subrequests} subrequests, ${originBytes} bytes from the site`)
    // Currently ~380: an article's, plus a second shape and the tiles the two of them span.
    await t.expect(cpuMs).lt(1_500)
    // Currently 14, out of the 50 a free-plan request is allowed.
    await t.expect(subrequests).lt(25)
    // Currently ~0.8 MB, which two regions' shapes and their tiles come to.
    await t.expect(originBytes).lt(2_000_000)
})

test('embed-worker-statistic-render-cost', async (t) => {
    const { cpuMs, subrequests, originBytes } = await ogRenderCost(statistic)
    console.warn(`Embed Worker statistic render: ${cpuMs} ms CPU, ${subrequests} subrequests, ${originBytes} bytes from the site`)
    // Currently ~400, most of it the interpreter's rather than the card's.
    await t.expect(cpuMs).lt(2_000)
    // Currently 16, out of the 50 a free-plan request is allowed.
    await t.expect(subrequests).lt(30)
    // Currently ~2 MB: every city's value for each of the columns, to rank 20 of them.
    await t.expect(originBytes).lt(5_000_000)
})
