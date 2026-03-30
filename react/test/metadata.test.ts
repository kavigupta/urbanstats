import { ClientFunction, Selector } from 'testcafe'

import {
    checkTextboxes,
    comparisonPage,
    dataValues,
    getLocation,
    screencap,
    target,
    urbanstatsFixture,
    waitForLoading,
} from './test_utils'

const sanMarinoArticle = `${target}/article.html?longname=San+Marino+city%2C+California%2C+USA`

function longnamesFromComparisonUrl(href: string): string[] {
    const u = new URL(href)
    const raw = u.searchParams.get('longnames')
    if (raw === null) {
        return []
    }
    return JSON.parse(raw) as string[]
}

const checkSortControl = ClientFunction((t: string) => {
    const anchor = Array.from(document.querySelectorAll('a[data-test-id="statistic-link"]')).find(a => a.textContent === t)
    if (anchor?.parentElement === null || anchor?.parentElement === undefined) {
        throw new Error(`statistic header link not found for target: ${t}`)
    }
    const img = anchor.parentElement.querySelector('img.testing-order-swap')
    if (img === null) {
        throw new Error(`column sort control not found for target: ${t}`)
    }
    ;(img as HTMLElement).click()
})

urbanstatsFixture('metadata article display', sanMarinoArticle)

test('metadata-article-fips-visible-screenshot', async (t) => {
    await checkTextboxes(t, ['Main', 'Geographic Identifiers'])
    await waitForLoading()
    await t.expect(Selector('a[data-test-id=statistic-link]').withExactText('FIPS').exists).ok()
    await t.expect(await dataValues()).eql(['0668224'])
    await screencap(t)
})

test('metadata-article-fips-header-navigates-to-data-credit-geoid-section', async (t) => {
    await checkTextboxes(t, ['Main', 'Geographic Identifiers'])
    await waitForLoading()
    await t.click(Selector('a[data-test-id=statistic-link]').withExactText('FIPS'))
    await t.expect(getLocation()).eql(`${target}/data-credit.html#explanation_geoid`)
})

const pas = 'Pasadena city, California, USA'
const sm = 'San Marino city, California, USA'
const van = 'Greater Vancouver Regional district, British Columbia, Canada'
const fv = 'Fraser Valley Regional district, British Columbia, Canada'
const california = 'California, USA'
const ontario = 'Ontario, Canada'
const mexico = 'Mexico'

urbanstatsFixture(
    'metadata comparison (both us cities)',
    comparisonPage([pas, sm]),
)

test('us-cities-sort-by-fips', async (t) => {
    await checkTextboxes(t, ['Main', 'Geographic Identifiers'])
    await waitForLoading()
    await t.expect(longnamesFromComparisonUrl(await getLocation())).eql([pas, sm])
    await t.expect(await dataValues()).eql(['0656000', '0668224'])
    await checkSortControl('FIPS')
    await waitForLoading()
    await t.expect(longnamesFromComparisonUrl(await getLocation())).eql([sm, pas])
    await t.expect(await dataValues()).eql(['0668224', '0656000'])
    await checkSortControl('FIPS')
    await waitForLoading()
    await t.expect(longnamesFromComparisonUrl(await getLocation())).eql([pas, sm])
    await t.expect(await dataValues()).eql(['0656000', '0668224'])
})

urbanstatsFixture(
    'metadata comparison (us cities + canadian municipalities) -- only two metadata rows should be shown',
    comparisonPage([pas, sm, van, fv]),
)

test('us-can-cities-can-sort-various', async (t) => {
    await checkTextboxes(t, ['Main', 'Geographic Identifiers'])
    await waitForLoading()
    await t.expect(longnamesFromComparisonUrl(await getLocation())).eql([pas, sm, van, fv])
    await t.expect(await dataValues()).eql(['0656000', '0668224', '', '', '', '', '5915', '5909'])
    await checkSortControl('FIPS')
    await t.expect(longnamesFromComparisonUrl(await getLocation())).eql([sm, pas, van, fv])
    await t.expect(await dataValues()).eql(['0668224', '0656000', '', '', '', '', '5915', '5909'])
    await checkSortControl('StatCan GeoCode')
    await t.expect(longnamesFromComparisonUrl(await getLocation())).eql([van, fv, sm, pas])
    await t.expect(await dataValues()).eql(['', '', '0668224', '0656000', '5915', '5909', '', ''])
    await checkSortControl('StatCan GeoCode')
    await t.expect(longnamesFromComparisonUrl(await getLocation())).eql([fv, van, sm, pas])
    await t.expect(await dataValues()).eql(['', '', '0668224', '0656000', '5909', '5915', '', ''])
})

urbanstatsFixture(
    'all 3 metadata types',
    comparisonPage([sm, pas, van, fv, california, ontario, mexico]),
)

test('metadata-comparison-mixed-countries-has-empty-metadata-value-cells', async (t) => {
    await checkTextboxes(t, ['Main', 'Geographic Identifiers'])
    await waitForLoading()
    await screencap(t)
})
