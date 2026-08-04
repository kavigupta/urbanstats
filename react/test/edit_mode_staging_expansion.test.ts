import { Selector } from 'testcafe'

import { categoryToggleButton, ensureCategoryCollapsed, ensureCategoryExpanded, enterEditMode, filterBox, interactableGroupCheckbox, setCategoryExpanded } from './edit_mode_test_utils'
import { getLocation, target, urbanstatsFixture } from './test_utils'

/**
 * A collapsed category on the edit tree shows only its selected groups, so a settings link
 * that turns a group off stages a change that the category would hide. Edit mode, which
 * opens on its own in staging mode, expands those categories so every staged change is
 * visible.
 */

const californiaPage = `${target}/article.html?longname=California%2C+USA`

/** A link that differs from the defaults only in having Population, a group of Main, off. */
let populationOffLink: string

urbanstatsFixture('generate link that turns off a group', californiaPage)

test('turning off a group produces a link that carries it', async (t) => {
    await enterEditMode(t)
    await ensureCategoryExpanded(t, 'main')
    await t.click(interactableGroupCheckbox('population'))

    populationOffLink = await getLocation()
})

urbanstatsFixture('visit link that turns off a group in a collapsed category', californiaPage, async (t) => {
    // A visitor with saved settings, so the link stages its changes rather than silently
    // applying them the way it would for a first-time visitor.
    await t.click(Selector('input[data-test-id=use_imperial]'))
    await enterEditMode(t)
    await ensureCategoryCollapsed(t, 'main')

    await t.navigateTo(populationOffLink)
})

test('the category hiding a staged change is expanded', async (t) => {
    await t.expect(Selector('[data-test-id=staging_controls]').exists).ok()
    // Edit mode auto-opened, and Main with it, since collapsed it would show no sign of the
    // group staging turns off.
    await t.expect(filterBox.exists).ok()
    await t.expect(categoryToggleButton('main', 'Collapse').exists).ok()

    const population = interactableGroupCheckbox('population')
    await t.expect(population.checked).notOk()
    await t.expect(population.getAttribute('data-test-highlight')).eql('true')
})

test('categories with nothing staged behind them stay collapsed', async (t) => {
    await t.expect(categoryToggleButton('race', 'Expand').exists).ok()
})

test('the expanded category can be collapsed again while staging', async (t) => {
    await setCategoryExpanded(t, 'main', false)

    await t.expect(categoryToggleButton('main', 'Expand').exists).ok()
    await t.expect(interactableGroupCheckbox('population').exists).notOk()
})
