import { Selector } from 'testcafe'

import { doneButton, editButton, filterBox, setCategoryExpanded } from './article_edit_test_utils'
import { safeReload, screencap, target, urbanstatsFixture } from './test_utils'

/**
 * Tests for the article table "edit mode": the statistic category/group checkbox
 * tree replicated directly on the table, plus its extras (plots, congressional
 * representatives, disclaimers), staging integration, and the mobile layout.
 */

const mainCategory = Selector('input[data-test-id=edit_category_main]')
// Population is a single-stat group in the (default-on) Main category.
const populationGroup = Selector('input[data-test-id=edit_group_population]')
// Scoped to the table so it doesn't match the identical sidebar controls.
const tableStagingControls = Selector('.stats_table [data-test-id=staging_controls]')

urbanstatsFixture('article edit mode', `${target}/article.html?longname=California%2C+USA`)

test('edit mode toggles the checkbox tree on the table', async (t) => {
    // Normal view: an Edit button, and no tree.
    await t.expect(editButton.exists).ok()
    await t.expect(mainCategory.exists).notOk()

    await t.click(editButton)

    // Edit view: Done + filter, and the tree with Main checked by default.
    await t.expect(doneButton.exists).ok()
    await t.expect(filterBox.exists).ok()
    await t.expect(mainCategory.checked).ok()
    await screencap(t)

    await t.click(doneButton)
    await t.expect(editButton.exists).ok()
    await t.expect(mainCategory.exists).notOk()
})

test('edit mode is ephemeral across reloads', async (t) => {
    await t.click(editButton)
    await t.expect(doneButton.exists).ok()

    await safeReload(t)

    // Not persisted: we come back in the normal (non-edit) view.
    await t.expect(editButton.exists).ok()
    await t.expect(doneButton.exists).notOk()
})

test('clicking a stat name toggles its checkbox', async (t) => {
    await t.click(editButton)
    await setCategoryExpanded(t, 'main', true)
    await t.expect(populationGroup.checked).ok()

    // Click the name label (not the checkbox itself).
    await t.click(populationGroup.parent('label').find('span'))
    await t.expect(populationGroup.checked).notOk()
})

test('stat extras (plots) can be expanded in edit mode', async (t) => {
    await t.click(editButton)
    await setCategoryExpanded(t, 'main', true)
    const expandToggle = Selector('.stats_table .expand-toggle:not([inert] *)')
    await t.expect(expandToggle.exists).ok()

    await t.click(expandToggle.nth(0))
    await t.expect(Selector('.stats_table .histogram-svg-panel').exists).ok()
})

urbanstatsFixture('article edit mode mobile', `${target}/article.html?longname=California%2C+USA`, async (t) => {
    await t.resizeWindow(400, 800)
})

test('mobile edit mode hides percentile/ordinal/pointer columns', async (t) => {
    await t.click(editButton)
    // Values remain, but the ordinal column (and the other narrow columns) are dropped.
    await t.expect(Selector('.stats_table .testing-statistic-value').exists).ok()
    await t.expect(Selector('.stats_table [data-test-id=statistic-ordinal]').exists).notOk()
    await screencap(t, { fullPage: false })
})

// Staging: reaching an article via a settings link that differs from the saved
// settings should open edit mode automatically and surface the staging controls.
urbanstatsFixture('article edit mode staging', `${target}/article.html?longname=California%2C+USA`, async (t) => {
    // Save a setting first, so the link enters staging instead of silently applying.
    await t.click(Selector('input[data-test-id=use_imperial]'))
    await t.navigateTo(`${target}/article.html?longname=California%2C+USA&s=29ZqGgHgeNSXMA9`)
})

test('edit mode auto-opens in staging, with controls and highlights', async (t) => {
    // Auto-opened into edit mode (filter present)...
    await t.expect(filterBox.exists).ok()
    // ...with the staging box above the table, and no Done button (Discard/Apply replace it).
    await t.expect(tableStagingControls.exists).ok()
    await t.expect(doneButton.exists).notOk()
    // Staged-changed group checkboxes are highlighted.
    await t.expect(Selector('.stats_table input[data-test-highlight=true]').exists).ok()
    await screencap(t)
})

test('applying staged changes also exits edit mode', async (t) => {
    await t.click(Selector('.stats_table button[data-test-id=apply]'))
    await t.expect(tableStagingControls.exists).notOk()
    await t.expect(editButton.exists).ok()
})

test('discarding staged changes also exits edit mode', async (t) => {
    await t.click(Selector('.stats_table button[data-test-id=discard]'))
    await t.expect(tableStagingControls.exists).notOk()
    await t.expect(editButton.exists).ok()
})

// The congressional representatives table is a metadata "extra"; it should render
// below its row in edit mode once the stat is enabled.
urbanstatsFixture('article edit mode congressional', `${target}/article.html?longname=02139%2C+USA`)

const congressionalGroup = Selector('input[data-test-id=edit_group_metadata_show_metadata_congressional_representatives]')
const congressionalWidget = Selector('.stats_table [data-test-id=congressional-representatives]')

test('congressional representatives table shows when the stat is enabled', async (t) => {
    await t.click(editButton)
    await t.typeText(filterBox, 'Congressional')
    await t.expect(congressionalGroup.exists).ok()

    // Unchecked: just the row, no table.
    await t.expect(congressionalWidget.exists).notOk()

    await t.click(congressionalGroup)
    await t.expect(congressionalWidget.exists).ok()
    await screencap(t)
})

// Small regions get election disclaimers; the "!" icon should render in edit mode.
urbanstatsFixture('article edit mode disclaimer', `${target}/article.html?longname=Alpine County%2C+California%2C+USA`)

test('stat disclaimer icon shows in edit mode', async (t) => {
    await t.click(editButton)
    await t.typeText(filterBox, 'Election')
    await t.expect(Selector('.stats_table .disclaimer-toggle').exists).ok()
})
