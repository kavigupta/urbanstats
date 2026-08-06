import { Selector } from 'testcafe'

import { categoryCheckbox, editCheckbox, filterBox, sourceCheckbox, warningEditAction, withEditMode, yearCheckbox } from './edit_mode_test_utils'
import { arrayFromSelector, checkTextboxes, comparisonPage, screencap, uncheckAllCategories, urbanstatsFixture, warningNamed, warningRowNames } from './test_utils'

/**
 * Leaves Main selected with no year selected, so its groups that have years are all missing and
 * its year-less groups -- Area and Compactness -- are all that is left in the table.
 */
async function selectMainWithoutYears(t: TestController): Promise<void> {
    await withEditMode(t, async () => {
        await uncheckAllCategories(t)
        await t.click(categoryCheckbox('main'))
        await t.click(yearCheckbox(2020))
    })
}

const missingMainGroups = ['Population', 'PW Density (r=1km)', 'AW Density']

/** The statistic names heading each column, which transposed is where a warning's name goes. */
async function columnHeaderNames(): Promise<string[]> {
    const names = await arrayFromSelector(Selector('[data-test-id=statistic-link]'))
    return Promise.all(names.map(async name => (await name.innerText).trim()))
}

urbanstatsFixture('comparison warnings', comparisonPage([
    'San Francisco city, California, USA',
    'Boston city, Massachusetts, USA',
]))

test('comparison-warnings-in-place', async (t) => {
    await selectMainWithoutYears(t)
    await t.expect(await warningRowNames()).eql(missingMainGroups)
    await t.expect(warningNamed('Select 2020, 2010, or 2000 to see this statistic.', 'Population').exists).ok()
    const rows = Selector('.for-testing-table-row')
    await t.expect(rows.nth(0).find('[data-test-id=article-warning]').exists).ok()
    await t.expect(rows.nth(3).find('[data-test-id=article-warning]').exists).notOk()
    await t.expect(rows.nth(3).find('a').withExactText('Area').exists).ok()
    await screencap(t)
})

// Comparing across countries is the only place all the sources can be turned off.
urbanstatsFixture('comparison warnings across data sources', comparisonPage([
    'Ontario, Canada',
    'California, USA',
]))

test('comparison-warnings-all-sources-disabled', async (t) => {
    // GHSL is off by default, so turning off the two censuses leaves nothing enabled
    await checkTextboxes(t, ['US Census', 'Canadian Census'])
    await t.expect(warningNamed('US Census, Canadian Census, and GHSL are disabled. Enable one to see this statistic.', 'Population').exists).ok()
    await t.expect(Selector('a').withExactText('Area').exists).ok()
    await screencap(t)
})

test('comparison-warnings-enable-one-opens-edit-mode', async (t) => {
    await checkTextboxes(t, ['US Census', 'Canadian Census'])
    await t.expect(warningEditAction.nth(0).innerText).eql('Enable one')

    await t.click(warningEditAction.nth(0))

    // Edit mode, open on the sources the warning named.
    await t.expect(filterBox.exists).ok()
    await t.expect(sourceCheckbox('Population', 'US Census').checked).eql(false)
})

test('comparison-warnings-name-the-disabled-source', async (t) => {
    // The generation statistics come from the two censuses only, so turning off the US one leaves
    // Ontario's showing and California's gone -- naming the Population sources as a whole would be
    // a lie, since enabling the others is what brings the population statistic itself back.
    await withEditMode(t, async () => {
        await uncheckAllCategories(t)
        await t.click(categoryCheckbox('generation'))
        await t.click(editCheckbox('US Census'))
    })
    await t.expect(warningNamed('US Census is disabled. Enable it to see these statistics.', 'Generation').exists).ok()
    // Ontario still has its own, from the Canadian census
    await t.expect(Selector('a').withExactText('Silent % [StatCan]').exists).ok()
})

// Two US states, so the US Census and GHSL are both choosable, and GHSL only has 2020.
urbanstatsFixture('comparison warnings with a year the enabled source lacks', comparisonPage([
    'Massachusetts, USA',
    'California, USA',
]))

test('comparison-warnings-year-missing-from-enabled-source', async (t) => {
    // leaves 2010, a year GHSL has no data for, as the only year selected
    await checkTextboxes(t, ['US Census', 'GHSL', '2020', '2010'])
    // GHSL is enabled and simply has no data for 2010, so the years are what's missing, not a source
    await t.expect(warningNamed('Select 2020 to see this statistic.', 'Population').exists).ok()
})

// Enough regions that the table is narrower transposed.
urbanstatsFixture('transposed comparison warnings', comparisonPage([
    'Santa Clarita city, California, USA',
    'Santa Clara city, California, USA',
    'Boston city, Massachusetts, USA',
    'San Francisco city, California, USA',
    'Denver city, Colorado, USA',
    'Seattle city, Washington, USA',
]))

test('comparison-transposed-warnings-are-columns', async (t) => {
    await selectMainWithoutYears(t)
    await t.expect(Selector('span.serif.value').withExactText('Region').exists).ok('the table should have transposed')
    const warnings = Selector('[data-test-id=article-warning]')
    await t.expect(warnings.count).eql(missingMainGroups.length)
    await t.expect(warnings.nth(0).innerText).contains('Select 2020, 2010, or 2000 to see this statistic.')
    const columnNames = await columnHeaderNames()
    await t.expect(columnNames).eql([...missingMainGroups, 'Area', 'Compactness'])
    // The warnings are columns here, so none of them takes a row
    await t.expect(Selector('[data-test-id=article-warning-name]').exists).notOk()
    await screencap(t)
})

test('comparison-transposed-warning-column-opens-edit-mode', async (t) => {
    await selectMainWithoutYears(t)
    // Drawn down a column rather than along a row, but still the way into edit mode.
    await t.click(warningEditAction.nth(0))
    await t.expect(filterBox.exists).ok()
})
