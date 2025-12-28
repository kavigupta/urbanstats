import { parse } from 'csv-parse/sync'
import { Selector } from 'testcafe'

import { nthEditor, typeInEditor, typeTextWithKeys } from './editor_test_utils'
import { getErrors, replaceInput, toggleCustomScript } from './mapper-utils'
import { target, getLocation, screencap, urbanstatsFixture, clickUniverseFlag, downloadOrCheckString, waitForLoading, dataValues, checkTextboxes, checkTextboxesDirect, downloadCSV, downloadImage } from './test_utils'

urbanstatsFixture('statistic.html default page', `${target}/statistic.html`)

test('statistic.html-default-page', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.wait(1000)
    await waitForLoading()
    const location = await getLocation()
    // Check that it redirected to the default Custom Table page
    await t.expect(location).contains('/statistic.html?')
    await t.expect(location).contains('article_type=Subnational+Region')
    await t.expect(location).contains('uss=')
    await t.expect(location).contains('start=1')
    await t.expect(location).contains('amount=20')
    await t.expect(location).contains('universe=USA')
    await t.expect(location).contains('edit=true')
    await screencap(t)
})

urbanstatsFixture('statistics', `${target}/article.html?longname=Indianapolis+IN+HRR%2C+USA`)

test('statistics-page', async (t) => {
    await t.resizeWindow(1400, 800)
    // click the link labeled "Population"
    await t
        .click(Selector('a').withText(/^Population$/))
    // assert url is https://urbanstats.org/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20
    await t.expect(getLocation())
        .eql(`${target}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20&universe=USA`)
    await screencap(t)
    const count = Selector('div').withAttribute('style', /background-color: rgb\(212, 181, 226\);/)
        .withText(/Indianapolis IN HRR, USA/)
    await t.expect(count.count).gte(1, 'Need highlighting')
    // click link "Data Explanation and Credit"
    await t
        .click(Selector('a').withText(/^Data Explanation and Credit$/))
    await t.expect(getLocation())
        .eql(`${target}/data-credit.html#explanation_population`)
})

urbanstatsFixture('statistics-navigation', `${target}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20`)

test('statistics-navigation-left', async (t) => {
    await t
        .click(Selector('button[data-test-id="-1"]'))
    const url = `${target}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=20`
    await t.expect(getLocation())
        .eql(url)
    // going left again is not an option
    await t.expect(Selector('button[data-test-id="-1"][disabled]').exists).ok()
})

test('statistics-navigation-right', async (t) => {
    await t
        .click(Selector('button[data-test-id="1"]'))
    await t.expect(getLocation())
        .eql(`${target}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=41&amount=20`)
})

test('statistics-navigation-amount', async (t) => {
    // take the select field that currently says 20 and make it say 50
    const amount = Selector('select').withText(/20/).nth(0)
    await t
        .click(amount)
        .click(Selector('option').withText(/50/))
    await t.expect(getLocation())
        .eql(`${target}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=50`)
    await screencap(t)
    // set to All
    await t
        .click(amount)
        .click(Selector('option').withText(/All/))
    await t.expect(getLocation())
        .eql(`${target}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=All`)
    await screencap(t)
})

test('statistics-navigation-last-page', async (t) => {
    // find input with value 2, then replace it with 15
    const page = Selector('input').withAttribute('value', '2')
    await t
        .click(page)
        .pressKey('ctrl+a')
        .typeText(page, '15')
        .pressKey('enter')

    const url = `${target}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=281&amount=20`

    await t.expect(getLocation())
        .eql(url)

    await screencap(t)
    // going right again is not available
    await t.expect(Selector('button[data-test-id="1"][disabled]').exists).ok()
})

test('statistics-csv-export', async (t) => {
    const csvContent = await downloadCSV(t)
    await downloadOrCheckString(t, csvContent, 'csv-export-population-statistics', 'csv', false)
})

urbanstatsFixture('statistic universe selector test', `${target}/statistic.html?statname=Population&article_type=City&start=3461&amount=20`)

const universeSelector = 'img.universe-selector'

test('statistic-universe-selector-test', async (t) => {
    await t.click(universeSelector)
    await screencap(t)
    await clickUniverseFlag(t, 'Puerto Rico, USA')
    await t.expect(getLocation())
        .eql(`${target}/statistic.html?statname=Population&article_type=City&start=261&amount=20&universe=Puerto+Rico%2C+USA`)
    await screencap(t)
})

test('universe search field', async (t) => {
    await t.click(universeSelector).typeText('[data-test-id=universe-search]', 'new')
    await screencap(t)
    await t.click(Selector('div').withExactText('New Mexico, USA'))
    await t.expect(getLocation()).eql(`${target}/statistic.html?statname=Population&article_type=City&start=501&amount=20&universe=New+Mexico%2C+USA`)
})

urbanstatsFixture('statistic universe availability test', `${target}/statistic.html?statname=Commute+Car+__PCT__&article_type=Subnational+Region&start=21&amount=20&universe=USA`)

test('statistic-universe availability test', async (t) => {
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    const options = Selector('img').withAttribute('class', 'universe-selector-option')
    await t.expect(options.count).eql(56)
    // take the first 10 options and get the alt attribute
    const firstTen: (string | null)[] = []
    for (let i = 0; i < 10; i++) {
        firstTen.push(await options.nth(i).getAttribute('alt'))
    }
    await t.expect(firstTen).eql([
        'world',
        'North America',
        'Oceania',
        'USA',
        'Alabama, USA',
        'Alaska, USA',
        'Arizona, USA',
        'Arkansas, USA',
        'California, USA',
        'Colorado, USA',
    ])
})

urbanstatsFixture('statistic ascending descending', `${target}/statistic.html?statname=Population&article_type=Subnational+Region&start=1&amount=10`)

// get elements on page

async function getElements(): Promise<string[]> {
    const elements = Selector('div').withText(/, USA$/)
    const texts: string[] = []
    for (let i = 0; i < (await elements.count); i++) {
        texts.push(await elements.nth(i).innerText)
    }
    return texts
}

test('statistic-ascending-descending-check-descending', async (t) => {
    await waitForLoading()
    // ensure the div with California and ensure 1 is in the div
    await t.expect(await getElements()).eql([
        'California, USA',
        'Texas, USA',
        'Florida, USA',
        'New York, USA',
        'Pennsylvania, USA',
        'Illinois, USA',
        'Ohio, USA',
        'Georgia, USA',
        'North Carolina, USA',
        'Michigan, USA',
    ])
})

test('statistic-ascending-descending-check-click', async (t) => {
    // click the button
    // check that button "testing-order-swap" has downwards arrow image
    await t.expect(Selector('.testing-order-swap').getAttribute('src')).eql('/sort-down.png')
    await t.click(Selector('.testing-order-swap'))
    // ensure the button is now up arrow
    await t.expect(Selector('.testing-order-swap').getAttribute('src')).eql('/sort-up.png')
    await waitForLoading()
    // check the url
    await t.expect(getLocation())
        .eql(`${target}/statistic.html?statname=Population&article_type=Subnational+Region&start=1&amount=10&order=ascending`)

    await t.expect(await getElements()).eql([
        'Wyoming, USA',
        'Vermont, USA',
        'District of Columbia, USA',
        'Alaska, USA',
        'North Dakota, USA',
        'South Dakota, USA',
        'Delaware, USA',
        'Montana, USA',
        'Rhode Island, USA',
        'Maine, USA',
    ])
    // click the button again
    await t.click(Selector('.testing-order-swap'))
    // check the url again
    await t.expect(getLocation())
        .eql(`${target}/statistic.html?statname=Population&article_type=Subnational+Region&start=1&amount=10`)
    await t.expect(Selector('.testing-order-swap').exists).ok()
})

urbanstatsFixture('statistic ascending', `${target}/statistic.html?statname=Households+With+no+Vehicle+%25&article_type=Subnational+Region&start=21&amount=20&order=ascending&universe=USA`)

test('statistic-ascending-page', async (t) => {
    // We should see the state with the least vehicles, which is DC
    await t.expect(Selector('div').withExactText('1').exists).ok()
    await t.expect(Selector('div').withExactText('District of Columbia, USA').exists).ok()
})

urbanstatsFixture('stats page without enough geos to fill', `${target}/statistic.html?statname=Population&article_type=County&start=1&amount=20&universe=Arizona%2C+USA`)

test('displays without error', async (t) => {
    await screencap(t)
})

urbanstatsFixture('40 Mass state senate districts', `${target}/statistic.html?statname=Population&article_type=State+Senate+District&start=1&amount=20&universe=Massachusetts%2C+USA`)

test('shows correct number of rows when count is multiple of amount', async (t) => {
    await t.expect(Selector('div').withExactText('20').exists).ok()
    await t.expect(Selector('div').withExactText('21').exists).notOk()
})

function createUSSStatisticsPage(uss: string, start = 1, amount = 20, universe = 'California, USA'): string {
    return `${target}/statistic.html?uss=${encodeURIComponent(uss)}&article_type=County&start=${start}&amount=${amount}&universe=${encodeURIComponent(universe)}`
}

const basicPage = `table(
    columns=[
        column(
            values=(density_pw_1km / density_pw_2km),
            name="Density Ratio",
            unit=unitNumber
        )
    ]
)`

function extractComponents(url: string, exclude: string[]): Record<string, string> {
    const params = new URL(url).searchParams
    const result: Record<string, string> = {}
    params.forEach((value, key) => {
        if (exclude.includes(key)) return
        result[key] = value
    })
    return result
}

urbanstatsFixture('Basic USS statistics page with named column', createUSSStatisticsPage(basicPage))

test('USS statistics page displays correctly', async (t) => {
    await t.expect(Selector('div').withExactText('Density Ratio').exists).ok()
    await screencap(t)
})

test('navigation on USS statistics page works', async (t) => {
    const first = 'Sierra County, California, USA'
    const twentyFirst = 'San Luis Obispo County, California, USA'
    const last = 'Santa Clara County, California, USA'
    await t.expect(Selector('div').withExactText(first).exists).ok()
    await t.expect(Selector('div').withExactText(twentyFirst).exists).notOk()
    await t.expect(Selector('div').withExactText(last).exists).notOk()
    // second page (21-58)
    await t.click(Selector('button[data-test-id="1"]'))
    await waitForLoading()
    await t.expect(extractComponents(await getLocation(), ['uss'])).eql({
        article_type: 'County',
        start: '21',
        amount: '20',
        universe: 'California, USA',
    })
    await t.expect(Selector('div').withExactText(first).exists).notOk()
    await t.expect(Selector('div').withExactText(twentyFirst).exists).ok()
    await t.expect(Selector('div').withExactText(last).exists).ok()
    // swap order to ascending (58-39)
    await t.click(Selector('.testing-order-swap'))
    await waitForLoading()
    await t.expect(extractComponents(await getLocation(), ['uss'])).eql({
        article_type: 'County',
        start: '1',
        amount: '20',
        universe: 'California, USA',
        order: 'ascending',
    })
    await t.expect(Selector('div').withExactText(first).exists).notOk()
    await t.expect(Selector('div').withExactText(twentyFirst).exists).notOk()
    await t.expect(Selector('div').withExactText(last).exists).ok()
    // swap universe to Texas
    await t.click(Selector(universeSelector))
    await t.click(Selector('div').withExactText('Texas, USA'))
    await waitForLoading()
    await t.expect(extractComponents(await getLocation(), ['uss'])).eql({
        article_type: 'County',
        start: '1',
        amount: '20',
        universe: 'Texas, USA',
        order: 'ascending',
    })
    await t.expect(Selector('div').withText(/, California, USA/).exists).notOk()
    await t.expect(Selector('div').withExactText('Fort Bend County, Texas, USA').exists).ok()
    // switch to edit mode
    await t.click(Selector('button[data-test-id="edit"]'))
    await waitForLoading()
    // switch back to California via universe selector
    await t.click(Selector(universeSelector))
    await t.click(Selector('div').withExactText('California, USA'))
    await waitForLoading()
    // check that we are still in edit mode
    await t.expect(Selector('button[data-test-id="view"]').exists).ok()
})

test('universe/geography have no overlap', async (t) => {
    // change universe to Europe (no US counties should appear)
    await t.click(Selector(universeSelector))
    await t.click(Selector('div').withExactText('Europe'))
    await waitForLoading()
    await t.expect(Selector('div').withText(/, USA/).exists).notOk()
    await t.expect(await getErrors()).eql([`There are no Counties in Europe. Either adjust your universe or geography kind.`])
})

urbanstatsFixture('edit starting from a statname page', `${target}/statistic.html?statname=Population&article_type=County&start=1&amount=5&universe=California%2C+USA`)

const densityRatio = ['3.035', '2.490', '2.282', '2.276', '2.100']
const densityRatioPage2 = ['1.971', '1.956', '1.897', '1.888', '1.811']

test('edit starting from a statname page works', async (t) => {
    await t.click(Selector('button[data-test-id="edit"]'))
    await waitForLoading()
    await t.wait(1000)
    const populations = [
        '10.0', '3.30', '3.19', '2.42', '2.18',
    ]
    const hispanic = ['85.16', '65.50', '61.83', '61.71', '61.11']
    await t.expect(await dataValues()).eql(populations)
    // should be a USS page now
    await t.expect(getLocation()).contains('uss=')
    await t.wait(1000)
    await t.expect(await dataValues()).eql(populations)
    // replace Population with White %
    await replaceInput(t, 'Population', 'Hispanic %')
    await t.wait(1000)
    await t.expect(await dataValues()).eql(hispanic)
    // switch to custom expression
    await replaceInput(t, 'Hispanic %', 'Custom Expression')
    await t.wait(1000)
    await t.expect(await dataValues()).eql(hispanic)
    await t.expect(nthEditor(0).exists).ok()
    await t.expect(nthEditor(0).textContent).eql('hispanic\n')
    await t.click(nthEditor(0))
    await t.pressKey('ctrl+a backspace')
    await typeTextWithKeys(t, 'density_pw_1km/density_pw_2km')
    await t.wait(1000)
    await t.expect(await dataValues()).eql(densityRatio)
    const text = Selector('div').withAttribute('id', 'test-editor-result')
    await t.expect(text.textContent).eql('Name could not be derived for column, please pass name="<your name here>" to column(...)')
    await screencap(t)
    // set the name
    await checkTextboxes(t, ['Name', 'Unit'])
    await t.click(Selector('textarea'))
    await typeTextWithKeys(t, 'Density Ratio')
    await t.expect(text.exists).notOk() // error box should be gone
    await screencap(t)
    // next page
    await t.click(Selector('button[data-test-id="1"]'))
    await waitForLoading()
    await t.wait(1000)
    await t.expect(await dataValues()).eql(densityRatioPage2)
    await screencap(t)
    // switch to view mode
    await t.click(Selector('button[data-test-id="view"]'))
    await waitForLoading()
    await t.wait(1000)
    await t.expect(await dataValues()).eql(densityRatioPage2)
    await screencap(t)
})

urbanstatsFixture('statistic page uss navigation tests', `${target}/statistic.html?uss=customNode%28%22%22%29%3B%0Acondition+%28true%29%0Atable%28%0A++++columns%3D%5B%0A++++++++column%28%0A++++++++++++values%3DcustomNode%28%22density_pw_1km+%2F+density_pw_2km%22%29%2C%0A++++++++++++name%3D%22Density+Ratio%22%2C%0A++++++++++++unit%3DunitNumber%0A++++++++%29%0A++++%5D%0A%29&article_type=County&start=6&amount=5&universe=California%2C+USA&edit=true`)

test('uss statistics page regression', async (t) => {
    await screencap(t)
})

test('convert table to custom expression and back', async (t) => {
    const url = await getLocation()
    await replaceInput(t, 'Table', 'Custom Expression')
    await waitForLoading()
    await t.wait(500)
    // get code
    await t.expect(nthEditor(0).exists).ok()
    await t.expect(nthEditor(0).textContent).eql(`table(
    columns=[
        column(
            values=density_pw_1km / density_pw_2km,
            name="Density Ratio",
            unit=unitNumber
        )
    ]
)
`)
    await t.expect(await dataValues()).eql(densityRatioPage2)
    await replaceInput(t, 'Custom Expression', 'Table')
    await t.expect(await getLocation()).eql(url)
})

test('parse error', async (t) => {
    await typeInEditor(t, 0, '+')
    await t.expect(await getErrors()).eql(['Parse error: Unexpected end of input at 1:32', 'Parse error: Unexpected end of input'])
    await screencap(t)
})

test('type error', async (t) => {
    await typeInEditor(t, 0, '+"a"')
    await t.expect(await getErrors()).eql(['Invalid types for operator +: number and string at 1:1-35', 'Invalid types for operator +: number and string'])
    await screencap(t)
    await t.click(Selector('button[data-test-id="view"]'))
    await waitForLoading()
    await t.wait(500)
    await t.expect(await getErrors()).eql(['Invalid types for operator +: number and string'])
    await screencap(t)
})

test('error display on correct field -- first', async (t) => {
    await replaceInput(t, 'Constant', 'Custom Expression')
    await typeInEditor(t, 0, '+')
    await t.expect(await getErrors()).eql(['Parse error: Unexpected end of input at 1:32', 'Parse error: Unexpected end of input'])
    await screencap(t)
})

test('error display on correct field -- second', async (t) => {
    await replaceInput(t, 'Constant', 'Custom Expression')
    await typeInEditor(t, 1, '+')
    await t.expect(await getErrors()).eql(['Parse error: Unexpected end of input at 1:16', 'Parse error: Unexpected end of input'])
    await screencap(t)
})

test('warning', async (t) => {
    await checkTextboxesDirect(t, ['Name', 'Unit'])
    await t.wait(100)
    await waitForLoading()
    await t.expect(await getErrors()).eql(['Name could not be derived for column, please pass name="<your name here>" to column(...)'])
    await screencap(t)
    // switch to view mode
    await t.click(Selector('button[data-test-id="view"]'))
    await waitForLoading()
    await t.wait(1000)
    await t.expect(await getErrors()).eql([])
    await screencap(t)
})

test('add filter', async (t) => {
    await checkTextboxesDirect(t, ['Filter?'])
    await typeInEditor(t, 0, 'population>1m', true)
    await waitForLoading()
    await t.wait(1000)
    await t.expect(await dataValues()).eql(['1.163', '1.141', '1.129', '1.127', '1.125'])
    await screencap(t)
})

test('add filter that kicks you to an earlier page', async (t) => {
    await checkTextboxesDirect(t, ['Filter?'])
    await typeInEditor(t, 0, 'population>6m', true) // only one county matches
    await waitForLoading()
    await t.expect(await getLocation()).contains('start=1')
    await t.expect(await dataValues()).eql(['1.127'])
    await screencap(t)
})

function addCaCounty(county: string[]): string[] {
    return county.map(c => `${c} County, California, USA`)
}

async function getAllLongnames(): Promise<string[]> {
    const elements = Selector('a').withAttribute('data-test-id', 'statistic-panel-longname-link')
    const texts: string[] = []
    for (let i = 0; i < (await elements.count); i++) {
        texts.push(await elements.nth(i).innerText)
    }
    return texts
}

async function setUpSecondColumn(t: TestController): Promise<void> {
    await t.click(Selector('button[data-test-id="test-add-vector-element-button"]'))
    // Inyo, Mariposa, Mono, Siskiyou, Trinity
    await waitForLoading()
    await typeInEditor(t, 1, 'density_pw_1km', true)
    await checkTextboxesDirect(t, ['Name', 'Unit'], 1)
}

test('sorting by columns', async (t) => {
    await setUpSecondColumn(t)
    const secondPageByRatio = addCaCounty(['Inyo', 'Mariposa', 'Mono', 'Siskiyou', 'Plumas'])
    const firstPageByDensity = addCaCounty(['San Francisco', 'Los Angeles', 'Alameda', 'Santa Clara', 'San Mateo'])
    // eslint-disable-next-line no-restricted-syntax -- the county, not the color
    const secondPageByDensity = addCaCounty(['Orange', 'San Diego', 'Monterey', 'Santa Barbara', 'Sacramento'])
    // Alpine, Mariposa, Sierra, Trinity, Modoc
    const firstPageByAscDensity = addCaCounty(['Alpine', 'Mariposa', 'Sierra', 'Trinity', 'Modoc'])
    await t.expect(await getAllLongnames()).eql(secondPageByRatio)
    await screencap(t)
    // click second testing-order-swap to sort by second column
    await t.click(Selector('.testing-order-swap').nth(1))
    await waitForLoading()
    await t.expect(await getAllLongnames()).eql(firstPageByDensity)
    await screencap(t)
    // next page
    await t.click(Selector('button[data-test-id="1"]'))
    await waitForLoading()
    await t.expect(await getAllLongnames()).eql(secondPageByDensity)
    await screencap(t)
    // flip to ascending
    await t.click(Selector('.testing-order-swap').nth(1))
    await waitForLoading()
    await t.expect(await getAllLongnames()).eql(firstPageByAscDensity)
    await screencap(t)
})

test('disable ordinals/percentiles and verify CSV export', async (t) => {
    await setUpSecondColumn(t)

    const csvBefore = await downloadCSV(t)
    const parsedBefore: Record<string, string>[] = parse(csvBefore, {
        columns: true,
        skip_empty_lines: true,
    })

    await checkTextboxesDirect(t, ['Hide Ordinals/Percentiles'])
    await replaceInput(t, 'false', 'true')

    await waitForLoading()
    await t.wait(500)

    const csvAfter = await downloadCSV(t)
    const parsedAfter: Record<string, string>[] = parse(csvAfter, {
        columns: true,
        skip_empty_lines: true,
    })

    const headersAfter = Object.keys(parsedAfter[0] || {})
    await t.expect(headersAfter.some(h => h.includes('Ord'))).notOk('CSV should not contain Ordinal columns')
    await t.expect(headersAfter.some(h => h.includes('percentile'))).notOk('CSV should not contain Percentile columns')

    await t.expect(parsedBefore.length).eql(parsedAfter.length, 'CSV should have same number of rows')

    const headersBefore = Object.keys(parsedBefore[0] || {})
    const dataHeadersBefore = headersBefore.filter(h => !h.includes('Ord') && !h.includes('percentile'))

    await t.expect(headersAfter).eql(dataHeadersBefore, 'CSV headers should match (excluding ordinal/percentile columns)')

    for (let i = 0; i < parsedBefore.length; i++) {
        const rowBefore = parsedBefore[i]
        const rowAfter = parsedAfter[i]
        await t.expect(rowAfter.Name).eql(rowBefore.Name, `Row ${i} Name should match`)
        for (const header of dataHeadersBefore) {
            await t.expect(rowAfter[header]).eql(rowBefore[header], `Row ${i} column ${header} should match`)
        }
    }
    await screencap(t)
    await downloadImage(t)
})

interface CSVRow {
    name: string
    values: number[]
    percentiles: number[]
    ordinals: number[]
}

async function getParsedCsv(t: TestController): Promise<CSVRow[]> {
    const csvContent = await downloadCSV(t)
    const parsed: Record<string, string>[] = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
    })
    return parsed.map((row) => {
        const values: number[] = []
        const percentiles: number[] = []
        const ordinals: number[] = []
        for (let i = 0; true; i++) {
            const name = `C${i + 1}`
            if (!row[name]) break
            values.push(parseFloat(row[name].replace(/,/g, '')))
            percentiles.push(parseFloat(row[`${name} percentile`]))
            ordinals.push(parseInt(row[`${name} Ord`], 10))
        }
        return {
            name: row.Name,
            values,
            percentiles,
            ordinals,
        }
    })
}

urbanstatsFixture('render many columns', `${target}/statistic.html?uss=customNode%28%22%22%29%3B%0Acondition+%28true%29%0Atable%28%0A++++columns%3D%5B%0A++++++++column%28values%3Ddensity_pw_1km%2C+name%3D%22C1%22%2C+unit%3DunitDensity%29%2C%0A++++++++column%28values%3Dcommute_transit%2C+name%3D%22C2%22%2C+unit%3DunitPercentage%29%2C%0A++++++++column%28%0A++++++++++++values%3Dtraffic_fatalities_per_capita%2C%0A++++++++++++name%3D%22C3%22%2C%0A++++++++++++unit%3DunitFatalitiesPerCapita%0A++++++++%29%2C%0A++++++++column%28values%3Dbinge_drinking%2C+name%3D%22C4%22%2C+unit%3DunitPercentage%29%2C%0A++++++++column%28values%3Dmedian_household_income_usd%2C+name%3D%22C5%22%2C+unit%3DunitUsd%29%2C%0A++++++++column%28values%3Dindustry_manufacturing%2C+name%3D%22C6%22%2C+unit%3DunitPercentage%29%2C%0A++++++++column%28values%3Dracial_homogeneity_2010%2C+name%3D%22C7%22%2C+unit%3DunitPercentage%29%2C%0A++++++++column%28values%3Duninsured%2C+name%3D%22C8%22%2C+unit%3DunitPercentage%29%0A++++%5D%0A%29&article_type=County&start=1&amount=10&universe=California%2C+USA`)

function inOrder(data: CSVRow[], colIndex: number, ascending: boolean): string[] {
    data.sort((a, b) => {
        if (a.values[colIndex] < b.values[colIndex]) return ascending ? -1 : 1
        if (a.values[colIndex] > b.values[colIndex]) return ascending ? 1 : -1
        return 0
    })
    return data.map(d => d.name)
}

test('render many columns', async (t) => {
    await t.wait(1000)
    await waitForLoading()
    await screencap(t)
    const parsedCsv = await getParsedCsv(t)
    await t.click(Selector('.testing-order-swap').nth(0))
    for (let col = 0; col < 8; col++) {
        for (const isAscending of [false, true]) {
            await t.click(Selector('.testing-order-swap').nth(col))
            await waitForLoading()
            const names = await getAllLongnames()
            const expectedNames = inOrder(parsedCsv, col, isAscending)
            await t.expect(names).eql(expectedNames.slice(0, 10))
            // next page
            await t.click(Selector('button[data-test-id="1"]'))
            await waitForLoading()
            const namesPage2 = await getAllLongnames()
            await t.expect(namesPage2).eql(expectedNames.slice(10, 20))
        }
    }
    await t.wait(1000)
    await waitForLoading()
    await screencap(t)
    await downloadImage(t)
})

test('change title', async (t) => {
    await t.click(Selector('button[data-test-id="edit"]'))
    await waitForLoading()
    await checkTextboxesDirect(t, ['Title'])
    const titleArea = Selector('textarea').withAttribute('placeholder', 'Enter string').nth(-1)
    await t.click(titleArea)
    await t.typeText(titleArea, 'Custom Title')
    await waitForLoading()
    await screencap(t)
})

async function addColumn(t: TestController, string: string): Promise<void> {
    await t.click(Selector('input').withAttribute('placeholder', 'Add column...'))
    await t.typeText(Selector('input').withAttribute('placeholder', 'Add column...'), string)
    await t.pressKey('enter')
    await waitForLoading()
}

test('add columns starting from uss page', async (t) => {
    await addColumn(t, 'binge')
    await t.click(Selector('button[data-test-id="edit"]'))
    await waitForLoading()
    await toggleCustomScript(t)
    // check the custom script
    await t.expect(nthEditor(0).textContent).eql(`table(
    columns=[
        column(values=density_pw_1km, name="C1", unit=unitDensity),
        column(values=commute_transit, name="C2", unit=unitPercentage),
        column(
            values=traffic_fatalities_per_capita,
            name="C3",
            unit=unitFatalitiesPerCapita
        ),
        column(values=binge_drinking, name="C4", unit=unitPercentage),
        column(values=median_household_income_usd, name="C5", unit=unitUsd),
        column(values=industry_manufacturing, name="C6", unit=unitPercentage),
        column(values=racial_homogeneity_2010, name="C7", unit=unitPercentage),
        column(values=uninsured, name="C8", unit=unitPercentage),
        column(values=binge_drinking)
    ]
)
`)
})

urbanstatsFixture('start from a statname', `${target}/statistic.html?statname=White+__PCT__&article_type=County&start=1&amount=20&universe=California%2C+USA`)

test('add columns starting from a statname', async (t) => {
    await addColumn(t, 'binge')
    await addColumn(t, 'natura')
    await addColumn(t, 'z %')
    await screencap(t)
    await t.click(Selector('button[data-test-id="edit"]'))
    await waitForLoading()
    await screencap(t)
    await toggleCustomScript(t)
    await t.expect(nthEditor(0).textContent).eql(`table(
    columns=[
        column(values=white),
        column(values=binge_drinking),
        column(values=naturalized_citizen),
        column(values=gen_z)
    ]
)
`)
})

test('column click off', async (t) => {
    await t.click(Selector('input').withAttribute('placeholder', 'Add column...'))
    const searchResult = Selector('.searchbox-dropdown-item').withExactText('Population')
    await t.expect(searchResult.exists).ok()
    // click off
    await t.click(Selector('div').withExactText('Value'))
    await t.expect(searchResult.exists).notOk()
})

test('column click on element', async (t) => {
    await t.click(Selector('input').withAttribute('placeholder', 'Add column...'))
    const searchResult = Selector('.searchbox-dropdown-item').withExactText('Population')
    await t.expect(searchResult.exists).ok()
    await t.click(searchResult)
    await waitForLoading()
    await t.click(Selector('button[data-test-id="edit"]'))
    await waitForLoading()
    await toggleCustomScript(t)
    await t.expect(nthEditor(0).textContent).eql('table(columns=[column(values=white), column(values=population)])\n')
})
