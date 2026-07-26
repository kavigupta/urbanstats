import { Selector } from 'testcafe'

import { categoryCheckbox, categoryToggleButton, enterEditMode, exitEditMode, filterBox, groupCheckbox, groupMemberRow, interactableGroupCheckbox, setCategoryExpanded, sourceCheckbox, yearCheckbox } from './edit_mode_test_utils'
import { clickUniverseFlag, getLocation, resizeForPlatform, safeReload, screencap, target, uncheckAllCategories, urbanstatsFixture } from './test_utils'

/**
 * The article table's edit mode is where the statistic category/group tree lives: the
 * category/group checkbox semantics (indeterminate cycling, saved indeterminate state,
 * persistence, search), the source and year selections above the tree, and the warnings
 * the article shows when a selection leaves it with nothing to display.
 */

const mainCheck = categoryCheckbox('main')
// Population is a single-stat group in the (default-on) Main category, so its
// checkbox sits directly on the Population row.
const populationCheck = groupCheckbox('population')
// Collapsed categories stay mounted (so the height transition has content) but are
// marked inert, so clicking requires the interactable variant.
const populationCheckInteractable = interactableGroupCheckbox('population')
// Present only while Main is collapsed, since the toggle then offers to expand.
const mainExpandButton = categoryToggleButton('main', 'Expand')
// The source and year sections above the tree.
const sourceSectionHeader = Selector('.stats_table div').withExactText('Population Sources')
const ghslCheck = sourceCheckbox('Population', 'GHSL')
const year2020Check = yearCheckbox(2020)
const year2010Check = yearCheckbox(2010)

/** A statistic row of the Population group, by the name it displays. */
function populationRow(name: string): Selector {
    return groupMemberRow('population', name)
}

export function articleEditTreeTest(platform: 'mobile' | 'desktop'): void {
    urbanstatsFixture('article edit tree', `${target}/article.html?longname=San+Francisco+city%2C+California%2C+USA`, async (t) => {
        await resizeForPlatform(t, platform)
    })

    test('category-check', async (t) => {
        /**
         * Check that the category checks and unchecks correctly without being expanded.
         */
        await enterEditMode(t)
        await t.expect(mainCheck.checked).eql(true)
        await t.click(mainCheck)
        await t.expect(mainCheck.checked).eql(false)
        await t.click(mainCheck)
        await t.expect(mainCheck.checked).eql(true)
    })

    test('indeterminate-cycle-expanded', async (t) => {
        /**
         * Check that the category, when expanded, cycles between indeterminate -> true -> false -> indeterminate states
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
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
         * The effect on the article is observed by leaving edit mode, since the edit tree
         * itself shows every row regardless of whether its group is enabled.
         */
        const populationStat = Selector('a').withExactText('Population')

        await enterEditMode(t)
        await setMainExpanded(t, true)
        await t.click(populationCheckInteractable)
        await setMainExpanded(t, false)
        await t.expect(mainCheck.indeterminate).eql(true)
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
        await setMainExpanded(t, true)
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
        await setMainExpanded(t, true)
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
        // The warning renders inside the edit table, not just the normal one.
        await t.expect(Selector('.stats_table b').withExactText('No Statistic Categories are selected').exists).ok()
        await screencap(t)
        await exitEditMode(t)
        await t.expect(Selector('b').withExactText('No Statistic Categories are selected').exists).ok()
    })

    test('missing-year-warning', async (t) => {
        /**
         * Deselecting a year has to reach the edit table's own copy of ArticleWarnings.
         */
        await enterEditMode(t)
        await uncheckAllCategories(t)
        await t.click(mainCheck)
        await t.click(year2020Check)
        await t.expect(Selector('.stats_table li').withExactText('To see Main > Population statistics, select 2020, 2010, or 2000.').exists).ok()
        await screencap(t)
    })

    test('missing-year-data', async (t) => {
        /**
         * A category whose statistics only exist for a year that isn't selected is
         * called out by name, rather than silently showing nothing.
         */
        await enterEditMode(t)
        await uncheckAllCategories(t)
        await t.click(year2020Check)
        await t.click(year2010Check)
        await t.click(categoryCheckbox('health'))
        await t.expect(Selector('.stats_table li').withExactText('To see Health statistics, select 2020.').exists).ok()
        await screencap(t)
    })

    test('missing-partial-year-data', async (t) => {
        /**
         * The same warning at group granularity, for a category where only some of the
         * selected groups are missing the selected year. The groups have to be picked
         * before the year is switched: the edit tree only lists groups that have rows for
         * the selected years, so Renter % is gone from it by the time the warning appears.
         */
        await enterEditMode(t)
        await uncheckAllCategories(t)
        await setCategoryExpanded(t, 'housing', true)
        await t.click(interactableGroupCheckbox('vacancy'))
        await t.click(interactableGroupCheckbox('rent_or_own_rent'))
        await t.click(year2020Check)
        await t.click(year2010Check)
        await t.expect(Selector('.stats_table li').withExactText('To see Housing > Renter % statistics, select 2020.').exists).ok()
        await screencap(t)
    })

    test('year-section', async (t) => {
        /**
         * The year selection sits above the tree, not in it. This article's population comes
         * from a single source, so it gets no source section.
         */
        await enterEditMode(t)
        await t.expect(sourceSectionHeader.exists).notOk()
        await t.expect(year2020Check.checked).eql(true)
        await screencap(t)

        await t.click(year2020Check)
        await t.expect(year2020Check.checked).eql(false)
    })

    test('year-selection-changes-the-edit-table-itself', async (t) => {
        /**
         * The edit tree shows every group regardless of whether it's enabled, but it still
         * respects the year selection, so selecting a year has to add that year's rows to the
         * table the checkbox lives on. Population then spans two years, so it stops collapsing
         * into a single row and splits into one row per year.
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
        await t.expect(populationRow('2010').exists).notOk()

        await t.click(year2010Check)
        await t.expect(populationRow('2010').exists).ok()
        await t.expect(populationRow('2020').exists).ok()
        await screencap(t)

        // and on the article itself, once edit mode is out of the way
        await exitEditMode(t)
        await t.expect(Selector('a').withExactText('2010').exists).ok()
        await screencap(t)
    })

    test('staged-year-change-is-highlighted', async (t) => {
        /**
         * Staging highlights the controls whose values it's changing. The year rows are new
         * controls on the table, so they need that highlight too -- otherwise arriving via a
         * settings link that only changes a year would auto-open edit mode showing nothing
         * about what's pending.
         */
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
        /**
         * Edit mode itself is ephemeral, but the selections made in it are settings and must persist.
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
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
        await setMainExpanded(t, true)
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

    test('expand-persistence', async (t) => {
        /**
         * Expansion is a setting, so it outlives edit mode (which is ephemeral) and the page.
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
        await exitEditMode(t)
        await enterEditMode(t)
        await t.expect(populationCheckInteractable.visible).eql(true)
        await safeReload(t)
        await enterEditMode(t)
        await t.expect(populationCheckInteractable.visible).eql(true)
    })

    test('search-smoke', async (t) => {
        /**
         * Filtering expands the matching categories, so a group in an otherwise
         * collapsed category becomes reachable, and hides the expand buttons.
         */
        await enterEditMode(t)
        await t.typeText(filterBox, 'gene')
        await t.expect(interactableGroupCheckbox('generation_genx').exists).ok()
        await t.expect(mainCheck.exists).notOk()
        await t.expect(Selector('.stats_table [aria-label$="category"]').exists).notOk()
        await screencap(t)

        await t.selectText(filterBox).pressKey('delete')
        await t.expect(mainCheck.exists).ok()
        // Filtering doesn't leave the categories it expanded expanded.
        await t.expect(mainExpandButton.exists).ok()
    })

    urbanstatsFixture('article edit tree filtering', `${target}/article.html?longname=Venice+Neighborhood%2C+Los+Angeles+City%2C+California%2C+USA`, async (t) => {
        await resizeForPlatform(t, platform)
    })

    test('search-filter', async (t) => {
        // Groups that don't exist for an article don't show up in the edit tree
        await enterEditMode(t)
        await t.typeText(filterBox, 'median')
        await t.expect(categoryCheckbox('income').exists).notOk()
    })

    // States have population from both the US Census and GHSL, so they're the articles that
    // get a source section to choose between them.
    urbanstatsFixture('article edit tree sources', `${target}/article.html?longname=California%2C+USA`, async (t) => {
        await resizeForPlatform(t, platform)
    })

    test('source-section', async (t) => {
        /**
         * Like the years, the sources sit above the tree, and the search box doesn't
         * filter them out.
         */
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
        /**
         * The year counterpart of this, on the other fixture, splits Population by year.
         * Enabling a second source splits it by source instead, so the rows say which source
         * they came from.
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
        await t.expect(populationRow('2020 [GHSL]').exists).notOk()

        await t.click(ghslCheck)
        await t.expect(populationRow('2020 [GHSL]').exists).ok()
        await t.expect(populationRow('2020 [US Census]').exists).ok()
        await screencap(t)
    })

    /** Universe Tests */

    urbanstatsFixture('article edit tree universe test', `${target}/article.html?longname=USA`, async (t) => {
        await resizeForPlatform(t, platform)
    })

    test('switch-universe-indeterminate', async (t) => {
        /**
         * Makes an indeterminate selection in the Main category, then switch to a different universe. The set of
         * statistics is the same regardless of universe, so the indeterminate selection should persist.
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
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
