import { Selector } from 'testcafe'

import { getLocation, screencap, TARGET, urbanstatsFixture } from './test_utils'

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
