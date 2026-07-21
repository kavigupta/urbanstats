import { Selector } from 'testcafe'

import { downloadImage, safeReload, screencap, target, urbanstatsFixture, waitForLoading } from './test_utils'

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

test('heterogenous-sources download', async (t) => {
    await t.resizeWindow(1400, 800)
    await downloadImage(t)
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

test('mid sized town download', async (t) => {
    await t.resizeWindow(1400, 800)
    await downloadImage(t)
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

test('small town download', async (t) => {
    await t.resizeWindow(1400, 800)
    await downloadImage(t)
})

urbanstatsFixture('election disclaimer larger town', `${target}/article.html?longname=Cambridge+city%2C+Massachusetts%2C+USA&category=election`)

test('larger town with election stats has no election disclaimers', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.expect(Selector('.disclaimer-toggle').count).eql(0, 'larger town should have no election disclaimers')
    await screencap(t)
})

test('larger town download', async (t) => {
    await t.resizeWindow(1400, 800)
    await downloadImage(t)
})

// Comparison with Orleans CDP (small, US) + York Regional (Canada): heterogenous + election-small-region + election-swing-small-region
const comparisonAllThreeSettings = '6FK4R8LraoXimmdF9X'
urbanstatsFixture(
    'disclaimers comparison all three',
    `${target}/comparison.html?longnames=%5B%22Orleans+CDP%2C+Massachusetts%2C+USA%22%2C%22York+Regional+municipality%2C+Ontario%2C+Canada%22%5D&s=${comparisonAllThreeSettings}`,
)

test('comparison all three disclaimers screenshot', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.expect(Selector('.disclaimer-toggle').count).gte(3, 'comparison should have at least 3 disclaimer toggles (heterogenous + election margin + swing)')
    await downloadImage(t)
})

// Regression test for the disclaimer "!" button being vertically misaligned with the adjacent
// expand "+" button on a stat row that has both. They share a box style and sit in one flex row,
// so their vertical centers should line up. This exercises the interactive (non-screenshot)
// rendering of the disclaimer -- the screenshot path renders a "*"/"†" superscript instead, so it
// would not catch this. Guards the inline-flex fix in StatisticNameDisclaimer.
const canadaUsaBothButtons = '96qLRQxnPRs6JqVoMgss'
urbanstatsFixture(
    'disclaimer and expand buttons on one row',
    `${target}/comparison.html?longnames=%5B"Canada"%2C"USA"%5D&universe=world&s=${canadaUsaBothButtons}`,
)

test('disclaimer-and-expand-buttons-vertically-aligned', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    const centers = await t.eval(() => {
        for (const disclaimer of Array.from(document.getElementsByClassName('disclaimer-toggle'))) {
            // climb to the stat-name row that also holds the expand "+" button
            let container = disclaimer.parentElement
            while (container !== null && container.getElementsByClassName('expand-toggle').length === 0) {
                container = container.parentElement
            }
            // only trust a container that is the single stat-name row (exactly one "+"), not a
            // larger container that would sweep in other rows' expand buttons
            if (container === null || container.getElementsByClassName('expand-toggle').length !== 1) {
                continue
            }
            const d = disclaimer.getBoundingClientRect()
            const e = container.getElementsByClassName('expand-toggle')[0].getBoundingClientRect()
            return { expandCenter: e.top + e.height / 2, disclaimerCenter: d.top + d.height / 2 }
        }
        return null
    }) as { expandCenter: number, disclaimerCenter: number } | null

    await t.expect(centers).notEql(null, 'expected a stat row with both an expand "+" and a disclaimer "!" button')
    await t.expect(Math.abs(centers!.expandCenter - centers!.disclaimerCenter)).lte(1.5,
        `the "+" and "!" buttons should be vertically centered on the same line (+ center ${centers!.expandCenter}, ! center ${centers!.disclaimerCenter})`)
})
