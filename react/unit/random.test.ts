import assert from 'assert/strict'
import { test } from 'node:test'

import './util/fetch'
import './util/localStorage'
import { byPopulation, uniform } from '../src/navigation/random'

function assertNoSpecials(article: string): void {
    assert.doesNotMatch(article, /.*\s(\(19\d\d|201\d|2021\)), USA$/)
    assert.doesNotMatch(article, /.*PC,.*/)
}

function assertNoSyminks(article: string): void {
    assert.doesNotMatch(article, /United States of America/)
}

const repeats = 500_000

void test('uniform', async () => {
    const getArticle = await uniform(undefined)
    for (let count = 0; count < repeats; count++) {
        const article = getArticle()
        assertNoSpecials(article)
        assertNoSyminks(article)
    }
})

void test('by-pop', async () => {
    const getArticle = await byPopulation(undefined)
    for (let count = 0; count < repeats; count++) {
        const article = getArticle()
        assertNoSpecials(article)
        assertNoSyminks(article)
    }
})

void test('by-pop-usa-only', async () => {
    const getArticle = await byPopulation('USA')
    for (let count = 0; count < repeats; count++) {
        const article = getArticle()
        assertNoSpecials(article)
        assertNoSyminks(article)
        assert.match(article, /.+USA/)
    }
})

void test('uniform-kenya-only', async () => {
    const getArticle = await uniform('Kenya')
    for (let count = 0; count < repeats; count++) {
        const article = getArticle()
        assertNoSpecials(article)
        assertNoSyminks(article)
        assert.match(article, /.+Kenya/)
    }
})
