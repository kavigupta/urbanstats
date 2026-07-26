import { Selector } from 'testcafe'

import { editModeSharedTests } from './edit_mode_test_template'
import { articleTableScope, editButton, filterBox, groupCheckbox, setCategoryExpanded } from './edit_mode_test_utils'
import { target, urbanstatsFixture } from './test_utils'

/**
 * Tests for what the article table's "edit mode" -- the statistic category/group checkbox
 * tree replicated directly on the table -- does that the comparison table's doesn't. The
 * behavior the two share is in editModeSharedTests.
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
    // A single column, so its plot has only the one unnamed series.
    expectedPlotSeries: [],
    congressional: {
        page: `${target}/article.html?longname=02139%2C+USA`,
        // The article's single region, which the widget heads its one column with.
        expectedRegions: ['02139'],
    },
})
