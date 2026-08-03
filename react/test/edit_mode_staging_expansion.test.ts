import { Selector } from 'testcafe'

import { categoryCheckbox, categoryToggleButton, enterEditMode, filterBox, interactableGroupCheckbox, setCategoryExpanded } from './edit_mode_test_utils'
import { getLocation, target, urbanstatsFixture } from './test_utils'

/**
 * A collapsed category on the edit tree shows none of its groups, so a settings link that
 * turns its last selected group off stages a change the category would hide. Edit mode,
 * which opens on its own in staging mode, expands those categories so every staged change
 * is visible.
 *
 * A category with something selected is forced open, so the only way to reach a collapsed
 * category with selections behind it is a link a first-time visitor applies without ever
 * opening edit mode -- which is how the second fixture sets its state up.
 */

const californiaPage = `${target}/article.html?longname=California%2C+USA`

/** A link that differs from the defaults only in having every group of Race on. */
let raceOnLink: string
/** The same link with Race back off, so visiting it from `raceOnLink` stages Race off. */
let raceOffLink: string

urbanstatsFixture('generate links that turn a category on and off', californiaPage)

test('turning a category on and off again produces links that carry it', async (t) => {
    await enterEditMode(t)
    await t.click(categoryCheckbox('race'))
    raceOnLink = await getLocation()

    await t.click(categoryCheckbox('race'))
    raceOffLink = await getLocation()
})

urbanstatsFixture('visit link that empties a collapsed category', californiaPage, async (t) => {
    // A first-time visitor, so the link is applied silently rather than staged, and Race ends
    // up selected without edit mode ever having been opened to expand it.
    await t.navigateTo(raceOnLink)
    // Making a change saves those settings, so the next link stages against them.
    await t.click(Selector('input[data-test-id=use_imperial]'))

    await t.navigateTo(raceOffLink)
})

test('the category hiding a staged change is expanded', async (t) => {
    await t.expect(Selector('[data-test-id=staging_controls]').exists).ok()
    // Edit mode auto-opened, and Race with it, since collapsed it would show no sign of the
    // groups staging turns off.
    await t.expect(filterBox.exists).ok()
    await t.expect(categoryToggleButton('race', 'Collapse').exists).ok()

    const hispanic = interactableGroupCheckbox('hispanic')
    await t.expect(hispanic.checked).notOk()
    await t.expect(hispanic.getAttribute('data-test-highlight')).eql('true')
})

test('categories with nothing staged behind them stay collapsed', async (t) => {
    await t.expect(categoryToggleButton('housing', 'Expand').exists).ok()
})

test('the expanded category can be collapsed again while staging', async (t) => {
    await setCategoryExpanded(t, 'race', false)

    await t.expect(categoryToggleButton('race', 'Expand').exists).ok()
    await t.expect(interactableGroupCheckbox('hispanic').exists).notOk()
})
