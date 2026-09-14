import { Selector } from 'testcafe'

import { getErrors } from './mapper-utils'
import { getLocation, screencap, target, urbanstatsFixture, waitForLoading } from './test_utils'

const uss = 'customNode(""); condition (true); table(columns=[column(values=population)])'

function url(over: { universe: string, geographyKind: string }[]): string {
    const params = new URLSearchParams({
        uss,
        geographies: JSON.stringify(over),
        start: '1',
        amount: '5',
        edit: 'true',
    })
    return `${target}/statistic.html?${params.toString()}`
}

function geographies(...universes: string[]): { universe: string, geographyKind: string }[] {
    return universes.map(universe => ({ universe, geographyKind: 'Subnational Region' }))
}

function rowInput(row: number, which: 0 | 1): Selector {
    return Selector('[data-test-id=test-geography-row]').nth(row).find('input')
        .nth(which)
}

async function locationGeographies(): Promise<unknown> {
    const param = new URL(await getLocation()).searchParams.get('geographies')
    return param === null ? undefined : JSON.parse(param)
}

urbanstatsFixture('a table over two universes', url(geographies('USA', 'Canada')))

test('rows come from both universes', async (t) => {
    await waitForLoading()
    await t.expect(getErrors()).eql([])
    await t.expect(Selector('div').withText(/, USA$/).exists).ok()
    await t.expect(Selector('div').withText(/, Canada$/).exists).ok()
    await screencap(t)
})

// Each row's article is in the universe its geography came from, not the page's default.
test('a row links to its own universe', async (t) => {
    await waitForLoading()
    const canadian = Selector('[data-test-id=statistic-panel-longname-link]').withText(/, Canada$/)
    await t.expect(canadian.getAttribute('href')).contains('universe=Canada')
})

test('the header keeps a universe only while there is one', async (t) => {
    const universeFlag = Selector('button').withAttribute('aria-label', 'Switch Universes')
    await t.expect(universeFlag.exists).notOk()
    await t.click(Selector('[data-test-id=test-remove-geography-button]').nth(1))
    await waitForLoading()
    await t.expect(universeFlag.exists).ok()
})

urbanstatsFixture('a table over one universe', url(geographies('USA')))

test('adding a geography moves the link to the list form', async (t) => {
    await t.expect(await locationGeographies()).eql(undefined)
    await t.expect(getLocation()).contains('article_type=Subnational+Region')

    await t.click(Selector('[data-test-id=test-add-geography-button]'))
    const universe = rowInput(1, 0)
    await t.click(universe).selectText(universe).typeText(universe, 'Canada').pressKey('enter')
    await waitForLoading()

    await t.expect(await locationGeographies()).eql(geographies('USA', 'Canada'))
    await t.expect(getLocation()).notContains('article_type=')
    await t.expect(getErrors()).eql([])
})

test('removing every geography says so rather than showing an empty table', async (t) => {
    await t.click(Selector('[data-test-id=test-remove-geography-button]').nth(0))
    await waitForLoading()
    await t.expect(getErrors()).eql(['There are no geographies to tabulate. Add one to the list above.'])
})

// The form every link made before a table could span several geographies is in.
urbanstatsFixture('a link naming its geography as scalars', `${target}/statistic.html?uss=${encodeURIComponent(uss)}&article_type=County&universe=USA&start=1&amount=5&edit=true`)

test('a link naming its geography as scalars', async (t) => {
    await waitForLoading()
    await t.expect(Selector('[data-test-id=test-geography-row]').count).eql(1)
    await t.expect(rowInput(0, 0).value).eql('USA')
    await t.expect(rowInput(0, 1).value).eql('County')
    await t.expect(getErrors()).eql([])
})

urbanstatsFixture('converting a multi-geography table to a map', url(geographies('USA', 'Canada')))

test('converting a multi-geography table to a map keeps both', async (t) => {
    await waitForLoading()
    await t.click(Selector('[data-test-id=convert-to-map]'))
    await waitForLoading()
    await t.expect(getLocation()).contains('/mapper.html')
    await t.expect(Selector('[data-test-id=test-geography-row]').count).eql(2)
    await t.expect(getErrors()).eql([])
})
