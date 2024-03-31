import { Selector, ClientFunction } from 'testcafe';

const TARGET = process.env.URBANSTATS_TEST_TARGET ?? "http://localhost:8000"
const SEARCH_FIELD = Selector('input').withAttribute('placeholder', 'Search Urban Stats');
const getLocation = ClientFunction(() => document.location.href);

function comparison_page(locations) {
    const params = new URLSearchParams();
    params.set('longnames', JSON.stringify(locations));
    return TARGET + '/comparison.html?' + params.toString();
}

async function prep_for_image(t) {
    await t.eval(() => {
        // disable the leaflet map
        for (const x of document.getElementsByClassName("leaflet-tile-pane")) {
            x.remove();
        }
        document.getElementById("current-version").innerHTML = "&lt;VERSION&gt;";
        document.getElementById("last-updated").innerHTML = "&lt;LAST UPDATED&gt;";
    });
}

async function screencap(t, name) {
    await prep_for_image(t)
    return await t.takeScreenshot({
        // include the browser name in the screenshot path
        path: name + '_' + t.browser.name + '.png',
        fullPage: true,
        thumbnails: false
    })
}

async function download_image(t, name) {
    const download = Selector('img').withAttribute('src', '/screenshot.png');
    await prep_for_image(t);
    await t
        .click(download);
    await t.wait(3000);
    await copy_most_recent_file(t, name);
}

async function copy_most_recent_file(t, name) {
    // get the most recent file in the downloads folder
    const fs = require('fs');
    const path = require('path');
    const downloadsFolder = require('downloads-folder');
    const files = fs.readdirSync(downloadsFolder());
    const sorted = files.map(x => path.join(downloadsFolder(), x)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    // copy the file to the screenshots folder
    const screenshotsFolder = path.join(__dirname, '..', 'screenshots');
    fs.copyFileSync(sorted[0], path.join(screenshotsFolder, name + '_' + t.browser.name + '.png'));
}

fixture('longer article test')
    .page(TARGET + '/article.html?longname=California%2C+USA')
    // no local storage
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('california-article-test', async t => {
    // screenshot path: images/first_test.png
    await screencap(t, "article/california");
});

fixture('shorter article test')
    .page(TARGET + '/article.html?longname=San+Marino+city%2C+California%2C+USA')
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });


test('san-marino-article-test', async t => {
    await screencap(t, "article/san-marino");
});

test('search-test', async t => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, "Pasadena");
    await screencap(t, "search/san-marino-search-pasadena");
    await t
        .pressKey('enter');
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=Pasadena+CCD+%5BCCD%5D%2C+Los+Angeles+County%2C+California%2C+USA');
});

test('search-test-with-extra-char', async t => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, "Pasadena c");
    await screencap(t, "search/san-marino-search-pasadena-c");
});

test('search-test-with-special-chars', async t => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, "Utt");
    await screencap(t, "search/san-marino-search-Utt");
});

test('search-test-different-first-char', async t => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, "hina");
    await screencap(t, "search/san-marino-search-hina");
});

test('search-test-arrows', async t => {
    await t
        .click(SEARCH_FIELD);
    await t.wait(1000);
    await t
        .typeText(SEARCH_FIELD, "Pasadena");
    await t.wait(1000);
    await t
        .pressKey('down')
        .pressKey('down');
    await screencap(t, "search/san-marino-search-pasadena-down-down");
    await t
        .pressKey('enter');
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=Pasadena+TX+HSA%2C+Houston+TX+HRR%2C+USA');
})

test('editable-number', async t => {
    // span with class editable_number
    const editableNumber = Selector('span').withAttribute('class', 'editable_number').nth(0);
    await t
        .click(editableNumber)
        // select all and delete
        .pressKey('ctrl+a')
        .typeText(editableNumber, '3')
        .pressKey('enter');
    await t.expect(editableNumber.innerText).eql('3');
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=Chicago+city%2C+Illinois%2C+USA');
})

test('lr-buttons', async t => {
    // button with a < on it
    const prev = Selector('a').withText('<').nth(0);
    const next = Selector('a').withText('>').nth(0);
    const prev_overall = Selector('a').withText('<').nth(1);
    const next_overall = Selector('a').withText('>').nth(1);
    await t
        .click(prev);
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=Fortuna+city%2C+California%2C+USA');
    await t
        .click(next);
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=San+Marino+city%2C+California%2C+USA');
    await t
        .click(next);
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=Lakewood+Park+CDP%2C+Florida%2C+USA');
    await t
        .click(prev)
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=San+Marino+city%2C+California%2C+USA');

    await t.click(prev_overall);
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=Havre+High+School+District%2C+Montana%2C+USA');
    await t.click(next_overall);
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=San+Marino+city%2C+California%2C+USA');
    await t.click(next_overall);
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=78225%2C+USA');
})

async function check_textbox(t, txt) {
    await t.eval(() => localStorage.clear());
    const checkbox = Selector('div').withAttribute('class', 'checkbox-setting')
        // filter for label
        .filter(node => node.querySelector('label').innerText === txt, { txt })
        // find checkbox
        .find('input');
    const hamburgerMenu = Selector('div').withAttribute('class', 'hamburgermenu');
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu);
    }
    await t
        .click(checkbox);
    if (await hamburgerMenu.exists) {
        await t.click(hamburgerMenu);
    }
}

test('uncheck-box-mobile', async t => {
    // Find div with class checkbox-setting containing a label with text "Race"
    // and a checkbox, then find the checkbox
    await t.resizeWindow(400, 800);
    // refresh
    await t.eval(() => location.reload(true));
    await t.wait(1000);
    await check_textbox(t, 'Race');

    await screencap(t, "article/remove_race_initial_mobile");
    // refresh
    await t.eval(() => location.reload(true));
    await screencap(t, "article/remove_race_refresh_mobile");
})

test('uncheck-box-desktop', async t => {
    await t.resizeWindow(1400, 800);
    // refresh
    await t.eval(() => location.reload(true));
    await t.wait(1000);
    await check_textbox(t, 'Race');

    await screencap(t, "article/remove_race_initial_desktop");
    // refresh
    await t.eval(() => location.reload(true));
    await screencap(t, "article/remove_race_refresh_desktop");
})

test('simple', async t => {
    await t.resizeWindow(1400, 800);
    // refresh
    await t.eval(() => location.reload(true));
    await check_textbox(t, 'Simple Ordinals');

    await screencap(t, "article/simple-ordinals");
})

test('download-article', async t => {
    await download_image(t, "article/download-article");
})

test('create-comparison-from-article', async t => {
    const otherRegion = Selector('input').withAttribute('placeholder', 'Other region...');
    await t
        .click(otherRegion)
        .typeText(otherRegion, "pasadena city california")
        .pressKey('enter');
    await t.expect(getLocation())
        .eql(comparison_page(["San Marino city, California, USA", "Pasadena city, California, USA"]));
})

const upper_sgv = "Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA"
const pasadena = "Pasadena CCD [CCD], Los Angeles County, California, USA"
const sw_sgv = "Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA"
const east_sgv = "East San Gabriel Valley CCD [CCD], Los Angeles County, California, USA"
const chicago = "Chicago city [CCD], Cook County, Illinois, USA"

fixture('comparison test heterogenous')
    .page(comparison_page(["San Marino city, California, USA", pasadena, sw_sgv]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('comparison-3-desktop-heterogenous', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload(true));
    await screencap(t, "comparison/heterogenous-comparison-desktop");
})

test('comparison-3-mobile-heterogenous', async t => {
    await t.resizeWindow(400, 800);
    await t.eval(() => location.reload(true));
    await screencap(t, "comparison/heterogenous-comparison-mobile");
})

fixture('comparison test homogenous (2)')
    .page(comparison_page([upper_sgv, sw_sgv]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('comparison-2-mobile', async t => {
    await t.resizeWindow(400, 800);
    await t.eval(() => location.reload(true));
    await screencap(t, "comparison/basic-comparison-2-mobile");
})

fixture('comparison test homogenous (3)')
    .page(comparison_page([upper_sgv, pasadena, sw_sgv]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });


test('comparison-3-desktop', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload(true));
    await screencap(t, "comparison/basic-comparison-desktop");
})

test('comparison-3-mobile', async t => {
    await t.resizeWindow(400, 800);
    await t.eval(() => location.reload(true));
    await screencap(t, "comparison/basic-comparison-mobile");
})

test('comparison-3-download', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload(true));
    await download_image(t, "comparison/download-comparison");
})

test('comparison-3-add', async t => {
    const otherRegion = Selector('input').withAttribute('placeholder', 'Name');
    await t
        .click(otherRegion)
        .typeText(otherRegion, "san marino city california")
        .pressKey('enter');
    await t.expect(getLocation())
        .eql(comparison_page([upper_sgv, pasadena, sw_sgv, "San Marino city, California, USA"]));
})

test('comparison-3-remove-first', async t => {
    const remove = Selector('div').withAttribute('class', 'serif manipulation-button-delete').nth(0);
    await t
        .click(remove);
    await t.expect(getLocation())
        .eql(comparison_page([pasadena, sw_sgv]));
})

test('comparison-3-remove-second', async t => {
    const remove = Selector('div').withAttribute('class', 'serif manipulation-button-delete').nth(1);
    await t
        .click(remove);
    await t.expect(getLocation())
        .eql(comparison_page([upper_sgv, sw_sgv]));
})

test('comparison-3-replace-second', async t => {
    const replace = Selector('div').withAttribute('class', 'serif manipulation-button-replace').nth(1);
    await t
        .click(replace);
    // already focused on the input
    const otherRegion = Selector('input').withAttribute('placeholder', 'Replacement');
    await t
        .typeText(otherRegion, "East San Gabriel Valley")
        .pressKey('enter');
    await t.expect(getLocation())
        .eql(comparison_page([upper_sgv, east_sgv, sw_sgv]));
});

test('comparison-3-editable-number-third', async t => {
    const editableNumber = Selector('span').withAttribute('class', 'editable_number').nth(2);
    await t
        .click(editableNumber)
        // select all and delete
        .pressKey('ctrl+a')
        .typeText(editableNumber, '3')
        .pressKey('enter');
    await t.expect(editableNumber.innerText).eql('3');
    await t.expect(getLocation())
        .eql(comparison_page([upper_sgv, pasadena, chicago]));
})

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
        .eql(TARGET + '/statistic.html?statname=Population&article_type=Hospital+Referral+Region&start=21&amount=20');
    await screencap(t, "statistics/population");
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


fixture('quiz result test')
    .page(TARGET + '/quiz.html?date=100')
    // no local storage
    .beforeEach(async t => {
        await t.eval(() => {
            localStorage.clear()
            const quiz_history = {};
            for (var i = 2; i <= 100; i++) {
                quiz_history[i] = {
                    "choices": ["A", "A", "A", "A", "A"],
                    "correct_pattern": [true, true, true, i % 3 == 1, i % 4 == 1]
                }
            }
            quiz_history[62] = {
                "choices": ["A", "A", "A", "A", "A"],
                "correct_pattern": [false, false, false, false, false]
            }
            localStorage.setItem("quiz_history", JSON.stringify(quiz_history));
        });
    });

test('quiz-results-test', async t => {
    await t.eval(() => location.reload(true));
    await t.eval(() => document.getElementById("quiz-timer").remove());
    await screencap(t, "quiz/results-page");
});

