import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { Expression, FilteredFeature, matchesFilter } from '../cf-og-worker/src/style-filter'
import cardBasemap from '../src/data/card_basemap.json'

const line = (properties: FilteredFeature['properties']): FilteredFeature => ({ properties, type: 2 })

void describe('matchesFilter', () => {
    void test('no filter matches everything', () => {
        assert.equal(matchesFilter(undefined, line({})), true)
    })

    void test('get, has and comparisons', () => {
        const filter: Expression = ['all', ['==', ['get', 'class'], 'river'], ['!', ['has', 'service']], ['>=', ['get', 'admin_level'], 3]]
        assert.equal(matchesFilter(filter, line({ class: 'river', admin_level: 4 })), true)
        assert.equal(matchesFilter(filter, line({ class: 'river', admin_level: 2 })), false)
        assert.equal(matchesFilter(filter, line({ class: 'river', admin_level: 4, service: 'siding' })), false)
    })

    void test('a missing property is null, so != still matches', () => {
        assert.equal(matchesFilter(['!=', ['get', 'maritime'], 1], line({})), true)
        assert.equal(matchesFilter(['<=', ['get', 'admin_level'], 4], line({})), false)
    })

    void test('ordering across types is false rather than coerced', () => {
        assert.equal(matchesFilter(['>=', ['get', 'admin_level'], 3], line({ admin_level: '4' })), false)
        assert.equal(matchesFilter(['==', ['typeof', ['get', 'admin_level']], 'number'], line({ admin_level: 4 })), true)
    })

    void test('match takes a label or a list of them, then the fallback', () => {
        const filter: Expression = ['match', ['get', 'class'], ['canal', 'stream'], true, 'river', ['==', ['get', 'intermittent'], 0], false]
        assert.equal(matchesFilter(filter, line({ class: 'stream' })), true)
        assert.equal(matchesFilter(filter, line({ class: 'river', intermittent: 0 })), true)
        assert.equal(matchesFilter(filter, line({ class: 'river', intermittent: 1 })), false)
        assert.equal(matchesFilter(filter, line({ class: 'drain' })), false)
    })

    void test('geometry-type is the single form, which the style matches alongside the multi', () => {
        const filter: Expression = ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false]
        assert.equal(matchesFilter(filter, { properties: {}, type: 3 }), true)
        assert.equal(matchesFilter(filter, line({})), false)
    })

    void test('an operator it does not know throws', () => {
        assert.throws(() => matchesFilter(['in', ['get', 'class'], 'river'], line({ class: 1 })))
    })

    void test('every filter in the generated basemap evaluates', () => {
        const samples = [
            line({}),
            line({ class: 'motorway', brunnel: 'bridge', ramp: 1 }),
            line({ admin_level: 2, maritime: 1, adm0_l: 'France', adm0_r: 'Spain' }),
            { properties: { class: 'wood', subclass: 'forest' }, type: 3 as const },
        ]
        for (const layer of cardBasemap.layers as { filter?: Expression }[]) {
            for (const sample of samples) {
                matchesFilter(layer.filter, sample)
            }
        }
    })

    void test('a country\'s sea border shows only between two countries', () => {
        const filter = (cardBasemap.layers as { id: string, filter?: Expression }[]).find(layer => layer.id === 'boundary_2')!.filter
        assert.equal(matchesFilter(filter, line({ admin_level: 2, maritime: 1, adm0_l: 'France', adm0_r: 'Spain' })), true)
        assert.equal(matchesFilter(filter, line({ admin_level: 2, maritime: 1, adm0_l: 'France' })), false)
    })
})
