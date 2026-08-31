import { gzipSync } from 'zlib'

import { Selector } from 'testcafe'

import { noTiles, ogPort, runOgWorkerForTest, runTileServerForTest, snapshotTiles } from './og_worker_test_utils'
import { saveImage, urbanstatsFixture } from './test_utils'

const article = '/article.html?longname=San Marino city, California, USA'
const comparison = '/comparison.html?longnames=["San Marino city, California, USA","Chicago city, Illinois, USA"]'
// Two regions close enough to share a map, which the two above are not.
const nearbyComparison = '/comparison.html?longnames=["San Marino city, California, USA","Pasadena city, California, USA"]'
// More regions than the table gives a column to, and more than it keeps the map for.
const manyRegions = '/comparison.html?longnames=["San Marino city, California, USA","Pasadena city, California, USA","Alhambra city, California, USA","Burbank city, California, USA","Glendale city, California, USA","Monterey Park city, California, USA"]'
const statistic = '/statistic.html?statname=Population&article_type=City&start=1&amount=20&order=descending&universe=USA'
// A table of several columns, whose own header row the single-column one above has no need of.
const multiColumnStatistic = `/statistic.html?uss=${encodeURIComponent('customNode(""); condition (true); table(columns=[column(values=density_pw_1km), column(values=population), column(values=area, name="Area")])')}&article_type=City&start=1&amount=20&order=descending&universe=USA`
// A table filtered by a condition, which the card states after the geographies it ranks.
const filteredStatistic = `/statistic.html?uss=${encodeURIComponent('customNode(""); condition (population > 100000); table(columns=[column(values=density_pw_1km), column(values=population), column(values=area, name="Area")])')}&article_type=City&start=1&amount=20&order=descending&universe=USA`
// The same as one column, whose title drops the condition its subtitle then states.
const filteredSingleColumnStatistic = `/statistic.html?uss=${encodeURIComponent('customNode(""); condition (population > 100000); table(columns=[column(values=density_pw_1km)])')}&article_type=City&start=1&amount=20&order=descending&universe=USA`
// A name too long for one line of the names column, which takes two rather than shrinking the
// whole column's text to fit it.
const longNamedStatistic = filteredStatistic.replaceAll('order=descending', 'order=ascending')
/*
 * A table sorted by a column past the few the card fits: the rows carry that column's rank, so it
 * takes the last of the card's slots rather than being cut off along with the columns after it.
 */
const lateSortedStatistic = `/statistic.html?uss=${encodeURIComponent('customNode(""); condition (true); table(columns=[column(values=density_pw_1km), column(values=population), column(values=area, name="Area"), column(values=elevation)])')}&article_type=City&start=1&amount=20&order=descending&universe=USA&sort_column=3`
// A link that carries several statistic categories, which the article shows more of than fit.
const manyStats = `${article}&s=29ZqGgHgeNSXMA9`
// Statistic categories one of whose names is too long for a line of the table.
const wrappingStats = 's=4p35PVcBRRMpKmQoVviY4dY'
// A name too long for one line of the title, which shrinks to fit rather than wrapping and
// pushing the table off the card.
const longNamedArticle = `/article.html?longname=Taipei-Taoyuan Metropolitan Cluster, China&${wrappingStats}`
// The same rows under a title with no shrinking left to do, where the wrapped one costs the table
// its last row rather than running off the card.
const droppedRow = `${article}&${wrappingStats}`
// A shape crossing the antimeridian, stored as 178.3E to 180.4E rather than wrapping to -179.7.
const antimeridian = '/article.html?longname=Northern, Fiji'
// The default map, which is over the USA's five insets. Guam's is narrower than one tile of the
// zoom it draws at, so the ocean under it arrives as a polygon with no corner inside the inset.
const insetMap = '/mapper.html'
const workerOrigin = `http://localhost:${ogPort}`

function usaMap(geographyKind: string, uss: string): string {
    return `/mapper.html?settings=${encodeURIComponent(gzipSync(JSON.stringify({
        geographyKind,
        universe: 'USA',
        script: { uss },
    })).toString('base64'))}`
}

/** A script stating its own label, rather than the default map, whose label has to be derived. */
const labelledMap = usaMap('County', 'cMap(data=density_pw_1km, label="How dense is it")')
// A circle per geography rather than a filled shape, sized by population so the radii differ.
const pointMap = usaMap('Urban Center', 'pMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, relativeArea=population)')
/*
 * Those circles merged by proximity, which the card reruns supercluster to reproduce. Counties,
 * because a geography sparse enough to leave every marker alone would exercise none of that.
 */
const clusterMap = usaMap('County', 'clusterMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)')

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

test('embed-worker-long-named-article-card', async (t) => {
    await snapshotCard(t, longNamedArticle)
})

test('embed-worker-dropped-row-card', async (t) => {
    await snapshotCard(t, droppedRow)
})

// Unwrapped longitudes are what keep the fit tight here: rewrapping them into [-180, 180] would
// spread the ring across the whole world and collapse the shape to nothing.
test('embed-worker-antimeridian-card', async (t) => {
    await snapshotCard(t, antimeridian)
})

// The regions' shapes on one map, each in the colour the comparison table gives its column.
test('embed-worker-comparison-card', async (t) => {
    await snapshotCard(t, nearbyComparison)
})

/*
 * The same card with the map gone: regions this far apart fail the fill the comparison page
 * partitions on, so a map fitted around them would show neither of them.
 */
test('embed-worker-far-apart-comparison-card', async (t) => {
    await snapshotCard(t, comparison)
})

// Satori measures no text, so the columns and the rows that fit are worked out by hand.
test('embed-worker-many-region-comparison-card', async (t) => {
    await snapshotCard(t, manyRegions)
})

// The rows the page's first screenful holds, run through the interpreter the way the page runs it.
test('embed-worker-statistic-card', async (t) => {
    await snapshotCard(t, statistic)
})

test('embed-worker-multi-column-statistic-card', async (t) => {
    await snapshotCard(t, multiColumnStatistic)
})

test('embed-worker-filtered-statistic-card', async (t) => {
    await snapshotCard(t, filteredStatistic)
})

test('embed-worker-filtered-single-column-statistic-card', async (t) => {
    await snapshotCard(t, filteredSingleColumnStatistic)
})

test('embed-worker-long-named-statistic-card', async (t) => {
    await snapshotCard(t, longNamedStatistic)
})

test('embed-worker-late-sorted-statistic-card', async (t) => {
    await snapshotCard(t, lateSortedStatistic)
})

test('embed-worker-inset-map-card', async (t) => {
    await snapshotCard(t, insetMap)
})

test('embed-worker-point-map-card', async (t) => {
    await snapshotCard(t, pointMap)
})

// The card's clustering is maplibre's configuration rewritten by hand, so this is what notices it
// drifting from what the page groups.
test('embed-worker-cluster-map-card', async (t) => {
    await snapshotCard(t, clusterMap)
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
        ogImage: `${workerOrigin}/og/comparison.html?longnames=[%22San%20Marino%20city,%20California,%20USA%22,%22Chicago%20city,%20Illinois,%20USA%22]`,
    })
    await t.expect(await crawlerTags(statistic)).eql({
        title: 'Population',
        ogTitle: 'Population',
        ogDescription: 'Population rankings on Urban Stats.',
        ogImage: `${workerOrigin}/og${statistic}`,
    })
    // A table naming no statistic, titled from its script rather than 'Urban Stats: Custom Table'.
    await t.expect(await crawlerTags(multiColumnStatistic)).eql({
        title: 'PW Density (r=1km), Population, Area',
        ogTitle: 'PW Density (r=1km), Population, Area',
        ogDescription: 'PW Density (r=1km), Population, Area rankings on Urban Stats.',
        ogImage: `${workerOrigin}/og${multiColumnStatistic}`,
    })
    /*
     * Both halves of a map's label, read off the script rather than out of a run of it: the default
     * map states none, so its label is derived from the statistic it maps.
     */
    await t.expect(await crawlerTags('/mapper.html')).eql({
        title: 'PW Density (r=1km)',
        ogTitle: 'PW Density (r=1km)',
        // 'States', not 'Subnational Regions': the geography's name is the universe's own.
        ogDescription: 'PW Density (r=1km) mapped over States in USA, on Urban Stats.',
        ogImage: `${workerOrigin}/og/mapper.html`,
    })
    await t.expect(await crawlerTags(labelledMap)).eql({
        title: 'How dense is it',
        ogTitle: 'How dense is it',
        ogDescription: 'How dense is it mapped over Counties in USA, on Urban Stats.',
        ogImage: `${workerOrigin}/og${labelledMap}`,
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

    // A page kind with tags of its own and nothing for the Worker to draw.
    const notDrawn = await fetch(new URL('/og/quiz.html', workerOrigin))
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
