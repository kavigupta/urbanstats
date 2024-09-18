import { Selector } from 'testcafe'

import { TARGET, comparison_page, download_image, getLocation, screencap, urbanstatsFixture } from './test_utils'

export const upper_sgv = 'Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const pasadena = 'Pasadena CCD [CCD], Los Angeles County, California, USA'
export const sw_sgv = 'Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const east_sgv = 'East San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const chicago = 'Chicago city [CCD], Cook County, Illinois, USA'

urbanstatsFixture('comparison test heterogenous', comparison_page(['San Marino city, California, USA', pasadena, sw_sgv]))

test('comparison-3-desktop-heterogenous', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

test('comparison-3-mobile-heterogenous', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

urbanstatsFixture('comparison test homogenous (2)', comparison_page([upper_sgv, sw_sgv]))

test('comparison-2-mobile', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

urbanstatsFixture('comparison test homogenous (3)', comparison_page([upper_sgv, pasadena, sw_sgv]))

test('comparison-3-desktop', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
})

test('comparison-3-mobile', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})

test('comparison-3-download', async (t) => {
    await t.resizeWindow(1400, 800)
    await download_image(t)
})

test('comparison-3-add', async (t) => {
    const otherRegion = Selector('input').withAttribute('placeholder', 'Name')
    await t
        .click(otherRegion)
        .typeText(otherRegion, 'san marino city california')
        .pressKey('enter')
    await t.expect(getLocation())
        .eql(comparison_page([upper_sgv, pasadena, sw_sgv, 'San Marino city, California, USA']))
})

test('comparison-3-remove-first', async (t) => {
    const remove = Selector('div').withAttribute('class', 'serif manipulation-button-delete').nth(0)
    await t
        .click(remove)
    await t.expect(getLocation())
        .eql(comparison_page([pasadena, sw_sgv]))
})

test('comparison-3-remove-second', async (t) => {
    const remove = Selector('div').withAttribute('class', 'serif manipulation-button-delete').nth(1)
    await t
        .click(remove)
    await t.expect(getLocation())
        .eql(comparison_page([upper_sgv, sw_sgv]))
})

test('comparison-3-replace-second', async (t) => {
    const replace = Selector('div').withAttribute('class', 'serif manipulation-button-replace').nth(1)
    await t
        .click(replace)
    // already focused on the input
    const otherRegion = Selector('input').withAttribute('placeholder', 'Replacement')
    await t
        .typeText(otherRegion, 'East San Gabriel Valley')
        .pressKey('enter')
    await t.expect(getLocation())
        .eql(comparison_page([upper_sgv, east_sgv, sw_sgv]))
})

test('comparison-3-editable-number-third', async (t) => {
    const editableNumber = Selector('span').withAttribute('class', 'editable_number').nth(2)
    await t
        .click(editableNumber)
    // select all and delete
        .pressKey('ctrl+a')
        .typeText(editableNumber, '3')
        .pressKey('enter')
    await t.expect(editableNumber.innerText).eql('3')
    await t.expect(getLocation())
        .eql(comparison_page([upper_sgv, pasadena, chicago]))
})

urbanstatsFixture('plotted-across-180', `${TARGET}/comparison.html?longnames=%5B%22England%2C+United+Kingdom%22%2C%22Alaska%2C+USA%22%2C%22Chukotskiy+avtonomnyy+okrug%2C+Russian+Federation%22%5D`)

test('comparison-3-plotted-across-180', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
})
