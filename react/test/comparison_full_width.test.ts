import { ClientFunction, Selector } from 'testcafe'

import { comparisonPage, urbanstatsFixture } from './test_utils'

const sidebar = Selector('.left_panel')
const hamburgerMenu = Selector('div').withAttribute('class', 'hamburgermenu')

const tableScrolls = ClientFunction(() => {
    for (let element = document.querySelector('[data-test-id=comparison-table]'); element !== null; element = element.parentElement) {
        if (getComputedStyle(element).overflowX === 'scroll') {
            return true
        }
    }
    return false
})

const cities = [
    'Los Angeles city, California, USA',
    'New York city, New York, USA',
    'Denver city, Colorado, USA',
    'Houston city, Texas, USA',
    'Miami city, Florida, USA',
    'Chicago city, Illinois, USA',
    'Boston city, Massachusetts, USA',
]

urbanstatsFixture('narrow comparison', comparisonPage(cities.slice(0, 3)))

test('a narrow comparison keeps the sidebar', async (t) => {
    await t.expect(sidebar.exists).ok()
    await t.expect(hamburgerMenu.exists).notOk()
    await t.expect(tableScrolls()).notOk()
})

urbanstatsFixture('wide comparison', comparisonPage(cities.slice(0, 4)))

test('a wide comparison goes full width without scrolling', async (t) => {
    await t.expect(sidebar.exists).notOk()
    await t.expect(hamburgerMenu.exists).ok()
    await t.expect(tableScrolls()).notOk()

    await t.click(Selector('[data-test-id=manipulation-button-delete]').nth(3))

    await t.expect(sidebar.exists).ok()
    await t.expect(hamburgerMenu.exists).notOk()
})

urbanstatsFixture('very wide comparison', comparisonPage(cities))

test('a comparison too wide for full width scrolls', async (t) => {
    await t.expect(sidebar.exists).notOk()
    await t.expect(hamburgerMenu.exists).ok()
    await t.expect(tableScrolls()).ok()
})
