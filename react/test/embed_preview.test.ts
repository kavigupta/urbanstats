import { ClientFunction, Selector } from 'testcafe'

import { ogPort, runOgWorkerForTest } from './og_worker_test_utils'
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
