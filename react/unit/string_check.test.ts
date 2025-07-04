import assert from 'assert'
import test from 'node:test'

import { checkString } from '../src/utils/checkString'

void test('isTesting', () => {
    assert.ok(checkString, 'String tests are in overwrite mode. Set IS_TESTING to true to run tests.')
})
