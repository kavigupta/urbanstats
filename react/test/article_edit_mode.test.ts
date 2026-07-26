import { Selector } from 'testcafe'

import { articleTableScope, doneButton, editButton, filterBox, setCategoryExpanded } from './article_edit_test_utils'
import { editModeSharedTests } from './edit_mode_test_template'
import { screencap, target, urbanstatsFixture } from './test_utils'

/**
 * Tests for the article table "edit mode": the statistic category/group checkbox
 * tree replicated directly on the table, plus its extras (plots, disclaimers) and the
 * mobile layout. The behavior it shares with the comparison table's edit mode is in
 * editModeSharedTests.
 */

const californiaPage = `${target}/article.html?longname=California%2C+USA`

const mainCategory = Selector('input[data-test-id=edit_category_main]')
// Population is a single-stat group in the (default-on) Main category.
const populationGroup = Selector('input[data-test-id=edit_group_population]')

urbanstatsFixture('article edit mode', californiaPage)

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

urbanstatsFixture('article edit mode mobile', californiaPage, async (t) => {
    await t.resizeWindow(400, 800)
})

test('mobile edit mode hides percentile/ordinal/pointer columns', async (t) => {
    await t.click(editButton)
    // Values remain, but the ordinal column (and the other narrow columns) are dropped.
    await t.expect(Selector('.stats_table .testing-statistic-value').exists).ok()
    await t.expect(Selector('.stats_table [data-test-id=statistic-ordinal]').exists).notOk()
    await screencap(t, { fullPage: false })
})

// Small regions get election disclaimers; the "!" icon should render in edit mode.
urbanstatsFixture('article edit mode disclaimer', `${target}/article.html?longname=Alpine County%2C+California%2C+USA`)

test('stat disclaimer icon shows in edit mode', async (t) => {
    await t.click(editButton)
    await t.typeText(filterBox, 'Election')
    await t.expect(Selector('.stats_table .disclaimer-toggle').exists).ok()
})

editModeSharedTests({
    name: 'article',
    page: californiaPage,
    scope: articleTableScope,
    congressional: { page: `${target}/article.html?longname=02139%2C+USA`, expectedRegions: [] },
})
