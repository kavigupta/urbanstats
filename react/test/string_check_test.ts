import { IS_TESTING, TARGET } from './test_utils'

fixture('mapping')
    .page(TARGET)
// no local storage
    .beforeEach(async (t) => {
        await t.eval(() => { localStorage.clear() })
    })

test('state-map', async (t) => {
    await t.expect(IS_TESTING).ok('String tests are in overwrite mode. Set IS_TESTING to true to run tests.')
})
