import { test } from 'uvu'
import * as assert from 'uvu/assert'

import './util/fetch'
import './util/localStorage'
import { uniform } from '../src/navigation/random'

function assertNoSpecials(article: string): void {
    assert.not.match(article, /.*Historical\+Congressional.*/)
    assert.not.match(article, /.*PC%2C.*/)
}

function assertNoSyminks(article: string): void {
    assert.not.match(article, /United States of America/)
}

const repeats = 100000

test('uniform', async () => {
    const getArticle = await uniform()
    for (let count = 0; count < repeats; count++) {
        assertNoSpecials(getArticle())
        assertNoSyminks(getArticle())
    }
})

test.run()
