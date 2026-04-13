import { Selector } from 'testcafe'

import { target, urbanstatsFixture, waitForLoading, safeReload, getLocation } from './test_utils'

function createUSSStatisticsPage(uss: string, start = 1, amount = 5, universe = 'California, USA', articleType = 'County'): string {
    return `${target}/statistic.html?uss=${encodeURIComponent(uss)}&article_type=${encodeURIComponent(articleType)}&start=${start}&amount=${amount}&universe=${encodeURIComponent(universe)}`
}

const columnHeaderLink = (n: number): Selector => Selector('[data-test-id="statistic-link"]').nth(n)
const sortIndicator = (n: number): Selector => Selector('.testing-order-swap').nth(n)
const deleteButton = (n: number): Selector => Selector('[data-test-id="delete-column"]').nth(n)

const twoColumnUSS = `table(
    columns=[
        column(values=density_pw_1km, name="Col A", unit=unitDensity),
        column(values=commute_transit, name="Col B", unit=unitPercentage)
    ]
)`

urbanstatsFixture('column delete basic', createUSSStatisticsPage(twoColumnUSS))

test('clicking delete removes the column', async (t) => {
    await waitForLoading()
    await t.click(deleteButton(0))
    await waitForLoading()

    await t.expect(columnHeaderLink(0).innerText).eql('Col B')
    await t.expect(columnHeaderLink(1).exists).notOk()
})

test('deletion persists after reload', async (t) => {
    await waitForLoading()
    await t.click(deleteButton(0))
    await waitForLoading()

    await safeReload(t)
    await waitForLoading()

    await t.expect(columnHeaderLink(0).innerText).eql('Col B')
    await t.expect(columnHeaderLink(1).exists).notOk()
})

const threeColumnUSS = `table(
    columns=[
        column(values=density_pw_1km, name="C1", unit=unitDensity),
        column(values=commute_transit, name="C2", unit=unitPercentage),
        column(
            values=traffic_fatalities_per_capita,
            name="C3",
            unit=unitFatalitiesPerCapita
        )
    ]
)`

urbanstatsFixture('column delete sort indicator', createUSSStatisticsPage(threeColumnUSS))

test('sort indicator resets to column 0, descending, start 1, when deleting the sort column', async (t) => {
    await waitForLoading()
    await t.click(sortIndicator(1))
    await t.click(sortIndicator(1))
    await waitForLoading()
    await t.expect(sortIndicator(1).getAttribute('alt')).eql('up')

    await t.click('[data-test-id="1"]')
    await t.expect(getLocation()).match(/start=6/)

    await t.click(deleteButton(1))
    await waitForLoading()

    await t.expect(sortIndicator(0).getAttribute('alt')).eql('down')
    await t.expect(sortIndicator(1).getAttribute('alt')).eql('both')

    await t.expect(getLocation()).match(/start=1/)
})

test('sort indicator shifts when deleting a column before the sort column', async (t) => {
    await waitForLoading()
    await t.click(sortIndicator(2))
    await waitForLoading()
    await t.expect(sortIndicator(2).getAttribute('alt')).notEql('both')

    await t.click(deleteButton(0))
    await waitForLoading()

    await t.expect(sortIndicator(0).getAttribute('alt')).eql('both')
    await t.expect(sortIndicator(1).getAttribute('alt')).notEql('both')
})

urbanstatsFixture('column delete single column', createUSSStatisticsPage(`table(
    columns=[
        column(values=density_pw_1km, name="Col A", unit=unitDensity)
    ]
)`))

test('delete button is not shown with a single column', async (t) => {
    await waitForLoading()
    await t.expect(deleteButton(0).exists).notOk()
})

urbanstatsFixture('column delete variable columns', createUSSStatisticsPage(`
columns = [
    column(values=density_pw_1km, name="Col A", unit=unitDensity),
    column(values=commute_transit, name="Col B", unit=unitPercentage)
]
table(
    columns=columns
)`))

test('delete button is not shown when columns are defined via a variable', async (t) => {
    await waitForLoading()
    await t.expect(deleteButton(0).exists).notOk()
})
