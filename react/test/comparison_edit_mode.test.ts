import { Selector } from 'testcafe'

import { comparisonTableScope, doneButton, editButton, filterBox, setCategoryExpanded } from './article_edit_test_utils'
import { editModeSharedTests } from './edit_mode_test_template'
import { comparisonPage, downloadCSV, screencap, target, urbanstatsFixture } from './test_utils'

/**
 * Tests for the comparison table's "edit statistics" mode: the same category/group checkbox
 * tree the article table gets, but with a column of values per region being compared. The
 * behavior it shares with the article table's edit mode is in editModeSharedTests.
 */

const upperSGV = 'Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
const swSGV = 'Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'

const twoRegions = comparisonPage([upperSGV, swSGV])
// Four countries with a settings vector that leaves few enough statistics selected to transpose.
const transposed = `${target}/comparison.html?longnames=%5B%22China%22%2C%22USA%22%2C%22Japan%22%2C%22Indonesia%22%5D&s=6TunChiToWxwZeDP`

const mainCategory = Selector('input[data-test-id=edit_category_main]')
const populationGroup = Selector('input[data-test-id=edit_group_population]')
const comparisonTable = Selector(comparisonTableScope)

urbanstatsFixture('comparison edit mode', twoRegions)

test('edit statistics toggles the checkbox tree on the comparison table', async (t) => {
    // Named to distinguish it from the per-region replace/delete controls.
    await t.expect(editButton.innerText).eql('Edit Statistics')
    await t.expect(mainCategory.exists).notOk()
    await screencap(t)

    await t.click(editButton)

    await t.expect(doneButton.exists).ok()
    await t.expect(filterBox.exists).ok()
    await t.expect(mainCategory.checked).ok()
    await screencap(t)

    await t.click(doneButton)
    await t.expect(editButton.exists).ok()
    await t.expect(mainCategory.exists).notOk()
})

test('each region keeps a column of values in edit mode', async (t) => {
    await t.click(editButton)
    await setCategoryExpanded(t, 'main', true, comparisonTableScope)
    // Population is a single-stat group, so its row is the one carrying the group checkbox.
    const populationRow = populationGroup.parent('.for-testing-table-row')
    await t.expect(populationRow.find('.testing-statistic-value').count).eql(2)
})

test('toggling a group in edit mode changes what the comparison shows', async (t) => {
    const populationName = comparisonTable.find('[data-test-id=statistic-link]').withExactText('Population')
    await t.expect(populationName.exists).ok()

    await t.click(editButton)
    await setCategoryExpanded(t, 'main', true, comparisonTableScope)
    await t.click(populationGroup)
    await t.click(doneButton)
    await t.expect(populationName.exists).notOk()

    // Main stays expanded, so re-entering goes straight back to the same checkbox.
    await t.click(editButton)
    await t.click(populationGroup)
    await t.click(doneButton)
    await t.expect(populationName.exists).ok()
})

test('the filter narrows the comparison tree', async (t) => {
    await t.click(editButton)
    await t.typeText(filterBox, 'gene')

    // Filtering expands the matching categories and drops the rest.
    await t.expect(Selector('input[data-test-id=edit_group_generation_genx]:not([inert] *)').exists).ok()
    await t.expect(mainCategory.exists).notOk()

    await t.selectText(filterBox).pressKey('delete')
    await t.expect(mainCategory.exists).ok()
})

test('a multi-row group keeps a column of values per region on every row', async (t) => {
    await t.click(editButton)
    // A second year makes Population a two-row group: a header row carrying the checkbox,
    // and a row per year pointing at it.
    await t.click(Selector('input[data-test-id=edit_year_2010]'))
    await setCategoryExpanded(t, 'main', true, comparisonTableScope)

    const row2010 = Selector(`${comparisonTableScope} label[for=edit-checkbox-population]`).withExactText('2010')
    await t.expect(row2010.exists).ok()
    await t.expect(row2010.parent('.for-testing-table-row').find('.testing-statistic-value').count).eql(2)
})

test('expanding a stat in edit mode plots every region', async (t) => {
    await t.click(editButton)
    await setCategoryExpanded(t, 'main', true, comparisonTableScope)

    const expandToggle = comparisonTable.find('.expand-toggle:not([inert] *)')
    await t.expect(expandToggle.exists).ok()
    await t.click(expandToggle.nth(0))

    const histogram = comparisonTable.find('.histogram-svg-panel')
    await t.expect(histogram.exists).ok()
    // One series per region, rather than only the first one's.
    await t.expect(histogram.textContent).contains('Upper San Gabriel Valley CCD')
    await t.expect(histogram.textContent).contains('Southwest San Gabriel Valley CCD')
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

urbanstatsFixture('comparison edit mode mobile', twoRegions, async (t) => {
    await t.resizeWindow(400, 800)
})

test('mobile comparison edit mode hides the ordinal columns', async (t) => {
    await t.click(editButton)
    await t.expect(filterBox.exists).ok()
    await t.expect(comparisonTable.find('[data-test-id=statistic-ordinal]').exists).notOk()
    await screencap(t, { fullPage: false })
})

editModeSharedTests({
    name: 'comparison',
    page: twoRegions,
    scope: comparisonTableScope,
    congressional: {
        page: comparisonPage(['02139, USA', '10001, USA']),
        // The widget has to cover every region, not just the first.
        expectedRegions: ['02139', '10001'],
    },
})
