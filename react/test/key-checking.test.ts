import { ClientFunction } from 'testcafe'

import type { TestWindow } from '../src/utils/TestUtils'

import { takeFailTestConsoleMessages, target, urbanstatsFixture } from './test_utils'

urbanstatsFixture('key checking', `${target}/`)

// The checking lives in an rspack alias over `react`, so only the served bundle exercises it
test('bad keys fail a test', async (t) => {
    await ClientFunction(() => {
        (window as unknown as TestWindow).testUtils.createElementsWithBadKeys()
    })()
    const messages = await takeFailTestConsoleMessages(t, 2)
    await t.expect(messages.length).eql(2)
    await t.expect(messages[0]).contains('Encountered two children with the same key, `a`')
    await t.expect(messages[1]).contains('Each child in a list should have a unique "key" prop')
})
