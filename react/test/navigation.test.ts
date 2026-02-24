import { RequestHook, Selector } from 'testcafe'

import { clickMapFeature, flaky, getLocation, getScroll, goBack, goForward, openInNewTabModifiers, screencap, searchField, target, urbanstatsFixture, waitForLoading, waitForSelectedSearchResult } from './test_utils'

urbanstatsFixture('navigation test', '/')

test('two randoms mobile', async (t) => {
    /**
     * Sidebar should close when going to two articles
     */
    await t.resizeWindow(400, 800)
    await t.click('.hamburgermenu')
    await t.click(Selector('a').withExactText('Weighted by Population (US only)'))
    await t.expect(Selector('a').withExactText('Weighted by Population (US only)').exists).notOk()
    await t.click('.hamburgermenu')
    await t.click(Selector('a').withExactText('Weighted by Population (US only)'))
    await waitForLoading()
    await t.expect(Selector('a').withExactText('Weighted by Population (US only)').exists).notOk()
})

test('maintain and restore scroll position back-forward', async (t) => {
    await t.navigateTo('/article.html?longname=Texas%2C+USA')
    await t.expect(Selector('.headertext').withText(/Texas/).exists).ok() // Must wait for Texas to load, otherwise scrolling on the loading page is ineffective
    await t.scroll(0, 200)
    await t.click(Selector('a').withExactText('Population'))
    await screencap(t) // For debugging why the next step fails sometimes
    await t.expect(Selector('.subheadertext').withExactText('Population').exists).ok()
    await t.expect(getScroll()).eql(0) // Resets scroll on different page type
    await t.scroll(0, 100)
    await t.click(Selector('a').withText(/New York/))
    await t.expect(Selector('.headertext').withText(/New York/).exists).ok()
    await t.scroll(0, 400)
    await flaky(t, async () => {
        await clickMapFeature(/Connecticut/)
    })
    await flaky(t, async () => {
        await t.expect(Selector('.headertext').withText(/Connecticut/).exists).ok()
    })
    await t.expect(getScroll()).eql(400) // Does not reset scroll on map navigation
    await t.scroll(0, 500)
    await goBack()
    await t.expect(Selector('.headertext').withText(/New York/).exists).ok()
    await t.expect(getScroll()).eql(400)
    await goBack()
    await t.expect(Selector('.subheadertext').withExactText('Population').exists).ok()
    await t.expect(getScroll()).eql(100)
    await goForward()
    await t.expect(Selector('.headertext').withText(/New York/).exists).ok()
    await t.expect(getScroll()).eql(400)
    await goBack()
    await t.expect(Selector('.subheadertext').withExactText('Population').exists).ok()
    await t.expect(getScroll()).eql(100)
    await goBack()
    await t.expect(Selector('.headertext').withText(/Texas/).exists).ok()
    await t.expect(getScroll()).eql(200)
    await goForward()
    await t.expect(Selector('.subheadertext').withExactText('Population').exists).ok()
    await t.expect(getScroll()).eql(100)
})

test('control click new tab', async (t) => {
    await t.click(Selector('a').withExactText('Data Credit'), { modifiers: openInNewTabModifiers })
    await t.expect(getLocation()).eql(`${target}/`)
})

test('retro link', async (t) => {
    await t.expect(Selector(`a[href="/quiz.html#mode=retro"]`).exists).ok()
})

test('navigates to hash', async (t) => {
    await t.navigateTo('data-credit.html#explanation_population')
    await t.expect(getLocation()).eql(`${target}/data-credit.html#explanation_population`)
    await screencap(t, { fullPage: false })
})

test('navigates to hash 2', async (t) => {
    // One at the bottom of the page to really that the scroll position holds up as things load
    await t.navigateTo('data-credit.html#explanation_gpw')
    await t.expect(getLocation()).eql(`${target}/data-credit.html#explanation_gpw`)
    await screencap(t, { fullPage: false })
})

urbanstatsFixture('stats page', '/statistic.html?statname=Population&article_type=Judicial+District&start=1&amount=20&universe=USA')

test('data credit hash from stats page', async (t) => {
    await t.click(Selector('a').withExactText('Data Explanation and Credit'))
    await t.expect(getLocation()).eql(`${target}/data-credit.html#explanation_population`)
    await screencap(t, { fullPage: false })
})

urbanstatsFixture('article page', '/article.html?longname=MN-08+in+Washington+County%2C+USA&s=CPiCUKKL5WuCCLpM24V')

test('going to related resets scroll', async (t) => {
    await t.click(Selector('a').withExactText('WI-07 (2023)'))
    await t.expect(t.eval(() => window.scrollY)).eql(0)
})

test('using pointers preserves scroll', async (t) => {
    const lastPointer = Selector('button[data-test-id="1"]').nth(-1)
    await t.hover(lastPointer)
    const scrollBefore: unknown = await t.eval(() => window.scrollY)
    await t.click(lastPointer)
    await waitForLoading()
    await t.expect(t.eval(() => window.scrollY)).eql(scrollBefore)
})

// Artificially induce lag for cetrain requests for testing purposes

type Filter = (options: RequestMockOptions) => boolean
export class DelayRequests extends RequestHook {
    private delayFilter?: Filter
    private delayedRequests: (() => void)[] = []

    removeFilter(): number {
        const result = this.delayedRequests.length
        this.delayFilter = undefined
        this.delayedRequests.forEach((resolve) => { resolve() })
        this.delayedRequests = []
        return result
    }

    setFilter(filter: Filter): void {
        this.delayFilter = filter
    }

    override onRequest(event: { requestOptions: RequestMockOptions }): Promise<void> {
        if (this.delayFilter?.(event.requestOptions)) {
            return new Promise(resolve => this.delayedRequests.push(resolve))
        }
        else {
            return Promise.resolve()
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function -- TestCafe complains if we don't have this
    override onResponse(): void { }
}

const delayRequests = new DelayRequests()
const dataFilter: Filter = options => options.path.startsWith('/data')
const indexFilter: Filter = options => options.path === '/scripts/index.js'

urbanstatsFixture('loading tests', '/', async (t) => {
    delayRequests.removeFilter()
    await (await t.getCurrentCDPSession()).Network.setCacheDisabled({ cacheDisabled: true })
}, { requestHooks: [delayRequests] })

// Prevents flashes when navigating to a hash below MathJax on the data credit page (MathJax loads from CloudFlare)
// Also prevents test flakiness on the data credit page
test('data credit page height should be the same before and after cloudflare load', async (t) => {
    delayRequests.setFilter(options => options.hostname === 'cdnjs.cloudflare.com')
    await t.navigateTo('data-credit.html#explanation_population')
    await screencap(t, { fullPage: true })
    const heightBefore = await t.eval(() => document.body.getBoundingClientRect().height) as number
    delayRequests.removeFilter()
    await t.wait(1000)
    await screencap(t, { fullPage: true })
    const heightAfter = await t.eval(() => document.body.getBoundingClientRect().height) as number
    await t.expect(heightAfter).eql(heightBefore)
})

test('initial load', async (t) => {
    delayRequests.setFilter(dataFilter)
    await t.navigateTo(`${target}/article.html?longname=Avon+Central+School+District%2C+New+York%2C+USA`)
    await t.expect(Selector('[data-test-id=initialLoad]').exists).ok()
    await screencap(t, { fullPage: false, wait: false })
    delayRequests.removeFilter()
    await t.expect(Selector('[data-test-id=initialLoad]').exists).notOk()
})

test('quick load', async (t) => {
    await t.eval(() => {
        (window as { testQuickNavigationDuration?: number }).testQuickNavigationDuration = 10000
    })
    await t
        .click(searchField)
        .typeText(searchField, 'Kalamazoo city')
    await waitForSelectedSearchResult(t)
    delayRequests.setFilter(dataFilter)
    await t.pressKey('enter')
    await t.expect(Selector('[data-test-id=quickLoad]').exists).ok()
    await screencap(t, { fullPage: false, wait: false })
    // there are no longer symlinks in separate files, so it's just one request
    await t.expect(delayRequests.removeFilter()).eql(1)
    await t.expect(Selector('[data-test-id=quickLoad]').exists).notOk()
})

test('long load', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Kalamazoo city')
    await waitForSelectedSearchResult(t)
    delayRequests.setFilter(dataFilter)
    await t.pressKey('enter')
    await t.wait(3000)
    await t.expect(Selector('[data-test-id=subsequentLongLoad]').exists).ok()
    await screencap(t, { fullPage: false, wait: false })
    delayRequests.removeFilter()
    await t.expect(Selector('[data-test-id=subsequentLongLoad]').exists).notOk()
})

test('invalid url', async (t) => {
    await t.navigateTo(`${target}/article.html`)
    await t.expect(Selector('li').withExactText('Parameter longname is Required').exists).ok()
    await screencap(t, { wait: false })
})

test('loading error', async (t) => {
    await t.navigateTo(`${target}/article.html?longname=Kalamazoo+city%2C+Michigan%2C+US`) // Should be USA
    await t.expect(Selector('h1').withExactText('Error Loading Page').exists).ok()
    await screencap(t, { wait: false })
})

test('before main bundle loads', async (t) => {
    delayRequests.setFilter(indexFilter)
    await t.navigateTo(target)
    await t.expect(Selector('#loading').exists).ok()
    await screencap(t, { wait: false, fullPage: false })
    delayRequests.removeFilter()
    await t.expect(Selector('#loading').exists).notOk()
})
