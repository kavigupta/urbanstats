import { Selector } from 'testcafe'

import { categoryToggleButton, collapseAnimationMs, enterEditMode, exitEditMode, filterBox, setCategoryExpanded } from './article_edit_test_utils'
import { checkIsIndeterminate, clickUniverseFlag, resizeForPlatform, safeReload, screencap, target, uncheckAllCategories, urbanstatsFixture, withHamburgerMenu } from './test_utils'

/**
 * The article table's edit mode replicates the statistic category/group tree that
 * lives in the sidebar (StatsTree.tsx). These tests are the edit-mode counterparts
 * of stats_tree_test_template.ts: the same category/group checkbox semantics
 * (indeterminate cycling, saved indeterminate state, persistence, search) exercised
 * through the table instead of the sidebar, plus the two-tree consistency that only
 * becomes testable now that both exist.
 */

const mainCheck = 'input[data-test-id=edit_category_main]'
// Population is a single-stat group in the (default-on) Main category, so its
// checkbox sits directly on the Population row.
const populationCheck = 'input[data-test-id=edit_group_population]'
// Collapsed categories stay mounted (so the height transition has content) but are
// marked inert, so clicking requires the interactable variant.
const populationCheckInteractable = `${populationCheck}:not([inert] *)`
// Present only while Main is collapsed, since the toggle then offers to expand.
const mainExpandButton = categoryToggleButton('main', 'Expand')
// The sidebar's copy of the same group, for cross-tree checks.
const sidebarPopulationCheck = 'input[data-test-id=group_population]:not([inert] *)'

export function articleEditTreeTest(platform: 'mobile' | 'desktop'): void {
    urbanstatsFixture('article edit tree', `${target}/article.html?longname=San+Francisco+city%2C+California%2C+USA`, async (t) => {
        await resizeForPlatform(t, platform)
    })

    test('category-check', async (t) => {
        /**
         * Check that the category checks and unchecks correctly without being expanded.
         */
        await enterEditMode(t)
        await t.expect(Selector(mainCheck).checked).eql(true)
        await t.click(mainCheck)
        await t.expect(Selector(mainCheck).checked).eql(false)
        await t.click(mainCheck)
        await t.expect(Selector(mainCheck).checked).eql(true)
    })

    test('indeterminate-cycle-expanded', async (t) => {
        /**
         * Check that the category, when expanded, cycles between indeterminate -> true -> false -> indeterminate states
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
        await t.click(populationCheckInteractable)
        await t.expect(Selector(populationCheck).checked).eql(false)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
        await screencap(t)

        await t.click(mainCheck)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.expect(Selector(mainCheck).checked).eql(true)
        await t.expect(Selector(populationCheck).checked).eql(true)

        await t.click(mainCheck)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.expect(Selector(mainCheck).checked).eql(false)
        await t.expect(Selector(populationCheck).checked).eql(false)

        await t.click(mainCheck)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
        await t.expect(Selector(populationCheck).checked).eql(false)
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
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
        await t.expect(Selector(populationCheckInteractable).exists).notOk()
        if (platform === 'mobile') {
            await screencap(t)
        }
        await exitEditMode(t)
        await t.expect(populationStat.exists).notOk()
        await screencap(t)

        await enterEditMode(t)
        await t.click(mainCheck)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.expect(Selector(mainCheck).checked).eql(true)
        await exitEditMode(t)
        await t.expect(populationStat.exists).ok()

        await enterEditMode(t)
        await t.click(mainCheck)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.expect(Selector(mainCheck).checked).eql(false)
        await exitEditMode(t)
        await t.expect(populationStat.exists).notOk()

        await enterEditMode(t)
        await t.click(mainCheck)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
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
        await t.expect(Selector(populationCheck).checked).eql(false)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)

        await t.click(populationCheckInteractable)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.expect(Selector(mainCheck).checked).eql(true)
        await t.expect(Selector(populationCheck).checked).eql(true)

        await t.click(mainCheck)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.expect(Selector(mainCheck).checked).eql(false)
        await t.expect(Selector(populationCheck).checked).eql(false)
    })

    test('indeterminate-exit-uncheck', async (t) => {
        /**
         * Check than when a category enters an indeterminate state, it can come out of that state when its groups become uniformly unchecked.
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
        await t.click(mainCheck)
        await t.expect(Selector(mainCheck).checked).eql(false)
        await t.click(populationCheckInteractable)
        await t.expect(Selector(populationCheck).checked).eql(true)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)

        await t.click(populationCheckInteractable)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.expect(Selector(mainCheck).checked).eql(false)
        await t.expect(Selector(populationCheck).checked).eql(false)

        await t.click(mainCheck)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.expect(Selector(mainCheck).checked).eql(true)
    })

    test('uncheck-all-categories', async (t) => {
        await enterEditMode(t)
        await uncheckAll(t)
        // The warning renders inside the edit table, not just the normal one.
        await t.expect(Selector('.stats_table b').withExactText('No Statistic Categories are selected').exists).ok()
        await screencap(t)
        await exitEditMode(t)
        await t.expect(Selector('b').withExactText('No Statistic Categories are selected').exists).ok()
    })

    test('missing-year-warning', async (t) => {
        /**
         * Year selection lives only in the sidebar, but its warnings need to reach the
         * edit table, which renders its own copy of ArticleWarnings.
         */
        await enterEditMode(t)
        await uncheckAll(t)
        await t.click(mainCheck)
        await withHamburgerMenu(t, async () => {
            await t.click(Selector('label').withExactText('2020'))
        })
        await t.expect(Selector('.stats_table li').withExactText('To see Main > Population statistics, select 2020, 2010, or 2000.').exists).ok()
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
        await t.expect(Selector(populationCheck).checked).eql(false)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
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
        await t.expect(Selector(mainCheck).checked).eql(true)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.click(mainCheck)
        await t.click(mainCheck)
        await t.expect(Selector(populationCheck).checked).eql(false)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
    })

    test('expand-persistence', async (t) => {
        /**
         * Expansion is a setting, so it outlives edit mode (which is ephemeral) and the page.
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
        await exitEditMode(t)
        await enterEditMode(t)
        await t.expect(Selector(populationCheckInteractable).visible).eql(true)
        await safeReload(t)
        await enterEditMode(t)
        await t.expect(Selector(populationCheckInteractable).visible).eql(true)
    })

    test('expand-state-shared-with-sidebar', async (t) => {
        /**
         * Both trees expand under the same setting key, so expanding in one expands the other.
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
        await withHamburgerMenu(t, async () => {
            await t.expect(Selector(sidebarPopulationCheck).exists).ok()
            await t.click('.expandButton[data-category-id=main]')
            await t.wait(collapseAnimationMs)
            await t.expect(Selector(sidebarPopulationCheck).exists).notOk()
        })
        await t.expect(mainExpandButton.exists).ok()
        await t.expect(Selector(populationCheckInteractable).exists).notOk()
    })

    test('search-smoke', async (t) => {
        /**
         * Filtering expands the matching categories, so a group in an otherwise
         * collapsed category becomes reachable, and hides the expand buttons.
         */
        await enterEditMode(t)
        await t.typeText(filterBox, 'gene')
        await t.expect(Selector('input[data-test-id=edit_group_generation_genx]:not([inert] *)').exists).ok()
        await t.expect(Selector(mainCheck).exists).notOk()
        await t.expect(Selector('.stats_table [aria-label$="category"]').exists).notOk()
        await screencap(t)

        await t.selectText(filterBox).pressKey('delete')
        await t.expect(Selector(mainCheck).exists).ok()
        // Filtering doesn't leave the categories it expanded expanded.
        await t.expect(mainExpandButton.exists).ok()
    })

    test('trees-stay-in-sync', async (t) => {
        /**
         * The edit tree and the sidebar tree are separate components over the same
         * settings, so a change in either must show up in the other.
         */
        await enterEditMode(t)
        await setMainExpanded(t, true)
        await t.click(populationCheckInteractable)

        await withHamburgerMenu(t, async () => {
            await t.expect(Selector(sidebarPopulationCheck).checked).eql(false)
            await t.expect(await checkIsIndeterminate(t, 'input[data-test-id=category_main]')).eql(true)
            await t.click(sidebarPopulationCheck)
        })

        await t.expect(Selector(populationCheck).checked).eql(true)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
        await t.expect(Selector(mainCheck).checked).eql(true)
    })

    urbanstatsFixture('article edit tree filtering', `${target}/article.html?longname=Venice+Neighborhood%2C+Los+Angeles+City%2C+California%2C+USA`, async (t) => {
        await resizeForPlatform(t, platform)
    })

    test('search-filter', async (t) => {
        // Groups that don't exist for an article don't show up in the edit tree
        await enterEditMode(t)
        await t.typeText(filterBox, 'median')
        await t.expect(Selector('input[data-test-id=edit_category_income]').exists).notOk()
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
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)

        await selectUniverse(t, 'North America')
        await enterEditMode(t)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
        await screencap(t)

        await selectUniverse(t, 'USA')
        await enterEditMode(t)
        await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
    })
}

async function selectUniverse(t: TestController, alt: string): Promise<void> {
    await t.click(Selector('img').withAttribute('class', 'universe-selector'))
    await clickUniverseFlag(t, alt)
}

async function setMainExpanded(t: TestController, expanded: boolean): Promise<void> {
    await setCategoryExpanded(t, 'main', expanded)
}

async function uncheckAll(t: TestController): Promise<void> {
    await uncheckAllCategories(t, 'edit_category')
}
