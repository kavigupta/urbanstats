import { Selector } from 'testcafe'

import {
    target,
    getLocationWithoutSettings, screencap,
    urbanstatsFixture,
    doSearch,
    createComparison,
    clickUniverseFlag,
} from './test_utils'

urbanstatsFixture('article universe selector test', `/article.html?longname=San+Marino+city%2C+California%2C+USA`)

test('article-universe-selector-test-california', async (t) => {
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await screencap(t)
    await clickUniverseFlag(t, 'California, USA')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=San+Marino+city%2C+California%2C+USA&universe=California%2C+USA`)
})

urbanstatsFixture('article universe selector test international', `/article.html?longname=Delhi+%5BNew+Delhi%5D+Urban+Center%2C+India`)

test('article-universe-selector-test-india', async (t) => {
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await screencap(t)
    await clickUniverseFlag(t, 'India')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Delhi+%5BNew+Delhi%5D+Urban+Center%2C+India&universe=India`)
    await screencap(t)
})

urbanstatsFixture('article universe navigation test', `/article.html?longname=San+Marino+city%2C+California%2C+USA&universe=California%2C+USA`)

test('article-universe-right-arrow', async (t) => {
    // click right population arrow
    await t
        .click(Selector('button[data-test-id="1"]'))
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Camp+Pendleton+South+CDP%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-ordinal', async (t) => {
    // click the ordinal for the universe
    const editableNumber = Selector('span').withAttribute('class', 'editable_content').nth(0)
    await t
        .click(editableNumber)
    // select all and delete
        .pressKey('ctrl+a')
        .typeText(editableNumber, '3')
        .pressKey('enter')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=San+Jose+city%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-statistic-page', async (t) => {
    // click the link for Area
    await t
        .click(Selector('a').withText(/^Area$/))
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/statistic.html?statname=Area&article_type=City&start=821&amount=20&universe=California%2C+USA`)
    await screencap(t)
})

test('article-universe-related-button', async (t) => {
    await t
        .click(Selector('a').withExactText('Los Angeles County'))
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Los+Angeles+County%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-search', async (t) => {
    await doSearch(t, 'Chino')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=Chino+city%2C+California%2C+USA&universe=California%2C+USA`)
})

test('article-universe-compare', async (t) => {
    // compare to San Francisco
    await createComparison(t, 'San Francisco city california')
    await t.expect(getLocationWithoutSettings())
        .eql(
            `${target}/comparison.html?longnames=%5B%22San+Marino+city%2C+California%2C+USA%22%2C%22San+Francisco+city%2C+California%2C+USA%22%5D&universe=California%2C+USA`,
        )
    await screencap(t)
})

test('article-universe-compare-different', async (t) => {
    // compare to Chicago
    await createComparison(t, 'Chicago city illinois')
    await t.expect(getLocationWithoutSettings())
        .eql(
            `${target}/comparison.html?longnames=%5B%22San+Marino+city%2C+California%2C+USA%22%2C%22Chicago+city%2C+Illinois%2C+USA%22%5D`,
        )
    await screencap(t)
})

urbanstatsFixture('article universe state test', `/article.html?longname=California%2C+USA`)

test('article-universe-state-world', async (t) => {
    // go to the world
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await clickUniverseFlag(t, 'world')
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=California%2C+USA&universe=world`)
    // screenshot
    await screencap(t)
})

urbanstatsFixture('article universe state from subnational test', `/article.html?longname=Kerala%2C+India`)

test('article-universe-state-from-subnational', async (t) => {
    await screencap(t)
    // click the > button
    await t
        .click(Selector('button[data-test-id="1"]'))
    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/article.html?longname=California%2C+USA&universe=world`)
    await screencap(t)
})

urbanstatsFixture('values-same-by-universe', '/article.html?longname=California%2C+USA')

async function pullRows(): Promise<string[][]> {
    // Get all elements with class for-testing
    const elements = Selector('div').withAttribute('class', 'for-testing-table-row')
    const count = await elements.count
    const results: string[][] = []
    for (let i = 0; i < count; i++) {
        const element = elements.nth(i)
        let lines = (await element.innerText).split('\n')
        lines = lines.slice(0, lines.length - 2)
        results.push(lines)
    }
    return results
}

test('values-same-by-universe', async (t) => {
    const original = await pullRows()
    // set universe to world
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await clickUniverseFlag(t, 'world')
    const withWorld = await pullRows()
    for (const row of original) {
        row[row.length - 1] = row[row.length - 1].replace(/State/g, 'Subnational Region')
    }
    // clear out the ones that are different by universe (compactness [3] and area [4])
    for (let rowIdx = 3; rowIdx < original.length; rowIdx++) {
        // ordinal and percentile
        for (let colIdx = 3; colIdx < original[rowIdx].length; colIdx++) {
            original[rowIdx][colIdx] = '<varies>'
            withWorld[rowIdx][colIdx] = '<varies>'
        }
    }
    await t.expect(original).eql(withWorld)
})
