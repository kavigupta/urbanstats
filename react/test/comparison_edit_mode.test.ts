import { Selector } from 'testcafe'

import { editModeSharedTests } from './edit_mode_test_template'
import { comparisonTableScope, doneButton, editButton, filterBox, groupCheckbox, groupMemberRow, yearCheckbox } from './edit_mode_test_utils'
import { comparisonPage, downloadCSV, screencap, target, urbanstatsFixture } from './test_utils'

/**
 * Tests for what the comparison table's "edit statistics" mode does that the article
 * table's doesn't: a column of values per region being compared, and coming out of
 * transpose. The behavior the two share is in editModeSharedTests.
 */

const upperSGV = 'Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
const swSGV = 'Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'

const twoRegions = comparisonPage([upperSGV, swSGV])
// Enough regions that the table is wider than the screen and scrolls horizontally.
const scrollingRegions = comparisonPage(['China', 'USA', 'Japan', 'Indonesia', 'India', 'Brazil'])
// Four countries with a settings vector that leaves few enough statistics selected to transpose.
const transposed = `${target}/comparison.html?longnames=%5B%22China%22%2C%22USA%22%2C%22Japan%22%2C%22Indonesia%22%5D&s=6TunChiToWxwZeDP`

const populationGroup = groupCheckbox('population')
const comparisonTable = Selector(comparisonTableScope)

urbanstatsFixture('comparison edit mode', twoRegions)

test('each region keeps a column of values in edit mode', async (t) => {
    await t.click(editButton)
    // Population is a single-stat group, so its row is the one carrying the group checkbox.
    const populationRow = populationGroup.parent('.for-testing-table-row')
    await t.expect(populationRow.find('.testing-statistic-value').count).eql(2)
})

test('toggling a group in edit mode changes what the comparison shows', async (t) => {
    const populationName = comparisonTable.find('[data-test-id=statistic-link]').withExactText('Population')
    await t.expect(populationName.exists).ok()

    await t.click(editButton)
    await t.click(populationGroup)
    await t.click(doneButton)
    await t.expect(populationName.exists).notOk()

    // Main's other groups are still selected, so it stays open and Population keeps its row.
    await t.click(editButton)
    await t.click(populationGroup)
    await t.click(doneButton)
    await t.expect(populationName.exists).ok()
})

test('a multi-row group keeps a column of values per region on every row', async (t) => {
    await t.click(editButton)
    // A second year makes Population a two-row group: a header row carrying the checkbox,
    // and a row per year pointing at it.
    await t.click(yearCheckbox(2010))

    const row2010 = groupMemberRow('population', '2010')
    await t.expect(row2010.exists).ok()
    await t.expect(row2010.parent('.for-testing-table-row').find('.testing-statistic-value').count).eql(2)
})

test('csv export in edit mode covers the selected statistics, not the whole tree', async (t) => {
    await t.click(editButton)
    await t.expect(filterBox.exists).ok()

    const csvContent = await downloadCSV(t)
    await t.expect(csvContent).contains('Population')
    // Race is off by default; edit mode showing its rows must not put them in the export.
    await t.expect(csvContent).notContains('White %')
})

// A transposed comparison puts the statistics across the top; edit mode has to undo that,
// since the tree runs down the left column.
urbanstatsFixture('comparison edit mode transposed', transposed)

test('editing a transposed comparison pops out of transpose', async (t) => {
    // Transposed: the top-left header names the left column "Region".
    const regionHeader = comparisonTable.find('.serif').withExactText('Region')
    await t.expect(regionHeader.exists).ok()
    await screencap(t)

    await t.click(editButton)

    await t.expect(filterBox.exists).ok()
    await t.expect(regionHeader.exists).notOk()
    await screencap(t)
})

urbanstatsFixture('comparison edit mode staging while scrolling', scrollingRegions, async (t) => {
    // Save a setting first, so the link enters staging instead of silently applying.
    await t.click(Selector('input[data-test-id=use_imperial]'))
    await t.navigateTo(`${scrollingRegions}&s=29ZqGgHgeNSXMA9`)
})

test('the staging buttons stay on screen when the table scrolls horizontally', async (t) => {
    await t.expect(Selector('[data-test-id=staging_controls]').exists).ok()
    const viewportWidth = await Selector('body').clientWidth

    // Guards the fixture: without a table wider than the screen there's nothing to scroll off.
    await t.expect((await comparisonTable.boundingClientRect).width).gt(viewportWidth)

    const applyButton = Selector('button[data-test-id=apply]')
    await t.expect((await applyButton.boundingClientRect).right).lte(viewportWidth)
    await screencap(t)
})

editModeSharedTests({
    name: 'comparison',
    page: twoRegions,
    scope: comparisonTableScope,
    // Named to distinguish it from the per-region replace/delete controls.
    editButtonLabel: 'Select Statistics',
    expectedPlotSeries: ['Upper San Gabriel Valley CCD', 'Southwest San Gabriel Valley CCD'],
    congressional: {
        page: comparisonPage(['02139, USA', '10001, USA']),
        // The widget has to cover every region, not just the first.
        expectedRegions: ['02139', '10001'],
    },
})
