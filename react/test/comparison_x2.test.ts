import { Selector } from 'testcafe'

import { target, comparisonPage, screencap, urbanstatsFixture, getLocationWithoutSettings } from './test_utils'

// Test data for drag and drop tests
const china = 'China'
const usa = 'USA'
const japan = 'Japan'
const indonesia = 'Indonesia'
const brazil = 'Brazil'

urbanstatsFixture('drag and drop basic reordering', comparisonPage([china, usa, japan]))

test('drag and drop basic reordering desktop', async (t) => {
    await screencap(t)

    const firstHeader = Selector('[role="button"]').nth(0)
    const secondHeader = Selector('[role="button"]').nth(1)

    await t.dragToElement(firstHeader, secondHeader)

    await t.wait(1000)

    await screencap(t)

    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([usa, china, japan]))
})

urbanstatsFixture('drag and drop transpose mode', `${target}/comparison.html?longnames=%5B%22China%22%2C%22USA%22%2C%22Japan%22%2C%22Indonesia%22%5D&s=6TunChiToWxwZeDP`)

test('drag and drop transpose mode desktop', async (t) => {
    await screencap(t)

    const firstHeader = Selector('[role="button"]').nth(0)
    const secondHeader = Selector('[role="button"]').nth(1)

    await t.dragToElement(firstHeader, secondHeader)

    await t.wait(1000)

    await screencap(t)

    await t.expect(getLocationWithoutSettings())
        .eql(`${target}/comparison.html?longnames=%5B%22USA%22%2C%22China%22%2C%22Japan%22%2C%22Indonesia%22%5D`)
})

urbanstatsFixture('drag and drop multiple reorderings', `${comparisonPage([china, usa, japan, indonesia, brazil])}&s=PnVFWSX4G4xJd`)

test('drag and drop multiple reorderings', async (t) => {
    await t.resizeWindow(1400, 800)

    await screencap(t)

    const chinaHeader = Selector('[role="button"]').nth(0)
    const brazilHeader = Selector('[role="button"]').nth(4)

    await t.dragToElement(chinaHeader, brazilHeader)
    await t.wait(1000)

    await screencap(t)

    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([usa, japan, indonesia, brazil, china]))

    const japanHeader = Selector('[role="button"]').nth(1)
    const usaHeader = Selector('[role="button"]').nth(0)

    await t.dragToElement(japanHeader, usaHeader)
    await t.wait(1000)

    await screencap(t)

    await t.expect(getLocationWithoutSettings())
        .eql(comparisonPage([japan, usa, indonesia, brazil, china]))
})
