import assert from 'assert'
import test from 'node:test'

import { isTesting } from '../test/test_utils'

void test('isTesting', () => {
    assert.ok(isTesting, 'String tests are in overwrite mode. Set IS_TESTING to true to run tests.')
})
