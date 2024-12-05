import { RequestHook, Selector } from 'testcafe'

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
    await t.expect(Selector('a').withText('Weighted by Population (US only)').exists).notOk()
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

test.only('invalid url', async (t) => {
    await t.navigateTo(`${TARGET}/article.html`)
    await t.expect(Selector('li').withText('Parameter longname is Required').exists).ok()
    await screencap(t, { wait: false })
})

test.only('loading error', async (t) => {
    await t.navigateTo(`${TARGET}/article.html?longname=Kalamazoo+city%2C+Michigan%2C+US`) // Should be USA
    await t.expect(Selector('h1').withText('Error Loading Page').exists).ok()
    await screencap(t, { wait: false })
})
