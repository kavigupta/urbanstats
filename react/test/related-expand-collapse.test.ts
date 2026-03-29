import { Selector } from 'testcafe'

import { screencap, urbanstatsFixture, waitForLoading } from './test_utils'

// California has 58 counties, so the "County" relationship group
// will have >10 regions and show the expand/collapse button.
urbanstatsFixture('related expand collapse', '/article.html?longname=California%2C+USA')

const moreButton = Selector('a').withExactText('More...')
const lessButton = Selector('a').withExactText('Less')

test('related group with more than 10 regions shows More button initially', async (t) => {
    await t.expect(moreButton.exists).ok()
    await t.expect(lessButton.exists).notOk()
})

test('clicking More shows all regions and Less button', async (t) => {
    const initialMoreButtonCount = await moreButton.count
    await t.click(moreButton)
    await t.expect(lessButton.exists).ok()
    await t.expect(moreButton.count).eql(initialMoreButtonCount - 1)
})

test('clicking Less collapses back to initial state', async (t) => {
    await t.click(moreButton)
    await t.click(lessButton)
    await t.expect(moreButton.exists).ok()
    await t.expect(lessButton.exists).notOk()
})

test('navigating to a new article resets expanded state', async (t) => {
    await t.click(moreButton)
    await t.expect(lessButton.exists).ok()
    // Texas also has many counties (254), so More button should appear again
    await t.click('button[data-test-id="1"]')
    await waitForLoading()
    await t.expect(moreButton.exists).ok()
    await t.expect(lessButton.exists).notOk()
})
