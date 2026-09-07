import assert from 'assert/strict'
import { test } from 'node:test'

import { loadInsets } from '../src/mapper/context'
import { mapUSSFromString } from '../src/mapper/settings/map-uss'
import { geographiesFromMeta, mapperMetaFields } from '../src/mapper/settings/utils'
import { Universe } from '../src/universe'
import { toStatement } from '../src/urban-stats-script/ast'
import { Inset } from '../src/urban-stats-script/constants/insets'
import { createRequestExecutor } from '../src/urban-stats-script/execute-request'
import { USSValue } from '../src/urban-stats-script/types-values'
import { GeographySelection } from '../src/urban-stats-script/workerManager'
import { CoordBox, extendCoordBoxes, mercatorBox } from '../src/utils/partition-boxes'
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

function assertClose(actual: number[], expected: number[]): void {
    assert.equal(actual.length, expected.length)
    actual.forEach((value, i) => { assert.ok(Math.abs(value - expected[i]) < 1e-9, `${value} != ${expected[i]}`) })
}

void test('combining one universe leaves its insets alone', () => {
    assert.deepEqual(loadInsets(['USA', 'USA']), loadInsets('USA'))
})

void test('universes far apart get main maps of their own, neighbours share one', () => {
    assert.equal(loadInsets(['USA', 'Iceland']).filter(inset => inset.mainMap).length, 2)
    assert.equal(loadInsets(['USA', 'Canada']).filter(inset => inset.mainMap).length, 1)
})

void test('the combined main maps take up exactly the space the separate ones did', () => {
    const separate = [...loadInsets('USA'), ...loadInsets('Iceland')].filter(inset => inset.mainMap)
    const combined = loadInsets(['USA', 'Iceland']).filter(inset => inset.mainMap)

    assert.deepEqual(extendCoordBoxes(combined.map(inset => inset.coordBox)), extendCoordBoxes(separate.map(inset => inset.coordBox)))
    assert.deepEqual(extendCoordBoxes(combined.map(screenBox)), extendCoordBoxes(separate.map(screenBox)))
})

function remapBox(box: CoordBox, from: CoordBox, to: CoordBox): CoordBox {
    const axis = (value: number, i: 0 | 1): number => to[i] + (value - from[i]) / (from[i + 2] - from[i]) * (to[i + 2] - to[i])
    return [axis(box[0], 0), axis(box[1], 1), axis(box[2], 0), axis(box[3], 1)]
}

/** Which part of the world a box drawn on this map covers. */
function drawnOver(main: Inset, box: CoordBox): CoordBox {
    return remapBox(box, screenBox(main), mercatorBox(main.coordBox))
}

function mainCovering(combined: Inset[], coordBox: CoordBox): Inset {
    const main = combined.find(inset => inset.mainMap
        && inset.coordBox[0] <= coordBox[0] && inset.coordBox[1] <= coordBox[1]
        && inset.coordBox[2] >= coordBox[2] && inset.coordBox[3] >= coordBox[3])
    assert.ok(main !== undefined, 'no main map covers this universe')
    return main
}

// 'France' is far enough from the USA to get a main map of its own; 'Canada' shares one
for (const other of ['France', 'Canada'] as Universe[]) {
    void test(`combining the USA with ${other} leaves every inset over the same place`, () => {
        const combined = loadInsets(['USA', other])
        let checked = 0
        for (const universe of ['USA', other] as Universe[]) {
            const alone = loadInsets(universe)
            const aloneMain = alone.find(inset => inset.mainMap)!
            const combinedMain = mainCovering(combined, aloneMain.coordBox)

            for (const inset of alone.filter(candidate => !candidate.mainMap)) {
                const moved = combined.find(candidate => !candidate.mainMap && candidate.coordBox.every((v, i) => v === inset.coordBox[i]))
                assert.ok(moved !== undefined, `${universe} lost an inset`)
                assertClose(drawnOver(combinedMain, screenBox(moved)), drawnOver(aloneMain, screenBox(inset)))
                checked += 1
            }
        }
        assert.ok(checked > 0, 'no insets to place')
    })
}

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
