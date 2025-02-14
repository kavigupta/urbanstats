import { test } from 'uvu'
import * as assert from 'uvu/assert'

import './util/fetch'
import './util/localStorage'
import { byPopulation, uniform } from '../src/navigation/random'

function assertNoSpecials(article: string): void {
    assert.not.match(article, /.*Historical Congressional.*/)
    assert.not.match(article, /.*PC,.*/)
}

const repeats = 500_000

test('uniform', async () => {
    const getArticle = await uniform()
    for (let count = 0; count < repeats; count++) {
        assertNoSpecials(getArticle())
    }
})

test('by-pop', async () => {
    const getArticle = await byPopulation(false)
    for (let count = 0; count < repeats; count++) {
        assertNoSpecials(getArticle())
    }
})

test('by-pop-usa-only', async () => {
    const getArticle = await byPopulation(true)
    for (let count = 0; count < repeats; count++) {
        const article = getArticle()
        assertNoSpecials(article)
        assert.match(article, /.*USA.*/)
    }
})

test.run()
