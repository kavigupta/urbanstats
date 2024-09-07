import { Selector } from 'testcafe'

import { TARGET, getLocation, screencap } from './test_utils'

fixture('statistics')
    .page(`${TARGET}/article.html?longname=Indianapolis+IN+HRR%2C+USA`)
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('statistics-page', async (t) => {
    await t.resizeWindow(1400, 800)
    await t.eval(() => { location.reload() })
    // click the link labeled "Population"
    await t
        .click(Selector('a').withText(/^Population$/))
    // assert url is https://urbanstats.org/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20
    await t.expect(getLocation())
        .eql(`${TARGET}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20&universe=USA`)
    await screencap(t, 'statistics/population')
    const count = Selector('div').withAttribute('style', /background-color: rgb\(212, 181, 226\);/)
        .withText(/Indianapolis IN HRR, USA/)
    await t.expect(count.count).gte(1, 'Need highlighting')
    // click link "Data Explanation and Credit"
    await t
        .click(Selector('a').withText(/^Data Explanation and Credit$/))
    await t.expect(getLocation())
        .eql(`${TARGET}/data-credit.html#explanation_population`)
})

fixture('statistics-navigation')
    .page(`${TARGET}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20`)
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('statistics-navigation-left', async (t) => {
    await t
        .click(Selector('button').withText('<'))
    const url = `${TARGET}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=20`
    await t.expect(getLocation())
        .eql(url)
    // going left again does nothing
    await t
        .click(Selector('button').withText('<'))
    await t.expect(getLocation())
        .eql(url)
})

test('statistics-navigation-right', async (t) => {
    await t
        .click(Selector('button').withText('>'))
    await t.expect(getLocation())
        .eql(`${TARGET}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=41&amount=20`)
})

test('statistics-navigation-amount', async (t) => {
    // take the select field that currently says 20 and make it say 50
    const amount = Selector('select').nth(0)
    await t
        .click(amount)
        .click(Selector('option').withText('50'))
    await t.expect(getLocation())
        .eql(`${TARGET}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=50`)
    await screencap(t, 'statistics/amount-50')
    // set to All
    await t
        .click(amount)
        .click(Selector('option').withText('All'))
    await t.expect(getLocation())
        .eql(`${TARGET}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=All`)
    await screencap(t, 'statistics/amount-all')
})

test('statistics-navigation-last-page', async (t) => {
    // find input with value 2, then replace it with 15
    const page = Selector('input').withAttribute('value', '2')
    await t
        .click(page)
        .pressKey('ctrl+a')
        .typeText(page, '15')
        .pressKey('enter')

    const url = `${TARGET}/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=281&amount=20`

    await t.expect(getLocation())
        .eql(url)

    await screencap(t, 'statistics/last-page')
    // going right again does nothing
    await t
        .click(Selector('button').withText('>'))
    await t.expect(getLocation())
        .eql(url)
})

fixture('statistic universe selector test')
    .page(`${TARGET}/statistic.html?statname=Population&article_type=City&start=3461&amount=20`)
    // no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('statistic-universe-selector-test', async (t) => {
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'))
    await screencap(t, 'statistic-dropped-down-universe-selector')
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'Puerto Rico, USA'))
    await t.expect(getLocation())
        .eql(`${TARGET}/statistic.html?statname=Population&article_type=City&start=3461&amount=20&universe=Puerto+Rico%2C+USA`)
})

fixture('statistic ascending descending')
    .page(`${TARGET}/statistic.html?statname=Population&article_type=Subnational+Region&start=1&amount=10`)
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

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
    await t.expect(Selector('#statistic-panel-order-swap').innerText).eql('▼')
    await t.click(Selector('#statistic-panel-order-swap'))
    // ensure the button is now ▲
    await t.expect(Selector('#statistic-panel-order-swap').innerText).eql('▲')
    // check the url
    await t.expect(getLocation())
        .eql(`${TARGET}/statistic.html?statname=Population&article_type=Subnational+Region&start=1&amount=10&order=ascending`)

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
        .eql(`${TARGET}/statistic.html?statname=Population&article_type=Subnational+Region&start=1&amount=10`)
    await t.expect(Selector('div').withText('▼').exists).ok()
})

fixture('statistic ascending')
    .page(`${TARGET}/statistic.html?statname=Households+With+no+Vehicle+%25&article_type=Subnational+Region&start=21&amount=20&order=ascending&universe=USA`)

test('statistic-ascending-page', async (t) => {
    // We should see the state with the least vehicles, which is DC
    await t.expect(Selector('div').withExactText('1').exists).ok()
    await t.expect(Selector('div').withText('District of Columbia, USA').exists).ok()
})
