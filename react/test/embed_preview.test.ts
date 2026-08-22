import { Selector } from 'testcafe'

import { ogPort, runOgWorkerForTest } from './og_worker_test_utils'
import { safeReload, urbanstatsFixture } from './test_utils'

const article = '/article.html?longname=San Marino city, California, USA'
const otherArticle = '/article.html?longname=Chicago city, Illinois, USA'
const workerOrigin = `http://localhost:${ogPort}`

function previewPage(target: string, port: number = ogPort): string {
    return `/embed-preview.html?target=${encodeURIComponent(target)}&ogPort=${port}`
}

urbanstatsFixture('embed preview', previewPage(article), async (t) => {
    await runOgWorkerForTest()
    // The panel gave up on the Worker when the page first loaded, before we had started it.
    await safeReload(t)
})

const card = Selector('[data-test-id=embed-card]', { timeout: 10000 })
const pathInput = Selector('[data-test-id=embed-target]')

test('embed-preview-card', async (t) => {
    await t.expect(card.innerText).contains('San Marino city', { timeout: 30_000 })
    await t.expect(card.innerText).contains('Statistics for San Marino city, California, USA on Urban Stats.')
    const image = card.find('img').getAttribute('src')
    await t.expect(image).contains(`${workerOrigin}/og/article.html`)
    // Without the buster, the card sits behind its day of cache-control while its URL stays put.
    await t.expect(image).contains('__preview=')
})

test('embed-preview-commit-target', async (t) => {
    await t.expect(card.innerText).contains('San Marino city', { timeout: 30_000 })
    await t.typeText(pathInput, otherArticle, { replace: true }).pressKey('enter')
    await t.expect(card.innerText).contains('Chicago city', { timeout: 30_000 })
})

test('embed-preview-follows-frame', async (t) => {
    await t.switchToIframe(Selector('iframe'))
    await t.click(Selector('a[data-test-id=statistic-link]').withExactText('Population'))
    await t.switchToMainWindow()
    // The frame navigates with pushState, which fires no load event: the panel polls for this.
    await t.expect(pathInput.value).contains('/statistic.html', { timeout: 30_000 })
    await t.expect(card.innerText).contains('Population', { timeout: 30_000 })
    // The Worker draws no card for this page kind, so the site's static preview stands.
    await t.expect(card.find('img').getAttribute('src')).contains('/link-preview.png')
    // The panel puts what it is showing in its own URL, so a reload does not go back to the start.
    await safeReload(t)
    await t.expect(pathInput.value).contains('/statistic.html', { timeout: 30_000 })
})

test('embed-preview-juxtastat', async (t) => {
    await t.navigateTo(previewPage('/quiz.html'))
    await t.expect(card.innerText).contains('Juxtastat', { timeout: 30_000 })
    await t.expect(card.innerText).contains('New quiz every day')
    await t.expect(card.find('img').getAttribute('src')).contains('juxtastat-link-preview.png')
})

// Nothing is listening here, which is the state the panel is in until the Worker is started.
const deadPort = ogPort + 1000

urbanstatsFixture('embed preview without a worker', previewPage(article, deadPort))

test('embed-preview-worker-down', async (t) => {
    await t.expect(Selector('div').withText(/The embed Worker is not answering/).exists).ok({ timeout: 30_000 })
    await t.expect(Selector('code').withText(/npm run og-preview/).exists).ok()
    await t.expect(Selector('button').withExactText('Retry').exists).ok()
})
