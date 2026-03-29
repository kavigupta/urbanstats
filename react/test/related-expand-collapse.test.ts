import { Selector } from 'testcafe'

import { urbanstatsFixture, waitForLoading } from './test_utils'

// California has 58 counties, so the "County" relationship group
// will have >10 regions and show the expand/collapse button.
urbanstatsFixture('related expand collapse', '/article.html?longname=California%2C+USA')

const moreButton = Selector('a').withExactText('More...')
const lessButton = Selector('a').withExactText('Less')

test('related group with more than 10 regions shows More button initially', async (t) => {
    await t.expect(moreButton.exists).ok()
    await t.expect(lessButton.exists).notOk()
    await t.expect(Selector('a').withExactText('Yuba County').exists).notOk()
})

test('clicking More shows all regions and Less button', async (t) => {
    const initialMoreButtonCount = await moreButton.count
    await t.click(moreButton)
    await t.expect(lessButton.exists).ok()
    await t.expect(moreButton.count).eql(initialMoreButtonCount - 1)
    await t.expect(Selector('a').withExactText('Yuba County').exists).ok()
})

test('clicking Less collapses back to initial state', async (t) => {
    await t.click(moreButton)
    await t.click(lessButton)
    await t.expect(moreButton.exists).ok()
    await t.expect(lessButton.exists).notOk()
    await t.expect(Selector('a').withExactText('Yuba County').exists).notOk()
})

test('navigating to a new article does not reset expanded state', async (t) => {
    await t.click(moreButton)
    await t.expect(lessButton.exists).ok()
    await t.click('button[data-test-id="1"]')
    await waitForLoading()
    await t.expect(lessButton.exists).ok()
    await t.expect(Selector('a').withExactText('Zavala County').exists).ok()
})
