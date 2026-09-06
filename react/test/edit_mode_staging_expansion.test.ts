import { Selector } from 'testcafe'

import { categoryToggleButton, enterEditMode, filterBox, interactableGroupCheckbox, setCategoryExpanded } from './edit_mode_test_utils'
import { getLocation, target, urbanstatsFixture } from './test_utils'

/**
 * Edit mode opens a category iff something in it is selected, so a settings link that turns off
 * a category's only selected group would leave it closed with nothing to show for the staged
 * change. The highlighted group counts as a reason to open too.
 */

const californiaPage = `${target}/article.html?longname=California%2C+USA`

const stagingControls = Selector('[data-test-id=staging_controls]')
const vacancy = interactableGroupCheckbox('vacancy')

let vacancyOffLink: string

urbanstatsFixture('generate link with an unselected group', californiaPage)

test('a link records Vacancy as unselected', async (t) => {
    await enterEditMode(t)
    await setCategoryExpanded(t, 'housing', true)
    await t.click(vacancy)
    await t.click(vacancy)

    vacancyOffLink = await getLocation()
})

urbanstatsFixture('visit that link with Vacancy selected', californiaPage, async (t) => {
    await enterEditMode(t)
    await setCategoryExpanded(t, 'housing', true)
    await t.click(vacancy)

    await t.navigateTo(vacancyOffLink)
})

test('the category whose only selection is staged off is expanded', async (t) => {
    await t.expect(stagingControls.exists).ok()
    await t.expect(filterBox.exists).ok()
    await t.expect(categoryToggleButton('housing', 'Collapse').exists).ok()

    await t.expect(vacancy.checked).notOk()
    await t.expect(vacancy.getAttribute('data-test-highlight')).eql('true')
})

test('categories with nothing staged behind them stay collapsed', async (t) => {
    await t.expect(categoryToggleButton('race', 'Expand').exists).ok()
})
