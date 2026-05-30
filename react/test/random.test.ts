import { Selector } from 'testcafe'

import { target, getLocation, urbanstatsFixture, withHamburgerMenu, waitForLoading, checkTextboxes } from './test_utils'

const repeats = 15

async function assertIsArticle(t: TestController): Promise<void> {
    await t.expect(getLocation()).contains('/article.html?longname=')
}

async function assertNoSetUniverse(t: TestController): Promise<void> {
    await t.expect(getLocation()).notContains('&universe=')
}

async function assertNoSpecials(t: TestController): Promise<void> {
    await t.expect(getLocation()).notMatch(/\s(\(19\d\d|201\d|2021\)), USA$/)
    await t.expect(getLocation()).notMatch(/.*PC%2C.*/)
}

async function assertCorrect(t: TestController): Promise<void> {
    await assertIsArticle(t)
    await assertNoSetUniverse(t)
    await assertNoSpecials(t)
}

urbanstatsFixture('random-usa-by-population', `${target}/random.html?sampleby=population&universe=USA`)

for (let count = 0; count < repeats; count++) {
    test(`random-usa-by-population-${count}`, async (t) => {
        await assertCorrect(t)
        await t.expect(getLocation()).match(/.*USA.*/)
    })
}

urbanstatsFixture('random-usa-by-population-compat', `${target}/random.html?sampleby=population&us_only=true`)

for (let count = 0; count < repeats; count++) {
    test(`random-usa-by-population-compat-${count}`, async (t) => {
        await assertCorrect(t)
        await t.expect(getLocation()).match(/.*USA.*/)
    })
}

urbanstatsFixture('random-uniformly', `${target}/random.html?sampleby=uniform`)

for (let count = 0; count < repeats; count++) {
    test(`random-uniformly-${count}`, async (t) => {
        await assertCorrect(t)
    })
}

urbanstatsFixture('random-by-population', `${target}/random.html?sampleby=population`)

for (let count = 0; count < repeats; count++) {
    test(`random-by-population-${count}`, async (t) => {
        await assertCorrect(t)
    })
}

urbanstatsFixture('random-sidebar', `${target}/article.html?longname=San+Marino+city%2C+California%2C+USA`)

test('sidebar-unweighted-button', async (t) => {
    await withHamburgerMenu(t, async () => {
        await t.click(Selector('a').withExactText('Unweighted'))
    })
    await waitForLoading()
    await assertIsArticle(t)
})

test('sidebar-weighted-by-population-button', async (t) => {
    await withHamburgerMenu(t, async () => {
        await t.click(Selector('a').withExactText('Weighted by Population'))
    })
    await waitForLoading()
    await assertIsArticle(t)
})

test('sidebar-filter-to-universe-checkbox', async (t) => {
    const unweightedLink = Selector('a').withExactText('Unweighted')

    // By default the checkbox is off — random links should not include a universe param
    await t.expect(unweightedLink.getAttribute('href')).notContains('universe')

    // Enable "Filter to universe (USA)"
    await checkTextboxes(t, ['Filter to universe (USA)'])

    // Links should now carry universe=USA
    await t.expect(unweightedLink.getAttribute('href')).contains('universe=USA')

    // Navigating via the updated link should still land on an article
    await withHamburgerMenu(t, async () => {
        await t.click(unweightedLink)
    })
    await waitForLoading()
    await assertIsArticle(t)
})
