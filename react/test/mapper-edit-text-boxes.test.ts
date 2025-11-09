import { Selector } from 'testcafe'

import { screencap, urbanstatsFixture } from './test_utils'

urbanstatsFixture(`default map`, '/mapper.html')

test('basic add box', async (t) => {
    await t.click(Selector('button').withExactText('Edit Text Boxes'))
    await t.click('[data-test="add"]')
    await t.typeText('.ql-editor', 'Hello, World!')
    await screencap(t)
    await t.click(Selector('button:not(:disabled)').withExactText('Accept'))

    await t.expect(Selector('p').withExactText('Hello,\u00a0World!').exists).ok()
    await screencap(t)
})
