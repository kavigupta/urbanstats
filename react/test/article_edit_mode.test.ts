import { Selector } from 'testcafe'

import { editModeSharedTests } from './edit_mode_test_template'
import { articleTableScope, editButton, filterBox, groupCheckbox, setCategoryExpanded } from './edit_mode_test_utils'
import { resizeForPlatform, screencap, target, urbanstatsFixture } from './test_utils'

/**
 * Tests for the article table "edit mode": the statistic category/group checkbox
 * tree replicated directly on the table, plus its extras (plots, disclaimers) and the
 * mobile layout. The behavior it shares with the comparison table's edit mode is in
 * editModeSharedTests.
 */

const californiaPage = `${target}/article.html?longname=California%2C+USA`

// Population is a single-stat group in the (default-on) Main category.
const populationGroup = groupCheckbox('population')

urbanstatsFixture('article edit mode', californiaPage)

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
    await resizeForPlatform(t, 'mobile')
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
    editButtonLabel: 'Edit',
    congressional: { page: `${target}/article.html?longname=02139%2C+USA`, expectedRegions: [] },
})
