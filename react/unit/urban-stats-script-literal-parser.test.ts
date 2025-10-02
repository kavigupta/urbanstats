import assert from 'assert/strict'
import test from 'node:test'

import { defaultConstants } from '../src/urban-stats-script/constants/constants'
import * as l from '../src/urban-stats-script/literal-parser'
import { unparse } from '../src/urban-stats-script/parser'

import { parseExpr } from './urban-stats-script-utils'

void test('object', () => {
    assert.deepEqual(
        l.object({ a: l.number(), b: l.number() }).parse(parseExpr('{ a: 1, b: 2 }'), defaultConstants),
        { a: 1, b: 2 },
    )
})

void test('edit', () => {
    assert.equal(
        unparse(
            l.object({ a: l.number(), b: l.edit(l.number()) })
                .parse(parseExpr('{a: 1, b: 2}'), defaultConstants)!.b.edit(parseExpr('3'))),
        '{a: 1, b: 3}',
    )
})
