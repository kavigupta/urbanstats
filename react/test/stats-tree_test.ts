import { Selector } from 'testcafe'

import { arrayFromSelector, screencap, TARGET, urbanstatsFixture } from './test_utils'

urbanstatsFixture('stats tree test', `${TARGET}/article.html?longname=San+Francisco+city%2C+California%2C+USA`)

const mainCheck = 'input[data-test-id=category_main]'
const mainExpand = '.expandButton[data-category-id=main]'
const populationCheck = 'input[data-test-id=group_population]:not([inert] *)' // Need :not([inert] *) because groups are rerendered offscreen

test('main-expand-appearance', async (t) => {
    await t.click(mainExpand)
    await screencap(t)
})

test('category-check', async (t) => {
    /**
     * Check that the category checks and unchecks correctly without being expanded.
     */
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
    await t.click(mainExpand)
    await t.click(populationCheck)
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
     * Check that the category, when collapsed, cycles between indeterminate -> true -> false -> indeterminate states
     */
    const populationStat = Selector('a').withExactText('Population')

    await t.click(mainExpand)
    await t.click(populationCheck)
    await t.expect(Selector(populationCheck).checked).eql(false)
    await t.click(mainExpand)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
    await t.expect(populationStat.exists).notOk()
    await screencap(t)

    await t.click(mainCheck)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
    await t.expect(Selector(mainCheck).checked).eql(true)
    await t.expect(populationStat.exists).ok()

    await t.click(mainCheck)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
    await t.expect(Selector(mainCheck).checked).eql(false)
    await t.expect(populationStat.exists).notOk()

    await t.click(mainCheck)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
    await t.expect(populationStat.exists).notOk()
})

test('indeterminate-exit-check', async (t) => {
    /**
     * Check than when a category enters an indeterminate state, it can come out of that state when its groups become uniformly checked.
     */
    await t.click(mainExpand)
    await t.click(populationCheck)
    await t.expect(Selector(populationCheck).checked).eql(false)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)

    await t.click(populationCheck)
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
    await t.click(mainCheck)
    await t.expect(Selector(mainCheck).checked).eql(false)
    await t.click(mainExpand)
    await t.click(populationCheck)
    await t.expect(Selector(populationCheck).checked).eql(true)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)

    await t.click(populationCheck)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
    await t.expect(Selector(mainCheck).checked).eql(false)
    await t.expect(Selector(populationCheck).checked).eql(false)

    await t.click(mainCheck)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
    await t.expect(Selector(mainCheck).checked).eql(true)
    await t.expect(Selector(populationCheck).checked).eql(true)
})

test('year-2010', async (t) => {
    await t.click(Selector('label').withExactText('2010'))
    await t.expect(Selector('a').withExactText('Population (2010)').exists).ok()
    await screencap(t)
})

test('uncheck-all-categories', async (t) => {
    await uncheckAll(t)
    await t.expect(Selector('b').withExactText('No Statistic Categories are selected').exists).ok()
    await screencap(t)
})

test('missing-year-data', async (t) => {
    await uncheckAll(t)
    await t.click(Selector('label').withExactText('2020'))
    await t.click(Selector('label').withExactText('2010'))
    await t.click(Selector('label').withExactText('Health'))
    await t.expect(Selector('li').withExactText('To see Health statistics, select 2020.').exists).ok()
    await screencap(t)
})

test('missing-partial-year-data', async (t) => {
    await uncheckAll(t)
    await t.click(Selector('label').withExactText('2020'))
    await t.click(Selector('label').withExactText('2010'))
    await t.click('.expandButton[data-category-id=housing]')
    await t.click('input[data-test-id=group_vacancy]:not([inert] *)')
    await t.click('input[data-test-id=group_rent_or_own_rent]:not([inert] *)')
    await t.expect(Selector('li').withExactText('To see Housing > Renter % statistics, select 2020.').exists).ok()
    await screencap(t)
})

test('no-years-selected', async (t) => {
    await uncheckAll(t)
    await t.click(mainCheck)
    await t.click(Selector('label').withExactText('2020'))
    await t.expect(Selector('a').withExactText('Area').exists).ok()
    await t.expect(Selector('li').withExactText('To see Main > Population statistics, select 2020, 2010, or 2000.').exists).ok()
    await screencap(t)
})

test('expand-persistence', async (t) => {
    await t.click(mainExpand)
    await t.eval(() => { location.reload() })
    await t.expect(Selector(populationCheck).visible).eql(true)
})

test('indeterminate-persistence', async (t) => {
    await t.click(mainExpand)
    await t.click(populationCheck)
    await t.eval(() => { location.reload() })
    await t.expect(Selector(populationCheck).checked).eql(false)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
})

test('hidden-indeterminate-persistence', async (t) => {
    /**
     * Makes an indeterminate selection, hides that indetermiante selection by clicking the category
     * Then checks that the hidden selection persists through page reload
     */
    await t.click(mainExpand)
    await t.click(populationCheck)
    await t.click(mainCheck)
    await t.eval(() => { location.reload() })
    await t.expect(Selector(mainCheck).checked).eql(true)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
    await t.click(mainCheck)
    await t.click(mainCheck)
    await t.expect(Selector(populationCheck).checked).eql(false)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
})

/** Universe Tests */

urbanstatsFixture('stats tree universe test', `${TARGET}/article.html?longname=USA`)

test('switch-universe-indeterminate', async (t) => {
    /**
     * Makes an indeterminate selection in the Main category, then switches to a universe where the deslected group is not available.
     * In this universe, the main category should not be indeterminate.
     * When switching back to the previous universe, the Main category should once again be indeterminate.
     */
    await t.click(mainExpand)
    await t.click(populationCheck)
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'North America'))
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(false)
    await screencap(t)
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'USA'))
    await t.expect(await checkIsIndeterminate(t, mainCheck)).eql(true)
})

async function uncheckAll(t: TestController): Promise<void> {
    for (const check of await arrayFromSelector(Selector('input[data-test-id^=category]'))) {
        if (await check.checked) {
            await t.click(check)
        }
    }
}

async function checkIsIndeterminate(t: TestController, selector: string): Promise<boolean> {
    return t.eval(() => {
        const check: HTMLInputElement = document.querySelector(selector)!
        return check.indeterminate
    }, { dependencies: { selector } }) as Promise<boolean>
}
