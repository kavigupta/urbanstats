import { TARGET, getLocation } from './test_utils';

fixture('random')
    .page(TARGET + "/random.html?sampleby=population&us_only=true")
    // no local storage
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });

test("random-usa", async t => {
    // wait for load
    await t.wait(1000);
    // contains article
    await t.expect(getLocation())
        .contains('/article.html?longname=');
    // location should not include &universe=
    await t.expect(getLocation())
        .notContains('&universe=');
})
