
import { Selector } from 'testcafe';
import { TARGET, check_textboxes, comparison_page, download_histogram, download_image, download_or_check_string, screencap } from './test_utils';

export const upper_sgv = "Upper San Gabriel Valley CCD [CCD], Los Angeles County, California, USA"
export const pasadena = "Pasadena CCD [CCD], Los Angeles County, California, USA"
export const sw_sgv = "Southwest San Gabriel Valley CCD [CCD], Los Angeles County, California, USA"
export const east_sgv = "East San Gabriel Valley CCD [CCD], Los Angeles County, California, USA"
export const chicago = "Chicago city [CCD], Cook County, Illinois, USA"

async function download_or_check_histogram(t: TestController, name: string) {
    const output = await t.eval(() => {
        return document.getElementsByClassName("histogram-svg-panel")[0].innerHTML;
    });
    await download_or_check_string(t, output, name);
}

fixture('article check and uncheck test')
    .page(TARGET + "/article.html?longname=New+York+Urban+Center%2C+USA&universe=world")
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test("histogram-article-check-uncheck", async t => {
    await t.resizeWindow(800, 800);
    await t.eval(() => location.reload());
    // count the number of `histogram-svg-panel` elements
    await t.expect(Selector('.histogram-svg-panel').count).eql(0);
    await t.click(Selector('.expand-toggle'));
    await t.expect(Selector('.histogram-svg-panel').count).eql(1);
    await t.click(Selector('.expand-toggle'));
    await t.expect(Selector('.histogram-svg-panel').count).eql(0);
});

fixture('article test')
    .page(TARGET + "/article.html?longname=Germany&universe=world")
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('histogram-basic-article', async t => {
    await t.resizeWindow(800, 800);
    await t.eval(() => location.reload());
    await t.click(Selector('.expand-toggle'));
    await download_or_check_histogram(t, 'histogram-basic-article');
    await screencap(t, "histogram/histogram-basic-article");
});


test('histogram-basic-article-multi', async t => {
    await t.resizeWindow(800, 800);
    await t.eval(() => location.reload());
    await check_textboxes(t, ["Other Density Metrics"]);
    await t.eval(() => location.reload());
    await t.wait(1000);
    Selector('.expand-toggle').count.then(async count => {
        for (let i = 0; i < count; i++) {
            await t.click(Selector('.expand-toggle').nth(i));
        }
    });
    await screencap(t, "histogram/histogram-basic-article-multi");
    await download_image(t, "histogram/histogram-basic-article-multi-screenshot");
    await download_histogram(t, "histogram/histogram-basic-article-multi-histogram-0", 0);
    await download_histogram(t, "histogram/histogram-basic-article-multi-histogram-1", 1);
});

fixture('comparison test heterogenous')
    .page(comparison_page(["San Marino city, California, USA", pasadena, sw_sgv]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('histogram-basic-comparison', async t => {
    await t.resizeWindow(800, 800);
    await t.eval(() => location.reload());
    // select element with class name `expand-toggle`
    await t.click(Selector('.expand-toggle'));
    await download_or_check_histogram(t, 'histogram-basic-comparison');
    await screencap(t, "histogram/histogram-basic-comparison");
});

fixture('comparison test heterogenous with nan')
    .page(comparison_page(["India", "China", pasadena]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });


test('histogram-basic-comparison-nan', async t => {
    await t.resizeWindow(800, 800);
    await t.eval(() => location.reload());
    // select element with class name `expand-toggle`
    await t.click(Selector('.expand-toggle'));
    await download_or_check_histogram(t, 'histogram-basic-comparison-nan');
    await screencap(t, "histogram/histogram-basic-comparison-nan");
});

fixture('comparison test heterogenous with nan in the middle')
    .page(comparison_page(["India", pasadena, "China"]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });


test('histogram-basic-comparison-nan-middle', async t => {
    await t.resizeWindow(800, 800);
    await t.eval(() => location.reload());
    // select element with class name `expand-toggle`
    await t.click(Selector('.expand-toggle'));
    await download_or_check_histogram(t, 'histogram-basic-comparison-nan-middle');
    await screencap(t, "histogram/histogram-basic-comparison-nan-middle");
});

fixture('comparison ordering test')
    .page(TARGET + "/comparison.html?longnames=%5B%22USA%22%2C%22United+Kingdom%22%5D")
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('histogram-ordering', async t => {
    await t.click(Selector('.expand-toggle'));
    await download_or_check_histogram(t, 'histogram-ordering');
    await screencap(t, "histogram/histogram-ordering");
});