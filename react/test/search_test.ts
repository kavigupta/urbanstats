import { 
    TARGET, SEARCH_FIELD, getLocation, screencap
} from './test_utils';

fixture('shorter article test')
    .page(TARGET + '/article.html?longname=San+Marino+city%2C+California%2C+USA')
    .beforeEach(async t => {
        await t.eval(() => localStorage.clear());
    });


test('search-test', async t => {
    await t
        .click(SEARCH_FIELD)
        .typeText(SEARCH_FIELD, "Pasadena");
    await screencap(t, "search/san-marino-search-pasadena");
    await t
        .pressKey('enter');
    await t.expect(getLocation())
        .eql(TARGET + '/article.html?longname=Pasadena+city%2C+Texas%2C+USA');
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
        .eql(TARGET + '/article.html?longname=Pasadena+CDP%2C+Maryland%2C+USA');
})
