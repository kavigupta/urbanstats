import { Selector } from 'testcafe'

import { comparisonTableScope, doneButton, editButton, filterBox, setCategoryExpanded } from './article_edit_test_utils'
import { comparisonPage, downloadCSV, safeReload, screencap, target, urbanstatsFixture } from './test_utils'

/**
 * Tests for the comparison table's "edit statistics" mode: the same category/group checkbox
 * tree the article table gets, but with a column of values per region being compared.
 */

const upperSGV = 'Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
const swSGV = 'Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'

const twoRegions = comparisonPage([upperSGV, swSGV])
// Four countries with a settings vector that leaves few enough statistics selected to transpose.
const transposed = `${target}/comparison.html?longnames=%5B%22China%22%2C%22USA%22%2C%22Japan%22%2C%22Indonesia%22%5D&s=6TunChiToWxwZeDP`

const mainCategory = Selector('input[data-test-id=edit_category_main]')
const populationGroup = Selector('input[data-test-id=edit_group_population]')
const comparisonTable = Selector(comparisonTableScope)
// Scoped to the table so it doesn't match the identical sidebar controls.
const tableStagingControls = comparisonTable.find('[data-test-id=staging_controls]')

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

test('comparison edit mode is ephemeral across reloads', async (t) => {
    await t.click(editButton)
    await t.expect(doneButton.exists).ok()

    await safeReload(t)

    await t.expect(editButton.exists).ok()
    await t.expect(doneButton.exists).notOk()
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

// Reaching a comparison via a settings link that differs from the saved settings should
// open edit mode automatically and surface the staging controls on the table.
urbanstatsFixture('comparison edit mode staging', twoRegions, async (t) => {
    // Save a setting first, so the link enters staging instead of silently applying.
    await t.click(Selector('input[data-test-id=use_imperial]'))
    await t.navigateTo(`${twoRegions}&s=29ZqGgHgeNSXMA9`)
})

test('comparison edit mode auto-opens in staging', async (t) => {
    await t.expect(filterBox.exists).ok()
    await t.expect(tableStagingControls.exists).ok()
    // Discard/Apply replace the Done button.
    await t.expect(doneButton.exists).notOk()
    await screencap(t)
})

test('applying staged changes also exits comparison edit mode', async (t) => {
    await t.click(comparisonTable.find('button[data-test-id=apply]'))
    await t.expect(tableStagingControls.exists).notOk()
    await t.expect(editButton.exists).ok()
})

test('discarding staged changes also exits comparison edit mode', async (t) => {
    await t.click(comparisonTable.find('button[data-test-id=discard]'))
    await t.expect(tableStagingControls.exists).notOk()
    await t.expect(editButton.exists).ok()
})

// The congressional representatives table is a metadata "extra" that hangs below its row;
// on a comparison it has to cover every region, not just the first.
urbanstatsFixture('comparison edit mode congressional', comparisonPage(['02139, USA', '10001, USA']))

const congressionalGroup = Selector('input[data-test-id=edit_group_metadata_show_metadata_congressional_representatives]')
const congressionalWidget = comparisonTable.find('[data-test-id=congressional-representatives]')

test('congressional representatives table covers every region in edit mode', async (t) => {
    await t.click(editButton)
    await t.typeText(filterBox, 'Congressional')
    await t.expect(congressionalGroup.exists).ok()

    // Unchecked: just the row, no table.
    await t.expect(congressionalWidget.exists).notOk()

    await t.click(congressionalGroup)
    await t.expect(congressionalWidget.exists).ok()
    await t.expect(congressionalWidget.textContent).contains('02139')
    await t.expect(congressionalWidget.textContent).contains('10001')
    await screencap(t)
})
