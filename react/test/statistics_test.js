import { Selector } from 'testcafe';

import { TARGET, getLocation, screencap } from './test_utils';

fixture('statistics')
    .page(TARGET + '/article.html?longname=Indianapolis+IN+HRR%2C+USA')
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('statistics-page', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload(true));
    // click the link labeled "Population"
    await t
        .click(Selector('a').withText(/^Population$/));
    // assert url is https://urbanstats.org/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20
    await t.expect(getLocation())
        .eql(TARGET + '/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20&universe=USA');
    await screencap(t, "statistics/population");
    const count = Selector('div').withAttribute('style', /background-color: rgb\(212, 181, 226\);/)
        .withText(/Indianapolis IN HRR, USA/);
    await t.expect(count.count).gte(1, "Need highlighting");
    // click link "Data Explanation and Credit"
    await t
        .click(Selector('a').withText(/^Data Explanation and Credit$/));
    await t.expect(getLocation())
        .eql(TARGET + '/data-credit.html#explanation_population');
});

fixture('statistics-navigation')
    .page(TARGET + '/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20')
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('statistics-navigation-left', async t => {
    await t
        .click(Selector('button').withText('<'));
    const url = TARGET + '/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=20';
    await t.expect(getLocation())
        .eql(url);
    // going left again does nothing
    await t
        .click(Selector('button').withText('<'));
    await t.expect(getLocation())
        .eql(url);
});

test('statistics-navigation-right', async t => {
    await t
        .click(Selector('button').withText('>'));
    await t.expect(getLocation())
        .eql(TARGET + '/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=41&amount=20');
});

test('statistics-navigation-amount', async t => {
    // take the select field that currently says 20 and make it say 50
    const amount = Selector('select').nth(0);
    await t
        .click(amount)
        .click(Selector('option').withText('50'));
    await t.expect(getLocation())
        .eql(TARGET + '/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=50');
    await screencap(t, "statistics/amount-50");
    // set to All
    await t
        .click(amount)
        .click(Selector('option').withText('All'));
    await t.expect(getLocation())
        .eql(TARGET + '/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=1&amount=All');
    await screencap(t, "statistics/amount-all");
});


test('statistics-navigation-last-page', async t => {
    // find input with value 2, then replace it with 15
    const page = Selector('input').withAttribute('value', '2');
    await t
        .click(page)
        .pressKey('ctrl+a')
        .typeText(page, '15')
        .pressKey('enter');

    const url = TARGET + '/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=281&amount=20';

    await t.expect(getLocation())
        .eql(url);

    await screencap(t, "statistics/last-page");
    // going right again does nothing
    await t
        .click(Selector('button').withText('>'));
    await t.expect(getLocation())
        .eql(url);
});


fixture('statistic universe selector test')
    .page(TARGET + '/statistic.html?statname=Population&article_type=City&start=3461&amount=20')
    // no local storage
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });


test('statistic-universe-selector-test', async t => {
    await t
        .click(Selector('img').withAttribute('class', 'universe-selector'));
    await screencap(t, "statistic-dropped-down-universe-selector");
    await t
        .click(
            Selector('img')
                .withAttribute('class', 'universe-selector-option')
                .withAttribute('alt', 'Puerto Rico, USA'));
    await t.expect(getLocation())
        .eql(TARGET + '/statistic.html?statname=Population&article_type=City&start=3461&amount=20&universe=Puerto+Rico%2C+USA');
});
