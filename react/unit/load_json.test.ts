import assert from 'assert/strict'
import { test } from 'node:test'

import { loadProtobuf } from '../src/load_json'

import './util/fetch'

void test('search index', async () => {
    const index = await loadProtobuf('/index/pages_all.gz', 'SearchIndex')
    assert.equal(index.elements[0], 'Asia')
})
