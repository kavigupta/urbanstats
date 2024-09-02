

import { Selector } from 'testcafe';
import { TARGET, getLocation, comparison_page, screencap, download_image } from './test_utils';

export const upper_sgv = "Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA"
export const pasadena = "Pasadena CCD [CCD], Los Angeles County, California, USA"
export const sw_sgv = "Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA"
export const east_sgv = "East San Gabriel Valley CCD [CCD], Los Angeles County, California, USA"
export const chicago = "Chicago city [CCD], Cook County, Illinois, USA"

fixture('comparison test heterogenous')
    .page(comparison_page(["San Marino city, California, USA", pasadena, sw_sgv]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('comparison-3-desktop-heterogenous', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload());
    await screencap(t, "comparison/heterogenous-comparison-desktop");
})

test('comparison-3-mobile-heterogenous', async t => {
    await t.resizeWindow(400, 800);
    await t.eval(() => location.reload());
    await screencap(t, "comparison/heterogenous-comparison-mobile");
})

fixture('comparison test homogenous (2)')
    .page(comparison_page([upper_sgv, sw_sgv]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('comparison-2-mobile', async t => {
    await t.resizeWindow(400, 800);
    await t.eval(() => location.reload());
    await screencap(t, "comparison/basic-comparison-2-mobile");
})

fixture('comparison test homogenous (3)')
    .page(comparison_page([upper_sgv, pasadena, sw_sgv]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });


test('comparison-3-desktop', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload());
    await screencap(t, "comparison/basic-comparison-desktop");
})

test('comparison-3-mobile', async t => {
    await t.resizeWindow(400, 800);
    await t.eval(() => location.reload());
    await screencap(t, "comparison/basic-comparison-mobile");
})

test('comparison-3-download', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload());
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

fixture('plotted-across-180')
    .page(TARGET + '/comparison.html?longnames=%5B%22England%2C+United+Kingdom%22%2C%22Alaska%2C+USA%22%2C%22Chukotskiy+avtonomnyy+okrug%2C+Russian+Federation%22%5D')
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('comparison-3-plotted-across-180', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload());
    await screencap(t, "comparison/plotted-across-180");
});

