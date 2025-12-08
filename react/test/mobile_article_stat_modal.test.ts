import { Selector } from 'testcafe'

import {
    screencap,
    target,
    urbanstatsFixture,
} from './test_utils'

urbanstatsFixture(
    'mobile article stat modal',
    `${target}/article.html?longname=Los+Angeles+city%2C+California%2C+USA`,
    async (t) => {
        await t.resizeWindow(400, 800)
    },
)

test('open and close modal', async (t) => {
    await t.click(Selector('button').withExactText('Statistic'))
    await screencap(t, { fullPage: false })
    await t.click(Selector('button').withExactText('Done'))
    await t.expect(Selector('[data-test-id=modal-background]').exists).notOk()
})

test('change stats', async (t) => {
    await t.expect(Selector('a').withExactText('Population').exists).ok()
    await t.expect(Selector('a').withExactText('White %').exists).notOk()
    await t.click(Selector('button').withExactText('Statistic'))
    // search for and add "White %"
    // eslint-disable-next-line no-restricted-syntax -- White the race not the color
    await t.typeText(Selector('[data-test-id="stats-search"]'), 'White')
    await t.click(Selector('label').withExactText('White %'))
    await t.selectText(Selector('[data-test-id="stats-search"]')).pressKey('delete')
    // search for and remove "Population"
    await t.typeText(Selector('[data-test-id="stats-search"]'), 'Population')
    await t.click(Selector('label').withExactText('Population'))
    await screencap(t, { fullPage: false })
    await t.click(Selector('button').withExactText('Done'))
    await t.expect(Selector('a').withExactText('Population').exists).notOk()
    await t.expect(Selector('a').withExactText('White %').exists).ok()
    await screencap(t, { fullPage: false })
})
