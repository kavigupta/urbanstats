import { screencap, urbanstatsFixture } from './test_utils'

function symlink_test(name: string, link: string): void {
    urbanstatsFixture(name, link)

    test(name, async (t) => {
        // screenshot path: images/first_test.png
        await screencap(t)
    })
}

symlink_test('national', '/article.html?longname=Timor-Leste')
symlink_test('subnational', '/article.html?longname=Haut-Lomami%2C+Congo%2C+The+Democratic+Republic+of+the')
symlink_test('urban center', '/article.html?longname=Tehrān%2C+Iran%2C+Islamic+Republic+of')
symlink_test('5mpc', '/article.html?longname=Pyongyang+5MPC%2C+Korea%2C+Democratic+People%27s+Republic+of')
