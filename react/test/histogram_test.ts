import { Selector } from 'testcafe'

import { TARGET, check_textboxes, comparison_page, download_histogram, download_image, download_or_check_string, screencap, urbanstatsFixture, waitForLoading } from './test_utils'

export const upper_sgv = 'Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const pasadena = 'Pasadena CCD [CCD], Los Angeles County, California, USA'
export const sw_sgv = 'Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const east_sgv = 'East San Gabriel Valley CCD [CCD], Los Angeles County, California, USA'
export const chicago = 'Chicago city [CCD], Cook County, Illinois, USA'

async function download_or_check_histogram(t: TestController, name: string, nth = 0): Promise<void> {
    const output = await t.eval(() => {
        return document.getElementsByClassName('histogram-svg-panel')[nth].innerHTML
    }, { dependencies: { nth } }) as string
    await download_or_check_string(t, output, name)
}

urbanstatsFixture('article check and uncheck test', `${TARGET}/article.html?longname=New+York+Urban+Center%2C+USA&universe=world`)

test('histogram-article-check-uncheck', async (t) => {
    await waitForLoading(t) // Need to avoid a race condition between map loading and page resizing
    await t.resizeWindow(400, 800)
    // count the number of `histogram-svg-panel` elements
    await t.expect(Selector('.histogram-svg-panel').count).eql(0)
    await t.click(Selector('.expand-toggle'))
    await t.expect(Selector('.histogram-svg-panel').count).eql(1)
    await t.click(Selector('.expand-toggle'))
    await t.expect(Selector('.histogram-svg-panel').count).eql(0)
})

urbanstatsFixture('article test', `${TARGET}/article.html?longname=Germany&universe=world`)

test('histogram-basic-article', async (t) => {
    await waitForLoading(t) // Need to avoid a race condition between map loading and page resizing
    await t.resizeWindow(400, 800)
    await t.click(Selector('.expand-toggle'))
    await screencap(t)
    await download_or_check_histogram(t, 'histogram-basic-article')
})

test('histogram-basic-article-multi', async (t) => {
    await waitForLoading(t) // Need to avoid a race condition between map loading and page resizing
    await t.resizeWindow(400, 800)
    await check_textboxes(t, ['Other Density Metrics'])
    const count = await Selector('.expand-toggle').count
    for (let i = 0; i < count; i++) {
        await t.click(Selector('.expand-toggle').nth(i))
    }
    await screencap(t)
    await download_image(t)
    await download_histogram(t, 0)
    await download_histogram(t, 1)
})

urbanstatsFixture('comparison test heterogenous', comparison_page(['San Marino city, California, USA', pasadena, sw_sgv]))

test('histogram-basic-comparison', async (t) => {
    await waitForLoading(t) // Need to avoid a race condition between map loading and page resizing
    await t.resizeWindow(400, 800)
    // select element with class name `expand-toggle`
    await t.expect(Selector('.expand-toggle').count).eql(1)
    await t.click(Selector('.expand-toggle'))
    await screencap(t)
    await download_or_check_histogram(t, 'histogram-basic-comparison')
})

urbanstatsFixture('comparison test heterogenous with nan', comparison_page(['India', 'China', pasadena]))

test('histogram-basic-comparison-nan', async (t) => {
    await waitForLoading(t) // Need to avoid a race condition between map loading and page resizing
    await t.resizeWindow(400, 800)
    // select element with class name `expand-toggle`
    await t.expect(Selector('.expand-toggle').count).eql(2)
    await t.click(Selector('.expand-toggle').nth(1))
    await screencap(t)
    await download_or_check_histogram(t, 'histogram-basic-comparison-nan')
})

urbanstatsFixture('comparison test heterogenous with nan in the middle', comparison_page(['India', pasadena, 'China']))

test('histogram-basic-comparison-nan-middle', async (t) => {
    await waitForLoading(t) // Need to avoid a race condition between map loading and page resizing
    await t.resizeWindow(400, 800)
    // select element with class name `expand-toggle`
    await t.expect(Selector('.expand-toggle').count).eql(1)
    await t.click(Selector('.expand-toggle').nth(0))
    await screencap(t)
    await download_or_check_histogram(t, 'histogram-basic-comparison-nan-middle')
})

urbanstatsFixture('comparison ordering test', `${TARGET}/comparison.html?longnames=%5B%22USA%22%2C%22United+Kingdom%22%5D`)

test('histogram-ordering', async (t) => {
    await t.expect(Selector('.expand-toggle').count).eql(2)
    await t.click(Selector('.expand-toggle').nth(1))
    await screencap(t)
    await download_or_check_histogram(t, 'histogram-ordering')
})
