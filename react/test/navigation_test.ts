import { ClientFunction, RequestHook, Selector } from 'testcafe'

import { getLocation, screencap, SEARCH_FIELD, TARGET, urbanstatsFixture } from './test_utils'

urbanstatsFixture('navigation test', '/')

test('two randoms mobile', async (t) => {
    /**
     * Sidebar should close when going to two articles
     */
    await t.resizeWindow(400, 800)
    await t.click('.hamburgermenu')
    await t.click(Selector('a').withText('Weighted by Population (US only)'))
    await t.expect(Selector('a').withText('Weighted by Population (US only)').exists).notOk()
    await t.click('.hamburgermenu')
    await t.click(Selector('a').withText('Weighted by Population (US only)'))
    await t.wait(5000) // Wait for random
    await t.expect(Selector('a').withText('Weighted by Population (US only)').exists).notOk()
})

const goBack = ClientFunction(() => { window.history.back() })
const goForward = ClientFunction(() => { window.history.forward() })
const getScroll = ClientFunction(() => window.scrollY)

test('maintain and restore scroll position back-forward', async (t) => {
    await t.navigateTo('/article.html?longname=Texas%2C+USA')
    await t.scroll(0, 200)
    await t.click(Selector('a').withExactText('Population'))
    await t.expect(Selector('.headertext').withText('Population').exists).ok()
    await t.expect(getScroll()).eql(0) // Resets scroll on different page type
    await t.scroll(0, 100)
    await t.click(Selector('a').withText('New York'))
    await t.expect(Selector('.headertext').withText('New York').exists).ok()
    await t.scroll(0, 400)
    await t.click(Selector('a').withText('Connecticut'))
    await t.expect(Selector('.headertext').withText('Connecticut').exists).ok()
    await t.expect(getScroll()).eql(400) // Does not reset scroll on same page type
    await t.scroll(0, 500)
    await goBack()
    await t.expect(Selector('.headertext').withText('New York').exists).ok()
    await t.expect(getScroll()).eql(400)
    await goBack()
    await t.expect(Selector('.headertext').withText('Population').exists).ok()
    await t.expect(getScroll()).eql(100)
    await goForward()
    await t.expect(Selector('.headertext').withText('New York').exists).ok()
    await t.expect(getScroll()).eql(400)
    await goBack()
    await t.expect(Selector('.headertext').withText('Population').exists).ok()
    await t.expect(getScroll()).eql(100)
    await goBack()
    await t.expect(Selector('.headertext').withText('Texas').exists).ok()
    await t.expect(getScroll()).eql(200)
    await goForward()
    await t.expect(Selector('.headertext').withText('Population').exists).ok()
    await t.expect(getScroll()).eql(100)
})

urbanstatsFixture('stats page', '/statistic.html?statname=Population&article_type=Judicial+District&start=1&amount=20&universe=USA')

test('data credit hash from stats page', async (t) => {
    await t.click(Selector('a').withText('Data Explanation and Credit'))
    await t.expect(getLocation()).eql(`${TARGET}/data-credit.html#explanation_population`)
    await screencap(t, { fullPage: false })
})

urbanstatsFixture('data credit page direct', '/')

test('navigates to hash', async (t) => {
    await t.navigateTo('data-credit.html#explanation_population')
    await t.expect(getLocation()).eql(`${TARGET}/data-credit.html#explanation_population`)
    await screencap(t, { fullPage: false })
})

// Artificially induce lag for cetrain requests for testing purposes

type Filter = (options: RequestMockOptions) => boolean
export class DelayRequests extends RequestHook {
    private delayFilter?: Filter
    private delayedRequests: (() => void)[] = []

    removeFilter(): void {
        this.delayFilter = undefined
        this.delayedRequests.forEach((resolve) => { resolve() })
        this.delayedRequests = []
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

urbanstatsFixture('loading tests', '/', () => {
    delayRequests.removeFilter()
    return Promise.resolve()
}).requestHooks(delayRequests)

test('initial load', async (t) => {
    delayRequests.setFilter(dataFilter)
    await t.navigateTo(`${TARGET}/article.html?longname=Avon+Central+School+District%2C+New+York%2C+USA`)
    await t.expect(Selector('[data-test-id=initialLoad]').exists).ok()
    await screencap(t, { fullPage: false })
    delayRequests.removeFilter()
    await t.expect(Selector('[data-test-id=initialLoad]').exists).notOk()
})

test('quick load', async (t) => {
    await t.eval(() => {
        (window as { testQuickNavigationDuration?: number }).testQuickNavigationDuration = 10000
    })
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, 'Kalamazoo city')
    delayRequests.setFilter(dataFilter)
    await t.pressKey('enter')
    await t.expect(Selector('[data-test-id=quickLoad]').exists).ok()
    await screencap(t, { fullPage: false, wait: false })
    delayRequests.removeFilter()
    await t.expect(Selector('[data-test-id=quickLoad]').exists).notOk()
})

test('long load', async (t) => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, 'Kalamazoo city')
    delayRequests.setFilter(dataFilter)
    await t.pressKey('enter')
    await t.wait(3000)
    await t.expect(Selector('[data-test-id=longLoad]').exists).ok()
    await screencap(t, { fullPage: false, wait: false })
    delayRequests.removeFilter()
    await t.expect(Selector('[data-test-id=longLoad]').exists).notOk()
})

test('invalid url', async (t) => {
    await t.navigateTo(`${TARGET}/article.html`)
    await t.expect(Selector('li').withText('Parameter longname is Required').exists).ok()
    await screencap(t, { wait: false })
})

test('loading error', async (t) => {
    await t.navigateTo(`${TARGET}/article.html?longname=Kalamazoo+city%2C+Michigan%2C+US`) // Should be USA
    await t.expect(Selector('h1').withText('Error Loading Page').exists).ok()
    await screencap(t, { wait: false })
})

test('before main bundle loads', async (t) => {
    delayRequests.setFilter(indexFilter)
    await t.navigateTo(TARGET)
    await t.expect(Selector('#loading').exists).ok()
    await screencap(t, { wait: false, fullPage: false })
    delayRequests.removeFilter()
    await t.expect(Selector('#loading').exists).notOk()
})
