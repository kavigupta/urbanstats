import { Selector } from 'testcafe'

import { screencap, target, urbanstatsFixture, withHamburgerMenu } from './test_utils'

urbanstatsFixture(
    'paste simple ordinals link with overall pointer selection',
    target,
    async (t) => {
        await t.resizeWindow(400, 800)
        // Must navigate AFTER resize otherwise settings are not applied correctly
        await t.navigateTo(`${target}/article.html?longname=Concord+Urban+Center%2C+USA&s=oWHKo6pbBn2h`)
    },
)

test('with simple ordinals, does not apply pointer selection setting', async (t) => {
    await t.expect(Selector('select[data-test-id=tablePointerSelect]').exists).notOk()
    await screencap(t)
    await withHamburgerMenu(t, async () => {
        await t.click(Selector('label').withText('Simple Ordinals'))
    })
    await t.expect(Selector('select[data-test-id=tablePointerSelect]').value).eql('pointer_in_class')
})

urbanstatsFixture(
    'paste with overall pointer selection (no simple ordinals)',
    target,
    async (t) => {
        await t.resizeWindow(400, 800)
        // Must navigate AFTER resize otherwise settings are not applied correctly
        await t.navigateTo(`${target}/article.html?longname=Concord+Urban+Center%2C+USA&s=oWHKo6omkB1f`)
    },
)

test('no simple ordinals, does apply pointer selection setting', async (t) => {
    await t.expect(Selector('select[data-test-id=tablePointerSelect]').value).eql('pointer_overall')
    await screencap(t)
})

test('navigate backwards', async (t) => {
    await t.click(Selector('button[data-test-id="-1"]'))
    await t.expect(Selector('div').withText('Akron MSA').exists).ok()
})

test('change select to pointer_in_class and navigate forwards', async (t) => {
    const select = Selector('select[data-test-id=tablePointerSelect]')
    await t.click(select).click(select.find('option').withText('Within Type'))
    await t.click(Selector('button[data-test-id="1"]'))
    await t.expect(Selector('div').withText('Fresno Urban Center').exists).ok()
})
