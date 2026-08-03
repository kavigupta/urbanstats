import { Selector } from 'testcafe'

import { comparisonPage, downloadImage, target, uncheckAllCategories, urbanstatsFixture, withHamburgerMenu } from './test_utils'

/**
 * Warnings explain how to change a setting, which means nothing to someone looking at a shared
 * image, so screenshot mode leaves them out. These download the app's own screenshot in a state
 * full of warnings; the reference image comparison is what checks they aren't in it.
 */

const mainCheck = 'input[data-test-id=category_main]'

/** Leaves Main selected with no year selected, so all of its yearly groups warn. */
async function selectMainWithoutYears(t: TestController): Promise<void> {
    await withHamburgerMenu(t, async () => {
        await uncheckAllCategories(t)
        await t.click(mainCheck)
        await t.click(Selector('label').withExactText('2020'))
    })
}

urbanstatsFixture('article warning screenshot', `${target}/article.html?longname=San+Francisco+city%2C+California%2C+USA`)

test('article-warnings-absent-from-screenshot', async (t) => {
    await selectMainWithoutYears(t)
    await t.expect(Selector('[data-test-id=article-warning]').exists).ok('the page should be showing warnings to leave out')
    await downloadImage(t)
})

urbanstatsFixture('comparison warning screenshot', comparisonPage([
    'San Francisco city, California, USA',
    'Boston city, Massachusetts, USA',
]))

test('comparison-warnings-absent-from-screenshot', async (t) => {
    await selectMainWithoutYears(t)
    await t.expect(Selector('[data-test-id=article-warning]').exists).ok('the page should be showing warnings to leave out')
    await downloadImage(t)
})

// Enough regions that the table is narrower transposed, where the warnings are columns.
urbanstatsFixture('transposed comparison warning screenshot', comparisonPage([
    'Santa Clarita city, California, USA',
    'Santa Clara city, California, USA',
    'Boston city, Massachusetts, USA',
    'San Francisco city, California, USA',
    'Denver city, Colorado, USA',
    'Seattle city, Washington, USA',
]))

test('comparison-transposed-warnings-absent-from-screenshot', async (t) => {
    await selectMainWithoutYears(t)
    await t.expect(Selector('span.serif.value').withExactText('Region').exists).ok('the table should have transposed')
    await t.expect(Selector('[data-test-id=article-warning]').exists).ok('the page should be showing warnings to leave out')
    await downloadImage(t)
})
