import assert from 'assert/strict'
import { test } from 'node:test'

import { statGeographies, statisticGeographyParams } from '../src/stat/utils'

void test('a link from before a table spanned several geographies', () => {
    assert.deepEqual(statGeographies(undefined, 'County', 'USA'), [{ universe: 'USA', geographyKind: 'County' }])
})

void test('a link naming no geography at all tabulates none', () => {
    assert.deepEqual(statGeographies(undefined, undefined, 'world'), [])
})

void test('the list wins over the scalars', () => {
    const geographies = [{ universe: 'USA' as const, geographyKind: 'County' }]
    assert.deepEqual(statGeographies(geographies, 'City', 'France'), geographies)
})

void test('one geography is still written as the scalar params', () => {
    assert.deepEqual(statisticGeographyParams([{ universe: 'USA', geographyKind: 'County' }]),
        { article_type: 'County', universe: 'USA', geographies: undefined })
})

void test('the world is the universe a link means when it names none', () => {
    assert.deepEqual(statisticGeographyParams([{ universe: 'world', geographyKind: 'Country' }]),
        { article_type: 'Country', universe: undefined, geographies: undefined })
})

void test('several geographies are written as the list', () => {
    const geographies = [
        { universe: 'USA' as const, geographyKind: 'County' as const },
        { universe: 'Canada' as const, geographyKind: 'Subnational Region' as const },
    ]
    assert.deepEqual(statisticGeographyParams(geographies), { article_type: undefined, universe: undefined, geographies })
})

void test('selecting no geography is not the same as naming none', () => {
    assert.deepEqual(statisticGeographyParams([]), { article_type: undefined, universe: undefined, geographies: [] })
})
