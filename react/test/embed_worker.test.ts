import { Selector } from 'testcafe'

import { noTiles, ogPort, runOgWorkerForTest, runTileServerForTest, snapshotTiles } from './og_worker_test_utils'
import { saveImage, urbanstatsFixture } from './test_utils'

const article = '/article.html?longname=San Marino city, California, USA'
const comparison = '/comparison.html?longnames=["San Marino city, California, USA","Chicago city, Illinois, USA"]'
const statistic = '/statistic.html?statname=Population&article_type=City&start=1&amount=20&order=descending&universe=USA'
// A link that carries several statistic categories, which the article shows more of than fit.
const manyStats = `${article}&s=29ZqGgHgeNSXMA9`
// A shape crossing the antimeridian, stored as 178.3E to 180.4E rather than wrapping to -179.7.
const antimeridian = '/article.html?longname=Northern, Fiji'
const workerOrigin = `http://localhost:${ogPort}`

// Nothing here goes through the dev panel, which is embed_preview's; the browser is barely used.
urbanstatsFixture('embed worker', '/index.html', async () => {
    await runTileServerForTest()
    await runOgWorkerForTest()
})

/**
 * The card itself, rather than a browser's picture of one: a shot taken through the preview panel
 * would be drawn from whatever URL the panel had followed the frame to by then.
 */
async function cardPng(target: string, tiles?: string): Promise<Buffer> {
    const url = new URL(`/og${target}`, workerOrigin)
    if (tiles !== undefined) {
        url.searchParams.set('__tiles', tiles)
    }
    // The card's day of cache-control outlives the site build it was drawn from.
    url.searchParams.set('__preview', Date.now().toString())
    const response = await fetch(url)
    return Buffer.from(await response.arrayBuffer())
}

/**
 * Screenshots elsewhere drop the map, which is maplibre's to get right. This one is basemap.ts's,
 * so the shots keep it, drawn from tiles openfreemap's next planet build cannot move.
 */
async function snapshotCard(t: TestController, target: string): Promise<void> {
    saveImage(t, await cardPng(target, snapshotTiles))
}

test('embed-worker-article-card', async (t) => {
    await snapshotCard(t, article)
})

test('embed-worker-card-cut-off', async (t) => {
    // The rows the card is drawn from are the article's own, so this is the premise of the shot.
    await t.navigateTo(manyStats)
    await t.expect(Selector('[data-test-id=statistic-link]').count).gt(6)
    await snapshotCard(t, manyStats)
})

// Unwrapped longitudes are what keep the fit tight here: rewrapping them into [-180, 180] would
// spread the ring across the whole world and collapse the shape to nothing.
test('embed-worker-antimeridian-card', async (t) => {
    await snapshotCard(t, antimeridian)
})

/** The shots above are drawn from a snapshot, so this is what notices openfreemap moving. */
test('embed-worker-live-tiles', async (t) => {
    const live = await cardPng(article)
    // What a render that threw falls back to, which is what unreachable tiles would produce.
    const staticPreview = await fetch(new URL('/link-preview.png', workerOrigin))
    await t.expect(live.equals(Buffer.from(await staticPreview.arrayBuffer()))).notOk()
    // Same card with no tiles to draw from, so what differs is the basemap.
    await t.expect(live.equals(await cardPng(article, noTiles))).notOk()
})

interface CrawlerTags {
    title?: string
    ogTitle?: string
    ogDescription?: string
    ogImage?: string
}

/** What a crawler reads off a page, once the Worker has rewritten it. */
async function crawlerTags(path: string): Promise<CrawlerTags> {
    const html = await (await fetch(new URL(path, workerOrigin))).text()
    const meta = (property: string): string | undefined =>
        new RegExp(`<meta property="${property}" content="([^"]*)"`).exec(html)?.[1]
    return {
        title: /<title>([^<]*)<\/title>/.exec(html)?.[1],
        ogTitle: meta('og:title'),
        ogDescription: meta('og:description'),
        ogImage: meta('og:image'),
    }
}

test('embed-worker-crawler-tags', async (t) => {
    await t.expect(await crawlerTags(article)).eql({
        title: 'San Marino city',
        ogTitle: 'San Marino city',
        ogDescription: 'Statistics for San Marino city, California, USA on Urban Stats.',
        ogImage: `${workerOrigin}/og/article.html?longname=San%20Marino%20city,%20California,%20USA`,
    })
    await t.expect(await crawlerTags(comparison)).eql({
        title: 'San Marino city vs Chicago city',
        ogTitle: 'San Marino city vs Chicago city',
        ogDescription: 'Comparing San Marino city, California, USA, Chicago city, Illinois, USA on Urban Stats.',
        // Described but not drawn, so the site's static preview stands.
        ogImage: '/link-preview.png',
    })
    await t.expect(await crawlerTags(statistic)).eql({
        title: 'Population',
        ogTitle: 'Population',
        ogDescription: 'Population rankings on Urban Stats.',
        ogImage: '/link-preview.png',
    })
    // The quiz has embed tags of its own, which the Worker has nothing to add to.
    await t.expect(await crawlerTags('/quiz.html')).eql({
        title: 'Juxtastat',
        ogTitle: 'Juxtastat',
        ogDescription: undefined,
        ogImage: 'https://urbanstats.org/juxtastat-link-preview.png',
    })
    // A page kind the Worker has nothing to say about passes through untouched.
    await t.expect(await crawlerTags('/index.html')).eql({
        title: 'Urban Stats',
        ogTitle: 'Urban Stats',
        ogDescription: undefined,
        ogImage: '/link-preview.png',
    })
})

test('embed-worker-image-endpoint', async (t) => {
    const png = await fetch(new URL(`/og${article}`, workerOrigin))
    await t.expect(png.status).eql(200)
    await t.expect(png.headers.get('content-type')).eql('image/png')
    await t.expect(png.headers.get('cache-control')).eql('public, max-age=86400')

    const notDrawn = await fetch(new URL(`/og${comparison}`, workerOrigin))
    await t.expect(notDrawn.status).eql(404)

    const notAPage = await fetch(new URL('/og/nonsense.html', workerOrigin))
    await t.expect(notAPage.status).eql(400)

    // An article whose data will not load stands in for any failed render.
    const failed = await fetch(new URL('/og/article.html?longname=Nowhere city, Nowhere, USA', workerOrigin))
    await t.expect(failed.status).eql(200)
    await t.expect(failed.headers.get('content-type')).eql('image/png')
    const staticPreview = await fetch(new URL('/link-preview.png', workerOrigin))
    await t.expect((await failed.arrayBuffer()).byteLength).eql((await staticPreview.arrayBuffer()).byteLength)
})
