import { Selector } from 'testcafe'

import { categoryCheckbox, categoryToggleButton, enterEditMode, exitEditMode, filterBox, groupCheckbox, groupMemberRow, groupWarning, interactableGroupCheckbox, setCategoryExpanded, sourceCheckbox, yearCheckbox } from './edit_mode_test_utils'
import { clickUniverseFlag, getLocation, resizeForPlatform, safeReload, screencap, target, uncheckAllCategories, urbanstatsFixture, warningRowNames } from './test_utils'

const mainCheck = categoryCheckbox('main')
// Population is a single-stat group, so its checkbox sits directly on the Population row.
const populationCheck = groupCheckbox('population')
// A collapsed category keeps its unselected rows mounted (so the height transition has
// content) but marks them inert, so clicking one needs the interactable variant.
const populationCheckInteractable = interactableGroupCheckbox('population')
// Main has no toggle at all until something in it is unselected, and opens expanded since
// its groups are selected, so the toggle it then grows offers to collapse.
const mainExpandButton = categoryToggleButton('main', 'Expand')
const mainCollapseButton = categoryToggleButton('main', 'Collapse')
// Housing is off by default, so it always has something behind its toggle.
const housingCheck = categoryCheckbox('housing')
const housingExpandButton = categoryToggleButton('housing', 'Expand')
const housingCollapseButton = categoryToggleButton('housing', 'Collapse')
const vacancyCheckInteractable = interactableGroupCheckbox('vacancy')
const renterCheckInteractable = interactableGroupCheckbox('rent_or_own_rent')
const sourceSectionHeader = Selector('.stats_table div').withExactText('Population Sources')
const ghslCheck = sourceCheckbox('Population', 'GHSL')
const year2020Check = yearCheckbox(2020)
const year2010Check = yearCheckbox(2010)

function populationRow(name: string): Selector {
    return groupMemberRow('population', name)
}

export function articleEditTreeTest(platform: 'mobile' | 'desktop'): void {
    const platformFixture = (name: string, url: string): void => {
        urbanstatsFixture(name, url, async (t) => {
            await resizeForPlatform(t, platform)
        })
    }

    platformFixture('article edit tree', `${target}/article.html?longname=San+Francisco+city%2C+California%2C+USA`)

    test('category-check', async (t) => {
        /**
         * Check that the category checks and unchecks correctly.
         */
        await enterEditMode(t)
        await t.expect(mainCheck.checked).eql(true)
        // Every group in Main is selected, so there is nothing for a toggle to reveal.
        await t.expect(mainExpandButton.exists).notOk()
        await t.click(mainCheck)
        await t.expect(mainCheck.checked).eql(false)
        await t.expect(mainCollapseButton.exists).ok()
        await t.click(mainCheck)
        await t.expect(mainCheck.checked).eql(true)
    })

    test('checking-a-category-expands-it', async (t) => {
        /**
         * Checking a category selects every group, so nothing is behind the toggle at that
         * moment -- but the category is left expanded, so the groups stay on display as soon as
         * one of them is turned off again.
         */
        await enterEditMode(t)
        await t.expect(housingExpandButton.exists).ok()
        await t.expect(vacancyCheckInteractable.exists).notOk()

        await t.click(housingCheck)
        await t.expect(housingCheck.checked).eql(true)
        await t.expect(housingExpandButton.exists).notOk()

        await t.click(vacancyCheckInteractable)
        await t.expect(housingCheck.indeterminate).eql(true)
        await t.expect(housingCollapseButton.exists).ok()
        await t.expect(vacancyCheckInteractable.checked).eql(false)
    })

    test('restoring-a-saved-selection-expands-the-category', async (t) => {
        /**
         * The unchecked -> indeterminate step of the cycle brings back a selection made before,
         * which a collapsed category would show no sign of.
         */
        await enterEditMode(t)
        await setCategoryExpanded(t, 'housing', true)
        await t.click(vacancyCheckInteractable)
        // Round the cycle to unchecked, then undo the expansion the checking did.
        await t.click(housingCheck)
        await t.click(housingCheck)
        await t.expect(housingCheck.checked).eql(false)
        await setCategoryExpanded(t, 'housing', false)

        await t.click(housingCheck)
        await t.expect(housingCheck.indeterminate).eql(true)
        await t.expect(housingCollapseButton.exists).ok()
        await t.expect(vacancyCheckInteractable.checked).eql(true)
        // The groups the restored selection leaves out are what the expansion is for.
        await t.expect(renterCheckInteractable.exists).ok()
        await t.expect(renterCheckInteractable.checked).eql(false)
    })

    test('unchecking-a-category-leaves-the-expansion-alone', async (t) => {
        /**
         * Unchecking is the one step of the cycle that doesn't expand -- it puts nothing on
         * display that the user asked to see -- and it doesn't collapse either.
         */
        await enterEditMode(t)
        await t.click(mainCheck)
        await t.expect(mainCheck.checked).eql(false)
        await t.expect(mainCollapseButton.exists).ok()
        await setMainExpanded(t, false)

        await t.click(mainCheck)
        await t.click(mainCheck)
        await t.expect(mainCheck.checked).eql(false)
        await t.expect(mainCollapseButton.exists).ok()
        await t.expect(populationCheckInteractable.exists).ok()
    })

    test('indeterminate-cycle-expanded', async (t) => {
        /**
         * Check that the category, when expanded, cycles between indeterminate -> true -> false -> indeterminate states
         */
        await enterEditMode(t)
        await t.click(populationCheckInteractable)
        await t.expect(populationCheck.checked).eql(false)
        await t.expect(mainCheck.indeterminate).eql(true)
        await screencap(t)

        await t.click(mainCheck)
        await t.expect(mainCheck.indeterminate).eql(false)
        await t.expect(mainCheck.checked).eql(true)
        await t.expect(populationCheck.checked).eql(true)

        await t.click(mainCheck)
        await t.expect(mainCheck.indeterminate).eql(false)
        await t.expect(mainCheck.checked).eql(false)
        await t.expect(populationCheck.checked).eql(false)

        await t.click(mainCheck)
        await t.expect(mainCheck.indeterminate).eql(true)
        await t.expect(populationCheck.checked).eql(false)
    })

    test('indeterminate-cycle-collapsed', async (t) => {
        /**
         * Check that the category, when collapsed, cycles between indeterminate -> true -> false -> indeterminate states.
         * The effect on the article is observed by leaving edit mode, since an expanded edit
         * tree shows every row regardless of whether its group is enabled.
         */
        const populationStat = Selector('a').withExactText('Population')

        await enterEditMode(t)
        await t.click(populationCheckInteractable)
        await t.expect(mainCheck.indeterminate).eql(true)
        await setMainExpanded(t, false)
        await t.expect(populationCheckInteractable.exists).notOk()
        if (platform === 'mobile') {
            await screencap(t)
        }
        await exitEditMode(t)
        await t.expect(populationStat.exists).notOk()
        await screencap(t)

        await enterEditMode(t)
        await t.click(mainCheck)
        await t.expect(mainCheck.indeterminate).eql(false)
        await t.expect(mainCheck.checked).eql(true)
        await exitEditMode(t)
        await t.expect(populationStat.exists).ok()

        await enterEditMode(t)
        await t.click(mainCheck)
        await t.expect(mainCheck.indeterminate).eql(false)
        await t.expect(mainCheck.checked).eql(false)
        await exitEditMode(t)
        await t.expect(populationStat.exists).notOk()

        await enterEditMode(t)
        await t.click(mainCheck)
        await t.expect(mainCheck.indeterminate).eql(true)
        await exitEditMode(t)
        await t.expect(populationStat.exists).notOk()
    })

    test('indeterminate-exit-check', async (t) => {
        /**
         * Check than when a category enters an indeterminate state, it can come out of that state when its groups become uniformly checked.
         */
        await enterEditMode(t)
        await t.click(populationCheckInteractable)
        await t.expect(populationCheck.checked).eql(false)
        await t.expect(mainCheck.indeterminate).eql(true)

        await t.click(populationCheckInteractable)
        await t.expect(mainCheck.indeterminate).eql(false)
        await t.expect(mainCheck.checked).eql(true)
        await t.expect(populationCheck.checked).eql(true)

        await t.click(mainCheck)
        await t.expect(mainCheck.indeterminate).eql(false)
        await t.expect(mainCheck.checked).eql(false)
        await t.expect(populationCheck.checked).eql(false)
    })

    test('indeterminate-exit-uncheck', async (t) => {
        /**
         * Check than when a category enters an indeterminate state, it can come out of that state when its groups become uniformly unchecked.
         */
        await enterEditMode(t)
        await t.click(mainCheck)
        await t.expect(mainCheck.checked).eql(false)
        await t.click(populationCheckInteractable)
        await t.expect(populationCheck.checked).eql(true)
        await t.expect(mainCheck.indeterminate).eql(true)

        await t.click(populationCheckInteractable)
        await t.expect(mainCheck.indeterminate).eql(false)
        await t.expect(mainCheck.checked).eql(false)
        await t.expect(populationCheck.checked).eql(false)

        await t.click(mainCheck)
        await t.expect(mainCheck.indeterminate).eql(false)
        await t.expect(mainCheck.checked).eql(true)
    })

    test('uncheck-all-categories', async (t) => {
        await enterEditMode(t)
        await uncheckAllCategories(t)
        // The tree itself is how the user fixes this, so the warning would just be in the way.
        await t.expect(Selector('b').withExactText('No Statistics are selected').exists).notOk()
        await screencap(t)
        await exitEditMode(t)
        await t.expect(Selector('b').withExactText('No Statistics are selected').exists).ok()
    })

    test('missing-year-warning', async (t) => {
        // Deselecting a year has to put the warning on the edit table too, in the row of the
        // group it leaves empty.
        await enterEditMode(t)
        await uncheckAllCategories(t)
        await t.click(mainCheck)
        await t.click(year2020Check)
        await t.expect(groupWarning('population').innerText).eql('Select 2020, 2010, or 2000 to see this statistic.')
        await screencap(t)
    })

    test('warning-row-placement', async (t) => {
        /**
         * Main's groups that have years warn, and its year-less groups still show values. On the
         * article itself the warnings belong in the rows those statistics would have occupied --
         * above Area -- rather than all together below the table.
         */
        await enterEditMode(t)
        await uncheckAllCategories(t)
        await t.click(mainCheck)
        await t.click(year2020Check)
        await exitEditMode(t)

        await t.expect(await warningRowNames()).eql(['Population', 'PW Density (r=1km)', 'AW Density'])
        const rows = Selector('.for-testing-table-row')
        await t.expect(rows.nth(0).find('[data-test-id=article-warning]').exists).ok()
        await t.expect(rows.nth(3).find('[data-test-id=article-warning]').exists).notOk()
        await t.expect(rows.nth(3).find('a').withExactText('Area').exists).ok()
    })

    test('missing-year-data', async (t) => {
        // A group whose statistics only exist for an unselected year is called out, rather
        // than silently showing nothing.
        await enterEditMode(t)
        await uncheckAllCategories(t)
        await t.click(year2020Check)
        await t.click(year2010Check)
        await t.click(categoryCheckbox('health'))
        await t.expect(groupWarning('GHLTH_cdc_2').innerText).eql('Select 2020 to see this statistic.')
        await screencap(t)
    })

    test('missing-partial-year-data', async (t) => {
        // The same warning at group granularity, for a category where only some of the
        // selected groups are missing the selected year.
        await enterEditMode(t)
        await uncheckAllCategories(t)
        await setCategoryExpanded(t, 'housing', true)
        await t.click(vacancyCheckInteractable)
        await t.click(renterCheckInteractable)
        await t.click(year2020Check)
        await t.click(year2010Check)
        await t.expect(groupWarning('rent_or_own_rent').innerText).eql('Select 2020 to see this statistic.')
        await screencap(t)
    })

    test('group-with-no-selected-years-stays-on-the-edit-tree', async (t) => {
        // The row stays on the edit tree -- otherwise there'd be no checkbox to reach the
        // group by -- with a warning where its value would be.
        await enterEditMode(t)
        await setCategoryExpanded(t, 'housing', true)
        await t.click(year2020Check)
        await t.click(year2010Check)

        await t.expect(renterCheckInteractable.exists).ok()
        await t.expect(renterCheckInteractable.parent('.for-testing-table-row').find('.testing-statistic-value').exists).notOk()
        await t.expect(groupWarning('rent_or_own_rent').exists).ok()
        await screencap(t)

        // Selecting the group doesn't put the row on the article itself, which only shows
        // statistics it has values for.
        await t.click(renterCheckInteractable)
        await exitEditMode(t)
        await t.expect(Selector('[data-test-id=statistic-link]').withExactText('Renter %').exists).notOk()
    })

    test('year-section', async (t) => {
        // This article's population comes from a single source, so it gets no source section.
        await enterEditMode(t)
        await t.expect(sourceSectionHeader.exists).notOk()
        await t.expect(year2020Check.checked).eql(true)
        await screencap(t)

        await t.click(year2020Check)
        await t.expect(year2020Check.checked).eql(false)
    })

    test('year-selection-changes-the-edit-table-itself', async (t) => {
        // The edit tree shows every group regardless of whether it's enabled, but it still
        // respects the year selection. Population then spans two years, so it stops collapsing
        // into a single row and splits into one row per year.
        await enterEditMode(t)
        await t.expect(populationRow('2010').exists).notOk()

        await t.click(year2010Check)
        await t.expect(populationRow('2010').exists).ok()
        await t.expect(populationRow('2020').exists).ok()
        await screencap(t)

        await exitEditMode(t)
        await t.expect(Selector('a').withExactText('2010').exists).ok()
        await screencap(t)
    })

    test('staged-year-change-is-highlighted', async (t) => {
        // The year rows are new controls on the table, so staging has to highlight them too --
        // otherwise a settings link that only changes a year would auto-open edit mode showing
        // nothing about what's pending.
        await enterEditMode(t)
        await t.click(year2010Check)
        const linkWith2010 = await getLocation()
        await t.click(year2010Check)

        // The saved settings now differ from the link, so this enters staging (and edit mode).
        await t.navigateTo(linkWith2010)
        await t.expect(filterBox.exists).ok()
        await t.expect(year2010Check.getAttribute('data-test-highlight')).eql('true')
        await screencap(t)
    })

    test('indeterminate-persistence', async (t) => {
        // Edit mode itself is ephemeral, but the selections made in it are settings.
        await enterEditMode(t)
        await t.click(populationCheckInteractable)
        await safeReload(t)
        await enterEditMode(t)
        await t.expect(populationCheck.checked).eql(false)
        await t.expect(mainCheck.indeterminate).eql(true)
    })

    test('hidden-indeterminate-persistence', async (t) => {
        /**
         * Makes an indeterminate selection, hides that indeterminate selection by clicking the category
         * Then checks that the hidden selection persists through page reload
         */
        await enterEditMode(t)
        await t.click(populationCheckInteractable)
        await t.click(mainCheck)
        await safeReload(t)
        await enterEditMode(t)
        await t.expect(mainCheck.checked).eql(true)
        await t.expect(mainCheck.indeterminate).eql(false)
        await t.click(mainCheck)
        await t.click(mainCheck)
        await t.expect(populationCheck.checked).eql(false)
        await t.expect(mainCheck.indeterminate).eql(true)
    })

    test('expansion-follows-the-selection-when-edit-mode-opens', async (t) => {
        /**
         * Nothing in Housing is selected, so it opens collapsed however it was left; Main, whose
         * groups are selected, opens expanded so an unchecked one stays on display.
         */
        await enterEditMode(t)
        await setCategoryExpanded(t, 'housing', true)
        await t.expect(vacancyCheckInteractable.visible).eql(true)
        await exitEditMode(t)

        await enterEditMode(t)
        await t.expect(housingExpandButton.exists).ok()
        await t.click(populationCheckInteractable)
        await t.expect(mainCollapseButton.exists).ok()
    })

    test('search-smoke', async (t) => {
        // Filtering expands the matching categories, so a group in an otherwise collapsed
        // category becomes reachable, and hides the expand buttons.
        await enterEditMode(t)
        await t.typeText(filterBox, 'gene')
        await t.expect(interactableGroupCheckbox('generation_genx').exists).ok()
        await t.expect(mainCheck.exists).notOk()
        await t.expect(Selector('.stats_table [aria-label$="category"]').exists).notOk()
        await screencap(t)

        await t.selectText(filterBox).pressKey('delete')
        await t.expect(mainCheck.exists).ok()
        // Filtering doesn't leave the categories it expanded expanded.
        await t.expect(housingExpandButton.exists).ok()
    })

    platformFixture('article edit tree filtering', `${target}/article.html?longname=Venice+Neighborhood%2C+Los+Angeles+City%2C+California%2C+USA`)

    test('search-filter', async (t) => {
        // Groups that don't exist for an article don't show up in the edit tree
        await enterEditMode(t)
        await t.typeText(filterBox, 'median')
        await t.expect(categoryCheckbox('income').exists).notOk()
    })

    // States have population from both the US Census and GHSL, so they're the articles that
    // get a source section to choose between them.
    platformFixture('article edit tree sources', `${target}/article.html?longname=California%2C+USA`)

    test('source-section', async (t) => {
        // Like the years, the sources sit above the tree, so the search box doesn't filter them.
        await enterEditMode(t)
        await t.expect(ghslCheck.checked).eql(false)
        await screencap(t)

        await t.click(ghslCheck)
        await t.expect(ghslCheck.checked).eql(true)

        await t.typeText(filterBox, 'gene')
        await t.expect(sourceSectionHeader.exists).ok()
        await t.expect(ghslCheck.exists).ok()
    })

    test('source-selection-changes-the-edit-table-itself', async (t) => {
        // The year counterpart of this splits Population by year; a second source splits it by
        // source instead, so the rows say which source they came from.
        await enterEditMode(t)
        await t.expect(populationRow('2020 [GHSL]').exists).notOk()

        await t.click(ghslCheck)
        await t.expect(populationRow('2020 [GHSL]').exists).ok()
        await t.expect(populationRow('2020 [US Census]').exists).ok()
        await screencap(t)
    })

    /** Universe Tests */

    platformFixture('article edit tree universe test', `${target}/article.html?longname=USA`)

    test('switch-universe-indeterminate', async (t) => {
        /**
         * Makes an indeterminate selection in the Main category, then switch to a different universe. The set of
         * statistics is the same regardless of universe, so the indeterminate selection should persist.
         */
        await enterEditMode(t)
        await t.click(populationCheckInteractable)
        await t.expect(mainCheck.indeterminate).eql(true)

        await selectUniverse(t, 'North America')
        await enterEditMode(t)
        await t.expect(mainCheck.indeterminate).eql(true)
        await screencap(t)

        await selectUniverse(t, 'USA')
        await enterEditMode(t)
        await t.expect(mainCheck.indeterminate).eql(true)
    })
}

async function selectUniverse(t: TestController, alt: string): Promise<void> {
    await t.click(Selector('img').withAttribute('class', 'universe-selector'))
    await clickUniverseFlag(t, alt)
}

async function setMainExpanded(t: TestController, expanded: boolean): Promise<void> {
    await setCategoryExpanded(t, 'main', expanded)
}
