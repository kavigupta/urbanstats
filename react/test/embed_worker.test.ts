import { ClientFunction, Selector } from 'testcafe'

import { ogPort, runOgWorkerForTest } from './og_worker_test_utils'
import { safeReload, screencap, urbanstatsFixture } from './test_utils'

const article = '/article.html?longname=San Marino city, California, USA'
const comparison = '/comparison.html?longnames=["San Marino city, California, USA","Chicago city, Illinois, USA"]'
const statistic = '/statistic.html?statname=Population&article_type=City&start=1&amount=20&order=descending&universe=USA'
// A link that carries several statistic categories, which the article shows more of than fit.
const manyStats = `${article}&s=29ZqGgHgeNSXMA9`
const workerOrigin = `http://localhost:${ogPort}`

function previewPage(target: string): string {
    return `/embed-preview.html?target=${encodeURIComponent(target)}&ogPort=${ogPort}`
}

// The card is a PNG a crawler fetches, and the dev panel is the one place a browser shows it.
urbanstatsFixture('embed worker', previewPage(article), async (t) => {
    await runOgWorkerForTest()
    // The panel gave up on the Worker when the page first loaded, before we had started it.
    await safeReload(t)
})

const card = Selector('[data-test-id=embed-card]')

const cardImageLoaded = ClientFunction(() => {
    const image = document.querySelector('[data-test-id=embed-card] img')
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0
})

test('embed-worker-article-card', async (t) => {
    // The Worker renders on demand, and the first render is the one that pulls in the drawing half.
    await t.expect(cardImageLoaded()).ok({ timeout: 60_000 })
    // Just the card: a whole-page shot would include the article in the frame, map and all.
    // fullPage only skips screencap's hover reset here, which fails on a zero-height body.
    await screencap(t, { fullPage: false, selector: card })
})

test('embed-worker-card-cut-off', async (t) => {
    await t.navigateTo(previewPage(manyStats))
    // The rows the card is drawn from are the frame's own, so this is the premise of the shot below.
    await t.switchToIframe(Selector('iframe'))
    await t.expect(Selector('[data-test-id=statistic-link]').count).gt(6)
    await t.switchToMainWindow()
    await t.expect(cardImageLoaded()).ok({ timeout: 60_000 })
    await screencap(t, { fullPage: false, selector: card })
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
