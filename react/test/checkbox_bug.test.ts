import { categoryCheckbox, enterEditMode, interactableGroupCheckbox, setCategoryExpanded } from './edit_mode_test_utils'
import { target, urbanstatsFixture } from './test_utils'

/**
 * Regression test for https://github.com/kavigupta/urbanstats/issues/1978
 *
 * The Election category contains disjoint groups for US articles
 * (us_presidential_election) and Canadian articles (canada_general_election_*).
 * If the saved indeterminate state for a category only refers to groups that
 * aren't available on the current page, clicking the category checkbox becomes a
 * no-op, and the checkbox can never be checked again.
 */

const electionCheck = categoryCheckbox('election')
const usPresidentialCheck = interactableGroupCheckbox('us_presidential_election')

urbanstatsFixture('cross-page category checkbox', `${target}/article.html?longname=California%2C+USA`, async (t) => {
    await t.resizeWindow(1400, 800)
})

test('election-checkbox-clickable-after-switching-countries', async (t) => {
    // On a US article, select only the US-specific group in the Election category.
    // This saves an indeterminate state of [us_presidential_election].
    await enterEditMode(t)
    await setCategoryExpanded(t, 'election', true)
    await t.click(usPresidentialCheck)
    await t.expect(usPresidentialCheck.checked).eql(true)

    // Switch to a Canadian article, where the Election category contains an
    // entirely different set of groups, none of which are selected.
    await t.navigateTo(`${target}/article.html?longname=Toronto+CDR%2C+Ontario%2C+Canada`)

    await enterEditMode(t)
    await t.expect(electionCheck.checked).eql(false)

    // Clicking the category checkbox should check it, since the saved
    // indeterminate state has nothing to restore on this page.
    await t.click(electionCheck)
    await t.expect(electionCheck.checked).eql(true)
})

test('category-checkbox-affects-groups-from-other-pages', async (t) => {
    /**
     * Stat group settings are global, not per-page, so toggling a category writes to every group
     * in it, including the ones the current page can't show. A category checkbox therefore
     * displays only the groups available on the current page, but acts on all of them.
     *
     * This test pins that down, since scoping the writes to the available groups would look like a
     * reasonable change to make while fixing an unrelated bug.
     */
    await enterEditMode(t)
    await setCategoryExpanded(t, 'election', true)
    await t.click(usPresidentialCheck)
    await t.expect(electionCheck.checked).eql(true)

    await t.navigateTo(`${target}/article.html?longname=Toronto+CDR%2C+Ontario%2C+Canada`)

    // Cycle the category through checked and back to unchecked, using only Canadian groups.
    await enterEditMode(t)
    await t.click(electionCheck)
    await t.expect(electionCheck.checked).eql(true)
    await t.click(electionCheck)
    await t.expect(electionCheck.checked).eql(false)

    await t.navigateTo(`${target}/article.html?longname=California%2C+USA`)

    // The unchecking applied to the US group too, even though it isn't shown on the Canadian page.
    await enterEditMode(t)
    await t.expect(electionCheck.checked).eql(false)
})
