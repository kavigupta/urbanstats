import { ClientFunction } from 'testcafe'

import { TestWindow } from '../src/utils/TestUtils'

import { target, urbanstatsFixture } from './test_utils'

urbanstatsFixture('test_utils', target)

test('we are in testing mode', async (t) => {
    await t.expect(ClientFunction(() => (window as unknown as TestWindow).testUtils.isTesting)).ok()
})

const getTestingId = ClientFunction(() => (window as unknown as TestWindow).testUtils.testIterationId)

let testingId: string | undefined
test('there is a testing id', async (t) => {
    testingId = await getTestingId()
    await t.expect(testingId).ok()
})

test('it changes every test', async (t) => {
    await t.expect(await getTestingId()).notEql(testingId)
})
