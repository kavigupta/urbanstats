
import { pasadena, sw_sgv } from './comparison_test';
import { TARGET, comparison_page, screencap } from './test_utils';

fixture('comparison test heterogenous')
    .page(comparison_page(["San Marino city, California, USA", pasadena, sw_sgv]))
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test('histogram-basic', async t => {
    await t.resizeWindow(1400, 800);
    await t.eval(() => location.reload(true));
});