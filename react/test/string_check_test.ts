import { isTesting, target, urbanstatsFixture } from './test_utils'

urbanstatsFixture('string check must be on', target)

test('state-map', async (t) => {
    await t.expect(isTesting).ok('String tests are in overwrite mode. Set IS_TESTING to true to run tests.')
})
