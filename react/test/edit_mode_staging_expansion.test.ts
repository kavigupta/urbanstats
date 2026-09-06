import { Selector } from 'testcafe'

import { categoryToggleButton, enterEditMode, filterBox, interactableGroupCheckbox, setCategoryExpanded, setSubcategoryExpanded, subcategoryToggleButton } from './edit_mode_test_utils'
import { getLocation, target, urbanstatsFixture } from './test_utils'

/**
 * Edit mode opens a category iff something in it is selected, so a settings link that turns off
 * a category's only selected group would leave it closed with nothing to show for the staged
 * change. The highlighted group counts as a reason to open too.
 */

const californiaPage = `${target}/article.html?longname=California%2C+USA`

const stagingControls = Selector('[data-test-id=staging_controls]')
const vacancy = interactableGroupCheckbox('vacancy')
const hispanic = interactableGroupCheckbox('hispanic')

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

let hispanicOffLink: string

urbanstatsFixture('generate link with an unselected group inside a subcategory', californiaPage)

test('a link records Hispanic as unselected', async (t) => {
    await enterEditMode(t)
    await setCategoryExpanded(t, 'race', true)
    await setSubcategoryExpanded(t, 'race_composition', true)
    await t.click(hispanic)
    await t.click(hispanic)

    hispanicOffLink = await getLocation()
})

urbanstatsFixture('visit that link with Hispanic selected', californiaPage, async (t) => {
    await enterEditMode(t)
    await setCategoryExpanded(t, 'race', true)
    await setSubcategoryExpanded(t, 'race_composition', true)
    await t.click(hispanic)

    await t.navigateTo(hispanicOffLink)
})

test('the subcategory whose only selection is staged off is expanded along with its category', async (t) => {
    await t.expect(stagingControls.exists).ok()
    await t.expect(categoryToggleButton('race', 'Collapse').exists).ok()
    await t.expect(subcategoryToggleButton('race_composition', 'Collapse').exists).ok()

    await t.expect(hispanic.checked).notOk()
    await t.expect(hispanic.getAttribute('data-test-highlight')).eql('true')
})
