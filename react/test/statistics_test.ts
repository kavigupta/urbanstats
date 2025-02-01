import { Selector } from 'testcafe'

import { target, getLocation, screencap, urbanstatsFixture } from './test_utils'

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
    const amount = Selector('select').withExactText('20').nth(0)
    await t
        .click(amount)
        .click(Selector('option').withExactText('50'))
    await t.expect(getLocation())
        .eql(`${target}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=50`)
    await screencap(t)
    // set to All
    await t
        .click(amount)
        .click(Selector('option').withExactText('All'))
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

urbanstatsFixture('statistic universe selector test', `${target}/statistic.html?statname=Population&article_type=City&start=3461&amount=20`)

const universeSelector = 'img.universe-selector'

test('statistic-universe-selector-test', async (t) => {
    await t.click(universeSelector)
    await screencap(t)
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'Puerto Rico, USA'))
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
    await t.wait(1000)
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
    // check that button "statistic-panel-order-swap" has text downwards arrow ▼
    await t.expect(Selector('#statistic-panel-order-swap').innerText).eql('▼\ufe0e')
    await t.click(Selector('#statistic-panel-order-swap'))
    // ensure the button is now ▲
    await t.expect(Selector('#statistic-panel-order-swap').innerText).eql('▲\ufe0e')
    await t.wait(1000)
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
    await t.click(Selector('#statistic-panel-order-swap'))
    // check the url again
    await t.expect(getLocation())
        .eql(`${target}/statistic.html?statname=Population&article_type=Subnational+Region&start=1&amount=10`)
    await t.expect(Selector('div').withExactText('▼').exists).ok()
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
