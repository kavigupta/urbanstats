import { ClientFunction, Selector } from 'testcafe'

import { sanitize } from '../src/utils/paths'
import { shardBytesFullNum } from '../src/utils/shardHash'

import {
    checkAllCategoryBoxes, checkSidebarTextboxes, checkTextboxes, safeReload, screencap,
    urbanstatsFixture,
    getLocation,
    clickMapFeature,
    saveString,
    waitForLoading,
    downloadCSV,
    withInterceptedRequests,
    clickUniverseFlag,
} from './test_utils'

function articleUrl(longname: string): string {
    return `/article.html?longname=${encodeURIComponent(longname).replace(/%20/g, '+')}`
}

urbanstatsFixture('weather F', '/article.html?longname=California%2C+USA&s=jV3GG2h8Vfb')

test('is F', async (t) => {
    await t.expect(Selector('span').withExactText('61.5').exists).ok()
})

const temperatureSelect = Selector('[data-test-id=temperature_select]')

test('change to C and back to F', async (t) => {
    await t.click(temperatureSelect).click(temperatureSelect.find('option').withText(/C/))
    await t.expect(Selector('span').withExactText('26.9').exists).ok()
    await t.click(temperatureSelect).click(temperatureSelect.find('option').withText(/F/))
    await t.expect(Selector('span').withExactText('61.5').exists).ok()
})

test('paste C link', async (t) => {
    await checkSidebarTextboxes(t, ['Simple Ordinals']) // to save settings
    await t.navigateTo('/article.html?longname=California%2C+USA&s=jV3GG2h8Vfs')
    await t.expect(Selector('[data-test-id=staging_controls]').exists).ok()
    await t.expect(Selector('span').withExactText('26.9').exists).ok()
    await screencap(t)
})

urbanstatsFixture('no-domestic-stats', '/article.html?longname=US+Virgin+Islands%2C+USA')

test('virgin-islands', async (t) => {
    await screencap(t)
})

urbanstatsFixture('some-stats-missing', '/article.html?longname=Pueblo East CDP%2C+Texas%2C+USA')

test('pueblo-east-cdp', async (t) => {
    await checkTextboxes(t, ['Transportation'])
    await screencap(t)
})

urbanstatsFixture('4 digit election swing', '/article.html?longname=Corpus+Christi+city%2C+Texas%2C+USA&s=GczH23rwqX34ctu')

test('overflows correctly on mobile', async (t) => {
    await t.resizeWindow(400, 800)
    await safeReload(t) // Since the map loading is racing with the window size
    await screencap(t)
})

urbanstatsFixture('article with many /', '/article.html?longname=Victory+Manor%2FEast+Hill%2FDonwood+Neighborhood%2C+Savannah+City%2C+Georgia%2C+USA')

test('loads successfully', async (t) => {
    await t.expect(Selector('div').withExactText('Victory Manor/East Hill/Donwood, Savannah').exists).ok()
})

test('has the correct URL after loading', async (t) => {
    await t.expect(getLocation()).match(/article\.html\?longname=Victory\+Manor%2FEast\+Hill%2FDonwood\+Neighborhood%2C\+Savannah\+City%2C\+Georgia%2C\+USA/)
})

urbanstatsFixture('article with neighbor whose title is two lines', '/article.html?longname=Charlotte+NC+Media+Market%2C+USA')

test('when navigating to next media market that is two lines, maintains relative position of pointer', async (t) => {
    const scrollPosition = ClientFunction(() => window.scrollY)
    const pointerPosition = ClientFunction(() => document.querySelector('button[data-test-id="1"]')!.getBoundingClientRect().top)

    const before = {
        pointerPosition: await pointerPosition(),
        scrollPosition: await scrollPosition(),
    }

    await t.click(Selector('button[data-test-id="1"]').nth(0))
    await t.expect(Selector('div').withExactText('Raleigh-Durham (Fayetteville) NC Media Market').exists).ok()

    const after = {
        pointerPosition: await pointerPosition(),
        scrollPosition: await scrollPosition(),
    }

    // Page has scrolled to maintain pointer position
    await t.expect(after.scrollPosition).notEql(before.scrollPosition)

    await t.expect(after.pointerPosition).eql(before.pointerPosition)
})

test('when navigating to next media market that is two lines via map click, maintains relative position of map', async (t) => {
    const scrollPosition = ClientFunction(() => window.scrollY)
    const mapPosition = ClientFunction(() => document.querySelector('.maplibregl-canvas-container')!.getBoundingClientRect().top)
    // scroll down to bottom of the map
    await t.scrollIntoView(Selector('a').withExactText('North America'))

    const before = {
        mapPosition: await mapPosition(),
        scrollPosition: await scrollPosition(),
    }

    await clickMapFeature(/Raleigh-Durham \(Fayetteville\) NC Media Market/)
    await t.expect(Selector('div').withExactText('Raleigh-Durham (Fayetteville) NC Media Market').exists).ok()

    const after = {
        mapPosition: await mapPosition(),
        scrollPosition: await scrollPosition(),
    }

    // Page has scrolled to maintain pointer position
    await t.expect(after.scrollPosition).notEql(before.scrollPosition)

    await t.expect(after.mapPosition).eql(before.mapPosition)
})

test('can navigate back to original navigated shape in map', async (t) => {
    await clickMapFeature(/Raleigh-Durham \(Fayetteville\) NC Media Market/)
    await t.expect(Selector('div').withExactText('Raleigh-Durham (Fayetteville) NC Media Market').exists).ok()
    await clickMapFeature(/Charlotte NC Media Market, USA/)
    await t.expect(Selector('div').withExactText('Charlotte NC Media Market').exists).ok()
})

urbanstatsFixture('historical congressional', '/article.html?longname=Historical+Congressional+District+CA-46%2C+108th-112th+Congress%2C+USA')

test('historical congressional', async (t) => {
    await checkSidebarTextboxes(t, ['Include Historical Districts'])
    await screencap(t)
})

function screenshotOfPage(name: string, url: string): void {
    urbanstatsFixture(name, url)
    test(name, async (t) => {
        await screencap(t)
    })
}

screenshotOfPage('congressional district', '/article.html?longname=CA-46%2C+USA')
screenshotOfPage('congressional district at large', '/article.html?longname=VT-00%2C+USA')
screenshotOfPage('legislative district complicated name', '/article.html?longname=VT-HDB-1%2C+USA')
screenshotOfPage('legislative district short name', '/article.html?longname=CA-SD023%2C+USA')
screenshotOfPage('county cross district', '/article.html?longname=WY-00+in+Natrona+County%2C+USA')

urbanstatsFixture('washington no relateds', '/article.html?longname=China&s=PnVFWSmVr78Jm')

test('region on map is not clickable', async (t) => {
    const historyLength = ClientFunction(() => history.length)
    const initialHistoryLength = await historyLength()
    await t.click('.maplibregl-map') // Click China
    await t.expect(historyLength()).eql(initialHistoryLength)
})

urbanstatsFixture('csv-export', `/article.html?longname=Rafael+Pena+CDP%2C+Texas%2C+USA&s=4YGF3xUkfbjxoj`)

test('download-article-csv-settings-ignored', async (t) => {
    const csvContent = await downloadCSV(t)

    saveString(t, csvContent, 'csv-export-california-article', 'csv', false)
})

test('loading indicator', async (t) => {
    // Loading indicator appears when shape load fails or is delayed
    await withInterceptedRequests(t, request => request.url.includes('shape') ? 'fail' : 'continue', async () => {
        await t.click(Selector('button[data-test-id="1"]'))
        await t.expect(Selector('[data-test-id=longLoad]').exists).ok()

        await screencap(t, { wait: false })
    })
})

urbanstatsFixture('uncheck all years', '/article.html?longname=California%2C+USA')

test('uncheck all years exits staged mode', async (t) => {
    // Check all year checkboxes, then uncheck them, and verify that staged mode is exited (staging controls disappear)
    await checkTextboxes(t, ['Geographic Identifiers'])
    await waitForLoading()
    await checkTextboxes(t, ['2020'])
    await waitForLoading()
    await checkTextboxes(t, ['2020'])
})

const edgeCaseHashes: { longname: string, expectedHash: number, expectedCompactness: string }[] = [
    // hash collisions
    { longname: 'NC-02 (1899), USA', expectedHash: 0xf4fbd73f, expectedCompactness: '0.151' },
    { longname: 'East Earl township [CCD], Lancaster County, Pennsylvania, USA', expectedHash: 0xf4fbd73f, expectedCompactness: '0.460' },
    { longname: 'Hilltop Neighborhood, Denver City, Colorado, USA', expectedHash: 0xb0c41bff, expectedCompactness: '0.408' },
    { longname: 'Walland CDP, Tennessee, USA', expectedHash: 0xb0c41bff, expectedCompactness: '0.455' },
    // early hashes
    { longname: 'MO-03 (1973), USA', expectedHash: 0x0000a4ba, expectedCompactness: '0.395' },
    { longname: 'Hpakant Metropolitan Cluster, Myanmar', expectedHash: 0x0000a758, expectedCompactness: '0.0309' },
    // late hashes
    { longname: 'Tilhar Metropolitan Cluster, India', expectedHash: 0xffffce8b, expectedCompactness: '0.0281' },
    { longname: 'Patchogue-Medford Union Free School District, New York, USA', expectedHash: 0xfffff4b0, expectedCompactness: '0.428' },
]

urbanstatsFixture('edge case hashes', articleUrl(edgeCaseHashes[0].longname))

test('hash collisions: hashes match and all pages load with correct compactness', async (t) => {
    for (const entry of edgeCaseHashes) {
        const h = shardBytesFullNum(sanitize(entry.longname))
        await t.expect(h).eql(entry.expectedHash, `hash("${entry.longname}")`)
    }
    for (const entry of edgeCaseHashes) {
        await t.navigateTo(articleUrl(entry.longname))
        await checkAllCategoryBoxes(t)
        await t.expect(Selector('span').withExactText(entry.expectedCompactness).exists).ok()
    }
})

urbanstatsFixture('make sure ties in custom table are resolved appropriately', '/article.html?longname=33523%2C+USA&s=2cB5JjRm6YapUJ19cevM')

async function getAllTexts(t: TestController, selector: Selector): Promise<string[]> {
    await t.expect(selector.count).gt(0)
    const count = await selector.count
    const texts: string[] = []
    for (let i = 0; i < count; i++) {
        texts.push(await selector.nth(i).innerText)
    }
    return texts
}

async function testSameOrdinalPercentile(t: TestController): Promise<void> {
    // pull the longname from "centered_text subheadertext" div
    const longname = await Selector('div').withAttribute('class', 'centered_text subheadertext').nth(0).innerText
    // pull the index: data-test-id="statistic-ordinal"
    const index = await Selector('div').withAttribute('data-test-id', 'statistic-ordinal').nth(0).innerText
    // navigate to the table
    await t.click(Selector('a').withExactText('Coronary heart disease %'))
    // // make sure a div with the text 33523, USA exists
    // await t.expect(Selector('div').withExactText(longname).exists).ok()
    const tableLongnames = await getAllTexts(t, Selector('a').withAttribute('data-test-id', 'statistic-panel-longname-link'))
    const tableIndices = await getAllTexts(t, Selector('div').withAttribute('data-test-id', 'statistic-ordinal'))
    await t.expect(tableLongnames).contains(longname)
    const indexInTable = tableLongnames.indexOf(longname)
    await t.expect(tableIndices[indexInTable]).eql(index.split(' ')[0])
}

test('custom table tie-breaking', async (t) => {
    await testSameOrdinalPercentile(t)
})

test('custom table tie-breaking in universe', async (t) => {
    // florida
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await clickUniverseFlag(t, 'Florida, USA')
    await testSameOrdinalPercentile(t)
})
