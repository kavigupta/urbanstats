import { test } from 'uvu'
import * as assert from 'uvu/assert'

import { loadProtobuf } from '../src/load_json'

import './util/fetch'

test('search index', async () => {
    const index = await loadProtobuf('/index/pages_all.gz', 'SearchIndex')
    assert.is(index.elements[0], 'Asia')
})

test.run()
