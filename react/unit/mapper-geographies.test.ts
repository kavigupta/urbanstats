import assert from 'assert/strict'
import { test } from 'node:test'

import { loadInsets } from '../src/mapper/context'
import { mapUSSFromString } from '../src/mapper/settings/map-uss'
import { geographiesFromMeta, mapperMetaFields } from '../src/mapper/settings/utils'
import { toStatement } from '../src/urban-stats-script/ast'
import { Inset } from '../src/urban-stats-script/constants/insets'
import { createRequestExecutor } from '../src/urban-stats-script/execute-request'
import { USSValue } from '../src/urban-stats-script/types-values'
import { GeographySelection } from '../src/urban-stats-script/workerManager'
import { extendCoordBoxes } from '../src/utils/partition-boxes'
import './util/fetch'

function meta(raw: unknown): ReturnType<typeof geographiesFromMeta> {
    return geographiesFromMeta(mapperMetaFields.parse(raw))
}

void test('a link from before maps spanned several geographies', () => {
    assert.deepEqual(meta({ universe: 'USA', geographyKind: 'County' }), [{ universe: 'USA', geographyKind: 'County' }])
})

void test('a geography kind that no longer exists falls back to the default', () => {
    assert.deepEqual(meta({ universe: 'USA', geographyKind: 'Duchy' }), [{ universe: 'USA', geographyKind: 'Subnational Region' }])
})

void test('parallel lists pair up by position', () => {
    assert.deepEqual(meta({ universe: ['USA', 'Iceland'], geographyKind: ['County', 'Urban Center'] }), [
        { universe: 'USA', geographyKind: 'County' },
        { universe: 'Iceland', geographyKind: 'Urban Center' },
    ])
})

void test('a pair naming a universe that no longer exists is dropped', () => {
    assert.deepEqual(meta({ geographies: [{ universe: 'USA', geographyKind: 'County' }, { universe: 'Cascadia', geographyKind: 'County' }] }),
        [{ universe: 'USA', geographyKind: 'County' }])
})

void test('saying nothing differs from selecting nothing', () => {
    assert.equal(meta({}), undefined)
    assert.deepEqual(meta({ geographies: [] }), [])
})

function screenBox(inset: Inset): [number, number, number, number] {
    return [...inset.bottomLeft, ...inset.topRight]
}

function unnamed(inset: Inset): Inset {
    return { bottomLeft: inset.bottomLeft, topRight: inset.topRight, coordBox: inset.coordBox, mainMap: inset.mainMap }
}

void test('combining one universe leaves its insets alone', () => {
    assert.deepEqual(loadInsets(['USA', 'USA']), loadInsets('USA'))
})

void test('combining universes regroups their main maps and keeps the rest', () => {
    const separate = [...loadInsets('USA'), ...loadInsets('Iceland')]
    const combined = loadInsets(['USA', 'Iceland'])

    assert.deepEqual(combined.filter(inset => !inset.mainMap).map(unnamed), separate.filter(inset => !inset.mainMap))

    const mains = combined.filter(inset => inset.mainMap)
    assert.ok(mains.length >= 1)
    const separateMains = separate.filter(inset => inset.mainMap)
    assert.deepEqual(extendCoordBoxes(mains.map(inset => inset.coordBox)), extendCoordBoxes(separateMains.map(inset => inset.coordBox)))
    assert.deepEqual(extendCoordBoxes(mains.map(screenBox)), extendCoordBoxes(separateMains.map(screenBox)))
})

async function mapVariables(geographies: GeographySelection[], data: string): Promise<Map<string, USSValue>> {
    const result = await createRequestExecutor()({
        descriptor: { kind: 'mapper', geographies },
        stmts: toStatement(mapUSSFromString(`cMap(data=${data}, scale=linearScale(), ramp=rampUridis)`)),
    })
    assert.deepEqual(result.error, [])
    return result.assignments.variables
}

const numbers = async (geographies: GeographySelection[], data: string): Promise<number[]> =>
    (await mapVariables(geographies, data)).get(data)!.value as number[]

const usaStates: GeographySelection = { universe: 'USA', geographyKind: 'Subnational Region' }
const icelandRegions: GeographySelection = { universe: 'Iceland', geographyKind: 'Subnational Region' }

void test('one run over several geographies concatenates them', async () => {
    const names = async (geographies: GeographySelection[]): Promise<string[]> =>
        (await mapVariables(geographies, 'population')).get('geoName')!.value as string[]

    assert.deepEqual(await names([usaStates, icelandRegions]), [...await names([usaStates]), ...await names([icelandRegions])])
})

void test('a statistic missing from one geography falls back to a source covering it', async () => {
    const geographies = [usaStates, icelandRegions]
    const census = await numbers(geographies, 'population_us_census')
    const population = await numbers(geographies, 'population')

    assert.ok(census.some(value => Number.isNaN(value)), 'expected rows the US census does not cover')
    census.forEach((value, i) => {
        if (Number.isNaN(value)) {
            assert.ok(!Number.isNaN(population[i]), `population is missing for row ${i}`)
        }
    })
})
