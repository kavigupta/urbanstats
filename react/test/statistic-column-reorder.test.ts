import { Selector } from 'testcafe'

import { toggleCustomScript } from './mapper-utils'
import { target, urbanstatsFixture, waitForLoading, dataValues, safeReload, dragHandle } from './test_utils'

function createUSSStatisticsPage(uss: string, start = 1, amount = 5, universe = 'California, USA', articleType = 'County'): string {
    return `${target}/statistic.html?uss=${encodeURIComponent(uss)}&article_type=${encodeURIComponent(articleType)}&start=${start}&amount=${amount}&universe=${encodeURIComponent(universe)}`
}

const columnHeader = (n: number): Selector => Selector('[data-test-id="sortable-column-header"]').nth(n)
const columnHeaderLink = (n: number): Selector => columnHeader(n).find('[data-test-id="statistic-link"]')
const sortIndicator = (n: number): Selector => columnHeader(n).find('.testing-order-swap')

const twoColumnUSS = `table(
    columns=[
        column(values=density_pw_1km, name="Col A", unit=unitDensity),
        column(values=commute_transit, name="Col B", unit=unitPercentage)
    ]
)`

urbanstatsFixture('column reorder basic', createUSSStatisticsPage(twoColumnUSS))

test('drag column header swaps columns', async (t) => {
    await waitForLoading()
    await t.expect(columnHeaderLink(0).innerText).eql('Col A')
    await t.expect(columnHeaderLink(1).innerText).eql('Col B')

    await t.dragToElement(columnHeader(0), columnHeader(1))

    await waitForLoading()
    await t.expect(columnHeaderLink(0).innerText).eql('Col B')
    await t.expect(columnHeaderLink(1).innerText).eql('Col A')
})

test('column reorder persists in URL', async (t) => {
    await waitForLoading()

    await t.dragToElement(columnHeader(0), columnHeader(1))
    await waitForLoading()

    await safeReload(t)
    await waitForLoading()
    await t.expect(columnHeaderLink(0).innerText).eql('Col B')
    await t.expect(columnHeaderLink(1).innerText).eql('Col A')
})

test('sort indicator follows logical column after reorder', async (t) => {
    await waitForLoading()
    // Click column 0 header to sort by it; sort indicator should appear on col 0
    await t.click(columnHeader(0))
    await waitForLoading()
    await t.expect(sortIndicator(0).getAttribute('alt')).notEql('both')
    await t.expect(sortIndicator(1).getAttribute('alt')).eql('both')

    // Drag col 0 to col 1 — sort indicator must follow the logical column to position 1
    await t.dragToElement(columnHeader(0), columnHeader(1))
    await waitForLoading()
    await t.expect(sortIndicator(0).getAttribute('alt')).eql('both')
    await t.expect(sortIndicator(1).getAttribute('alt')).notEql('both')
})

test('column reorder updates data values', async (t) => {
    await waitForLoading()
    const valsBefore = await dataValues()

    await t.dragToElement(columnHeader(0), columnHeader(1))
    await waitForLoading()

    // After swapping, the first set of data values should be what was previously in Col B
    const valsAfter = await dataValues()
    // The two columns have different statistics so values should differ
    await t.expect(valsAfter).notEql(valsBefore)
})

const threeColumnURL = createUSSStatisticsPage(`table(
    columns=[
        column(values=density_pw_1km, name="C1", unit=unitDensity),
        column(values=commute_transit, name="C2", unit=unitPercentage),
        column(
            values=traffic_fatalities_per_capita,
            name="C3",
            unit=unitFatalitiesPerCapita
        )
    ]
)`)

urbanstatsFixture('column reorder multi-column', threeColumnURL)

test('drag last column to first position', async (t) => {
    await waitForLoading()
    await t.expect(columnHeaderLink(0).innerText).eql('C1')
    await t.expect(columnHeaderLink(1).innerText).eql('C2')
    await t.expect(columnHeaderLink(2).innerText).eql('C3')

    await t.dragToElement(columnHeader(2), columnHeader(0))

    await waitForLoading()
    await t.expect(columnHeaderLink(0).innerText).eql('C3')
    await t.expect(columnHeaderLink(1).innerText).eql('C1')
    await t.expect(columnHeaderLink(2).innerText).eql('C2')
})

test('multiple sequential reorders', async (t) => {
    await waitForLoading()

    // Move C1 → position 1 (C1, C2, C3 → C2, C1, C3)
    await t.dragToElement(columnHeader(0), columnHeader(1))
    await waitForLoading()
    await t.expect(columnHeaderLink(0).innerText).eql('C2')
    await t.expect(columnHeaderLink(1).innerText).eql('C1')
    await t.expect(columnHeaderLink(2).innerText).eql('C3')

    // Move C3 → position 0 (C2, C1, C3 → C3, C2, C1)
    await t.dragToElement(columnHeader(2), columnHeader(0))
    await waitForLoading()
    await t.expect(columnHeaderLink(0).innerText).eql('C3')
    await t.expect(columnHeaderLink(1).innerText).eql('C2')
    await t.expect(columnHeaderLink(2).innerText).eql('C1')
})

test('reordering via autoux', async (t) => {
    await waitForLoading()
    await t.click('button[data-test-id="edit"]')
    await toggleCustomScript(t)
    await t.dragToElement(dragHandle(0), dragHandle(2))
    await t.expect(columnHeaderLink(0).innerText).eql('C2')
    await t.expect(columnHeaderLink(1).innerText).eql('C3')
    await t.expect(columnHeaderLink(2).innerText).eql('C1')
})

test('reorder after removing a vector element', async (t) => {
    await waitForLoading()
    await t.click('button[data-test-id="edit"]')
    await toggleCustomScript(t)

    // Remove the middle element (C2, drag handle index 1)
    const removeButtons = Selector('button[title="Remove element"]')
    await t.click(removeButtons.nth(1))
    await waitForLoading()

    // Now only C1 (handle 0) and C3 (handle 1) remain; drag C1 past C3
    await t.dragToElement(dragHandle(0), dragHandle(1))
    await waitForLoading()
    await t.expect(columnHeaderLink(0).innerText).eql('C3')
    await t.expect(columnHeaderLink(1).innerText).eql('C1')
})

const variableURL = createUSSStatisticsPage(`
columns = [
    column(values=density_pw_1km, name="Col A", unit=unitDensity),
    column(values=commute_transit, name="Col B", unit=unitPercentage)
]
table(
    columns=columns
)`)

urbanstatsFixture('uss with columns variable', variableURL)

test('drag column header does not swap columns', async (t) => {
    await waitForLoading()
    await t.expect(columnHeaderLink(0).exists).notOk()
})
