import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { statsAllUniverses } from '../src/components/search-statistic'
import statistic_name_list from '../src/data/statistic_name_list'
import type_ordering_idx from '../src/data/type_ordering_idx'
import universes_ordered from '../src/data/universes_ordered'

import './util/fetch'

// Reverse lookup: typeIndex -> geography name
const typeIndexToGeography = new Map<number, string>()
for (const [geo, idx] of Object.entries(type_ordering_idx)) {
    typeIndexToGeography.set(idx, geo)
}

async function buildStatsUniverseMap(): Promise<Map<string, string>> {
    const generatorFactory = await statsAllUniverses()
    const generator = generatorFactory()

    const result = new Map<string, string>()

    for (const { statisticIndex, typeIndex, universeIndex } of generator) {
        const statName = statistic_name_list[statisticIndex]
        const geoName = typeIndexToGeography.get(typeIndex)
        const universeName = universes_ordered[universeIndex]

        if (geoName) {
            result.set(`${statName}__${geoName}`, universeName)
        }
    }

    return result
}

void describe('statsAllUniverses', () => {
    const statsUniverseMap = buildStatsUniverseMap()

    void test('Population in County has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Population__County'), 'USA')
    })

    void test('Population in City has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Population__City'), 'USA')
    })

    void test('Area in County has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Area__County'), 'USA')
    })

    void test('Area in City has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Area__City'), 'USA')
    })

    void test('Population in MSA has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Population__MSA'), 'USA')
    })

    void test('Population in ZIP has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Population__ZIP'), 'USA')
    })

    void test('Population in Neighborhood has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Population__Neighborhood'), 'USA')
    })

    void test('Population in Country has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Population [GHS-POP]__Country'), 'world')
    })

    void test('Population in Urban Area has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Population__Urban Area'), 'USA')
    })

    void test('Median Household Income (USD) in County has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Median Household Income (USD)__County'), 'USA')
    })

    void test('Median Household Income (USD) in City has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Median Household Income (USD)__City'), 'USA')
    })
    void test('ag in canadian ridings', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Employed in Agriculture, forestry, fishing and hunting % [StatCan]__CA Riding'), 'Canada')
    })
    void test('canadian ag in metropolitan cluster has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('Employed in Agriculture, forestry, fishing and hunting % [StatCan]__Metropolitan Cluster'), 'Canada')
    })
    void test('pollution in canadian ridings has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('PW Mean PM2.5 Pollution__CA Riding'), 'Canada')
    })
    void test('pollution in metropolitan clusters has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('PW Mean PM2.5 Pollution__Metropolitan Cluster'), 'world')
    })
    void test('pollution in counties has expected universe', async () => {
        const map = await statsUniverseMap
        assert.equal(map.get('PW Mean PM2.5 Pollution__County'), 'USA')
    })
})
