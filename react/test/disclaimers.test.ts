import { Selector } from 'testcafe'

import { safeReload, screencap, target, urbanstatsFixture } from './test_utils'

const onlyUSAndCanadaCensus = 'AkWGLJMDBPzz5'

// Heterogenous-sources: shown when comparing articles with different data sources (e.g. US Census vs GHSL)
urbanstatsFixture(
    'disclaimers heterogenous-sources',
    `${target}/comparison.html?longnames=%5B"Cambridge+city%2C+Massachusetts%2C+USA"%2C"Chinandega%2C+Nicaragua"%5D&s=${onlyUSAndCanadaCensus}`,
)

test('heterogenous-sources disclaimer shows when comparing different sources', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.expect(Selector('.disclaimer-toggle').count).eql(1, 'one disclaimer when sources differ')
    await t.click(Selector('.disclaimer-toggle').nth(0))
    await t.expect(
        Selector('div').withExactText('This statistic is based on data from multiple sources, which may not be consistent with each other.').visible,
    ).ok('heterogenous-sources disclaimer text visible after click')
    await screencap(t)
})

// Election disclaimers: small regions (pop < 5000 margin, pop < 10000 swing) get disclaimers; larger towns do not.
urbanstatsFixture('election disclaimer mid-size town', `${target}/article.html?longname=Northborough+CDP%2C+Massachusetts%2C+USA&category=election`)

test('mid sized town just has swing disclaimer', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.expect(Selector('.disclaimer-toggle').count).eql(2, 'midsize town should have one election disclaimer')
    await t.click(Selector('.disclaimer-toggle').nth(0))
    const electionDisclaimerText = Selector('div').withText(/swings in particular might reflect/)
    await t.expect(electionDisclaimerText.visible).ok('election disclaimer text visible after click')
    await screencap(t)
})

// more disclaimers for small towns
urbanstatsFixture('election disclaimer small town', `${target}/article.html?longname=Orleans+CDP%2C+Massachusetts%2C+USA&category=election`)

test('small town has both margin and swing disclaimers', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.expect(Selector('.disclaimer-toggle').count).eql(5, 'small town should have no election disclaimers')
    await t.click(Selector('.disclaimer-toggle').nth(0))
    const electionDisclaimerText = Selector('div').withText(/precincts, might/)
    await t.expect(electionDisclaimerText.visible).ok('election disclaimer text visible after click')
    await safeReload(t)
    await t.click(Selector('.disclaimer-toggle').nth(1))
    const electionDisclaimerText2 = Selector('div').withText(/swings in particular might reflect/)
    await t.expect(electionDisclaimerText2.visible).ok('election disclaimer text visible after click')
    await screencap(t)
})

urbanstatsFixture('election disclaimer larger town', `${target}/article.html?longname=Cambridge+city%2C+Massachusetts%2C+USA&category=election`)

test('larger town with election stats has no election disclaimers', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.expect(Selector('.disclaimer-toggle').count).eql(0, 'larger town should have no election disclaimers')
    await screencap(t)
})
