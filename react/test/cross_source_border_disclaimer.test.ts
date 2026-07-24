import { Selector } from 'testcafe'

import { getLocation, screencap, target, urbanstatsFixture, waitForLoading } from './test_utils'

const disclaimer = Selector('[data-test-id="cross-source-border-disclaimer"]')
const disclaimerLink = Selector('[data-test-id="cross-source-border-link"]')

// A statistic set whose regions can straddle a data source border (Urban Center) drops the
// regions that do from the ranking. The type localizes to "US Urban Center" in universe USA.

// Population has a broader source (GHS-POP) that covers every region, so the disclaimer links
// to that variant of the statistic.
urbanstatsFixture(
    'cross-source-border disclaimer: broader source',
    `${target}/statistic.html?statname=Population&article_type=Urban+Center&start=1&amount=20&universe=USA`,
)

test('links to the broader source that covers every region', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(1, 'expected the cross-source-border disclaimer')
    await t.expect(disclaimer.innerText).match(
        /^[\d\u202f]+ of the [\d\u202f]+ US Urban Centers in USA are missing from this ranking\. US Urban Centers can span more than one country, and Population is not available for the ones that do\. See Population \[GHS-POP\] instead, which covers all of them\.$/,
    )
    await t.expect(disclaimerLink.innerText).eql('Population [GHS-POP]')
    await screencap(t)
    await t.click(disclaimerLink)
    await t.expect(getLocation()).contains('statname=Population+%5BGHS-POP%5D')
    await t.expect(getLocation()).contains('article_type=Urban+Center')
})

// Arthritis % comes only from the US CDC, so there is no broader source; the disclaimer
// instead links to the closest region type that never crosses a border (Urban Area).
urbanstatsFixture(
    'cross-source-border disclaimer: domestic region type',
    `${target}/statistic.html?statname=Arthritis+__PCT__&article_type=Urban+Center&start=1&amount=20&universe=USA`,
)

test('links to a domestic region type when the statistic has one source', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(1, 'expected the cross-source-border disclaimer')
    await t.expect(disclaimer.innerText).match(
        /^[\d\u202f]+ of the [\d\u202f]+ US Urban Centers in USA are missing from this ranking\. US Urban Centers can span more than one country, and Arthritis % is not available for the ones that do\. See Arthritis % for Urban Areas instead, which never cross a data source border\.$/,
    )
    await t.expect(disclaimerLink.innerText).eql('Urban Areas')
    await screencap(t)
    await t.click(disclaimerLink)
    await t.expect(getLocation()).contains('article_type=Urban+Area')
    await t.expect(getLocation()).contains('statname=Arthritis+__PCT__')
})

// Person circles are border-crossing but have no domestic equivalent, so instead of a link
// the disclaimer explains why none is offered.
urbanstatsFixture(
    'cross-source-border disclaimer: no equivalent, with reason',
    `${target}/statistic.html?statname=Arthritis+__PCT__&article_type=5M+Person+Circle&start=1&amount=20&universe=USA`,
)

test('explains why there is no alternative for a type with no equivalent', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(1, 'expected the cross-source-border disclaimer')
    await t.expect(disclaimer.innerText).match(
        /^[\d\u202f]+ of the [\d\u202f]+ US 5M Person Circles in USA are missing from this ranking\. US 5M Person Circles can span more than one country, and Arthritis % is not available for the ones that do\. Circles are drawn around a point without regard to national borders, and no region type defined by a statistics agency resembles them\.$/,
    )
    await t.expect(disclaimerLink.count).eql(0, 'no equivalent type to link to')
    await screencap(t)
})

// A region type whose regions cannot cross a data source border (County) shows nothing.
urbanstatsFixture(
    'cross-source-border disclaimer: absent for domestic-only type',
    `${target}/statistic.html?statname=Population&article_type=County&start=1&amount=20&universe=USA`,
)

test('is absent for a region type that never crosses a border', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(0, 'no disclaimer for counties')
})

// Even when the statistic is missing for some of the regions (territories have no
// presidential election data), a non-crossing type (Subnational Region) shows nothing here.
urbanstatsFixture(
    'cross-source-border disclaimer: absent for non-crossing type with gaps',
    `${target}/statistic.html?statname=2008+Presidential+Election&article_type=Subnational+Region&start=1&amount=20&universe=USA`,
)

test('is absent for a non-crossing type even when some regions lack data', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(0, 'no disclaimer for subnational regions')
})

// But the same non-crossing type in a broad universe (world) does disclaim: a US statistic
// covers only the US subnational regions, and the rest lie outside its country. There is no
// broader source or domestic equivalent, so it offers no link.
urbanstatsFixture(
    'cross-source-border disclaimer: non-crossing type across jurisdictions',
    `${target}/statistic.html?statname=White+__PCT__&article_type=Subnational+Region&start=1&amount=20`,
)

test('explains limited coverage for a non-crossing type in a broad universe', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(1, 'expected the cross-source-border disclaimer')
    await t.expect(disclaimer.innerText).match(
        /^[\d\u202f]+ of the [\d\u202f]+ Subnational Regions are missing from this ranking\. White % is only available in the USA\.$/,
    )
    await t.expect(disclaimerLink.count).eql(0, 'no broader source or domestic equivalent to link to')
    await screencap(t)
})

// The same statistic and type over a universe spanning multiple jurisdictions (world) still
// shows a disclaimer, but the missing regions are the ones outside the US entirely, not the
// ones straddling its border, so the wording is different.
urbanstatsFixture(
    'cross-source-border disclaimer: across jurisdictions',
    `${target}/statistic.html?statname=Population&article_type=Urban+Center&start=1&amount=20`,
)

test('explains limited coverage in a universe spanning more than one jurisdiction', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(1, 'expected the cross-source-border disclaimer')
    await t.expect(disclaimer.innerText).match(
        /^[\d\u202f]+ of the [\d\u202f]+ Urban Centers are missing from this ranking\. Population is only available in the USA\. See Population \[GHS-POP\] instead, which covers all of them\.$/,
    )
    await t.expect(disclaimerLink.innerText).eql('Population [GHS-POP]')
    await screencap(t)
    await t.click(disclaimerLink)
    await t.expect(getLocation()).contains('statname=Population+%5BGHS-POP%5D')
    await t.expect(getLocation()).contains('article_type=Urban+Center')
})

// A statistic computed the same way everywhere (GHS-POP) has no single-country data source,
// so it is never missing regions to a border and shows nothing.
urbanstatsFixture(
    'cross-source-border disclaimer: absent for international source',
    `${target}/statistic.html?statname=Population+%5BGHS-POP%5D&article_type=Urban+Center&start=1&amount=20&universe=USA`,
)

test('is absent for a statistic with an international data source', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(0, 'no disclaimer for a source that covers everywhere')
})

// A geography defined only in one country (City) shows nothing in that country's universe.
urbanstatsFixture(
    'cross-source-border disclaimer: single-country geography at home',
    `${target}/statistic.html?statname=Population&article_type=City&start=1&amount=20&universe=USA`,
)

test('is absent for a single-country geography viewed in its own country', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(0, 'no disclaimer for US cities in the USA universe')
})

// The same geography in a broader universe (world) shows only US regions, so a disclaimer
// explains that. This supersedes the statistic-based disclaimers and offers no link.
urbanstatsFixture(
    'cross-source-border disclaimer: single-country geography abroad',
    `${target}/statistic.html?statname=Population&article_type=City&start=1&amount=20`,
)

test('explains that a single-country geography only exists in one country', async (t) => {
    await t.resizeWindow(1400, 800)
    await waitForLoading()
    await t.expect(disclaimer.count).eql(1, 'expected the cross-source-border disclaimer')
    await t.expect(disclaimer.innerText).eql(
        'Cities are only defined in the USA; regions elsewhere are not included in this ranking.',
    )
    await t.expect(disclaimerLink.count).eql(0, 'the geography disclaimer offers no link')
    await screencap(t)
})
