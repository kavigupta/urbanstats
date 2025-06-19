import { screencap, urbanstatsFixture, target, getLocationWithoutSettings } from './test_utils'

function symlinkTest(name: string, link: string, expected: string | undefined = undefined): void {
    if (expected === undefined) {
        expected = link
    }
    urbanstatsFixture(name, link)

    test(name, async (t) => {
        await screencap(t)
        await t.expect(getLocationWithoutSettings()).eql(`${target}${expected}`)
    })
}

symlinkTest(
    'national',
    '/article.html?longname=Timor-Leste',
    '/article.html?longname=East+Timor',
)
symlinkTest(
    'subnational',
    '/article.html?longname=Haut-Lomami%2C+Congo%2C+The+Democratic+Republic+of+the',
    '/article.html?longname=Haut-Lomami%2C+Democratic+Republic+of+the+Congo',
)
symlinkTest(
    'urban center',
    '/article.html?longname=Tehr%C4%81n%2C+Iran%2C+Islamic+Republic+of',
    '/article.html?longname=Tehr%C4%81n%2C+Iran',
)
symlinkTest(
    '5mpc',
    '/article.html?longname=Pyongyang+5MPC%2C+Korea%2C+Democratic+People%27s+Republic+of',
    '/article.html?longname=Pyongyang+5MPC%2C+North+Korea',
)

symlinkTest(
    'comparison',
    '/comparison.html?longnames=%5B%22Pyongyang+5MPC%2C+Korea%2C+Democratic+People%27s+Republic+of%22%2C%22Tehran+%28Outer%29+5MPC%2C+Iran%2C+Islamic+Republic+of%22%5D',
    '/comparison.html?longnames=%5B%22Pyongyang+5MPC%2C+North+Korea%22%2C%22Tehran+%28Outer%29+5MPC%2C+Iran%22%5D',
)

symlinkTest(
    'usa-test',
    '/article.html?longname=United+States+of+America',
    '/article.html?longname=USA',
)

symlinkTest('usa-comparison', '/comparison.html?longnames=%5B%22United+States+of+America%22%2C%22Canada%22%5D', '/comparison.html?longnames=%5B%22USA%22%2C%22Canada%22%5D')

symlinkTest('fixed-subnationals-1',
    '/article.html?longname=Ciudad+Ojeda+5MPC%2C+Venezuela-USA-France',
    '/article.html?longname=Ciudad+Ojeda+5MPC%2C+Venezuela-France-USA',
)

symlinkTest('fixed-subnationals-2',
    '/article.html?longname=Acapulco+20MPC%2C+Canada-USA-Mexico',
    '/article.html?longname=Acapulco+20MPC%2C+Canada-Mexico-USA',
)

symlinkTest('fixed-subnationals-3',
    '/article.html?longname=Virginia+Beach+20MPC%2C+USA',
    '/article.html?longname=Virginia+Beach+20MPC%2C+USA-Canada',
)
