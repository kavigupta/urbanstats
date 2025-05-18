import { test } from 'uvu'
import * as assert from 'uvu/assert'

import './util/fetch'
import './util/localStorage'
import { byPopulation, uniform } from '../src/navigation/random'

function assertNoSpecials(article: string): void {
    assert.not.match(article, /.*\s(\(19\d\d|201\d|2021\)), USA$/)
    assert.not.match(article, /.*PC,.*/)
}

function assertNoSyminks(article: string): void {
    assert.not.match(article, /United States of America/)
}

const repeats = 500_000

test('uniform', async () => {
    const getArticle = await uniform()
    for (let count = 0; count < repeats; count++) {
        const article = getArticle()
        assertNoSpecials(article)
        assertNoSyminks(article)
    }
})

test('by-pop', async () => {
    const getArticle = await byPopulation(false)
    for (let count = 0; count < repeats; count++) {
        const article = getArticle()
        assertNoSpecials(article)
        assertNoSyminks(article)
    }
})

test('by-pop-usa-only', async () => {
    const getArticle = await byPopulation(true)
    for (let count = 0; count < repeats; count++) {
        const article = getArticle()
        assertNoSpecials(article)
        assertNoSyminks(article)
        assert.match(article, /.*USA.*/)
    }
})

test.run()
