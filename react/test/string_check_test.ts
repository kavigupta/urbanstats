import { IS_TESTING, TARGET, urbanstatsFixture } from './test_utils'

urbanstatsFixture('string check must be on', TARGET)

test('state-map', async (t) => {
    await t.expect(IS_TESTING).ok('String tests are in overwrite mode. Set IS_TESTING to true to run tests.')
})
