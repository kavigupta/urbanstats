import { Selector } from 'testcafe'

import { checkTextboxes, comparisonPage, screencap, uncheckAllCategories, urbanstatsFixture, warningNamed, warningRowNames, withHamburgerMenu } from './test_utils'

const mainCheck = 'input[data-test-id=category_main]'

/**
 * Leaves Main selected with no year selected, so its groups that have years are all missing and
 * its year-less groups -- Area and Compactness -- are all that is left in the table.
 */
async function selectMainWithoutYears(t: TestController): Promise<void> {
    await withHamburgerMenu(t, async () => {
        await uncheckAllCategories(t)
        await t.click(mainCheck)
        await t.click(Selector('label').withExactText('2020'))
    })
}

const missingMainGroups = ['Population', 'PW Density (r=1km)', 'AW Density']

urbanstatsFixture('comparison warnings', comparisonPage([
    'San Francisco city, California, USA',
    'Boston city, Massachusetts, USA',
]))

test('comparison-warnings-in-place', async (t) => {
    await selectMainWithoutYears(t)
    await t.expect(await warningRowNames()).eql(missingMainGroups)
    await t.expect(warningNamed('Select 2020, 2010, or 2000 to see this statistic.', 'Population').exists).ok()
    // The warnings stand where the statistics would have been, above the ones that are still shown
    const rows = Selector('.for-testing-table-row')
    await t.expect(rows.nth(0).find('[data-test-id=article-warning]').exists).ok()
    await t.expect(rows.nth(3).find('[data-test-id=article-warning]').exists).notOk()
    await t.expect(rows.nth(3).find('a').withExactText('Area').exists).ok()
    await screencap(t)
})

// Comparing across countries is what makes the data sources choosable rather than forced on, so
// it is the only place the sources can all be turned off.
urbanstatsFixture('comparison warnings across data sources', comparisonPage([
    'Ontario, Canada',
    'California, USA',
]))

test('comparison-warnings-all-sources-disabled', async (t) => {
    // GHSL is off by default, so turning off the two censuses leaves nothing enabled
    await checkTextboxes(t, ['US Census', 'Canadian Census'])
    await t.expect(warningNamed('All Population Sources are disabled. Enable one to see this statistic.', 'Population').exists).ok()
    // Statistics that don't come from a Population source are unaffected
    await t.expect(Selector('a').withExactText('Area').exists).ok()
    await screencap(t)
})

// Five regions and only two statistics left, which is wide enough that the table transposes.
urbanstatsFixture('transposed comparison warnings', comparisonPage([
    'Santa Clarita city, California, USA',
    'Santa Clara city, California, USA',
    'Boston city, Massachusetts, USA',
    'San Francisco city, California, USA',
    'Denver city, Colorado, USA',
]))

test('comparison-transposed-warnings-below-the-rows', async (t) => {
    await selectMainWithoutYears(t)
    await t.expect(Selector('span.serif.value').withExactText('Region').exists).ok('the table should have transposed')
    await t.expect(await warningRowNames()).eql(missingMainGroups)
    // Transposed, the statistics run along the columns, so there is no row for a warning to stand
    // in for and they all go after the rows instead.
    const rows = Selector('.for-testing-table-row')
    const rowCount = await rows.count
    for (let fromEnd = 0; fromEnd < missingMainGroups.length; fromEnd++) {
        await t.expect(rows.nth(rowCount - 1 - fromEnd).find('[data-test-id=article-warning]').exists).ok()
    }
    await screencap(t)
})
