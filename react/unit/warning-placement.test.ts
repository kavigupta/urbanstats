import assert from 'assert/strict'
import { test } from 'node:test'

import { warningRowIndices } from '../src/components/warning-placement'
import { StatPath, statPathToOrder } from '../src/page_template/statistic-tree'

function order(path: StatPath): number {
    const result = statPathToOrder.get(path)
    assert.notStrictEqual(result, undefined, `${path} is not in the statistic tree`)
    return result!
}

// Real paths, in tree order. Area has no year, so it survives deselecting the years.
const population: StatPath = 'population'
const populationDensity: StatPath = 'ad_1'
const area: StatPath = 'area'

// A metadata path, and two densities that sort after it. Metadata renders at the end of the table
// rather than in tree order, so these three render out of order relative to each other.
const fips: StatPath = 'metadata_show_metadata_fips'
const quarterKmDensity: StatPath = 'ad_0.25'
const halfKmDensity: StatPath = 'ad_0.5'

void test('a warning goes where its statistics would have been', () => {
    assert.deepStrictEqual(
        warningRowIndices([populationDensity, area], [order(population)]),
        [0],
    )
    assert.deepStrictEqual(
        warningRowIndices([population, area], [order(populationDensity)]),
        [1],
    )
})

void test('a warning about statistics after every row goes last', () => {
    assert.deepStrictEqual(
        warningRowIndices([population, populationDensity], [order(area)]),
        [2],
    )
})

void test('every warning goes first when there are no rows', () => {
    assert.deepStrictEqual(
        warningRowIndices([], [order(population), order(area)]),
        [0, 0],
    )
})

void test('several warnings keep their order', () => {
    const indices = warningRowIndices([populationDensity], [order(population), order(area)])
    assert.deepStrictEqual(indices, [0, 1])
})

void test('metadata rows at the end of the table do not displace warnings', () => {
    assert.ok(
        order(fips) < order(quarterKmDensity) && order(quarterKmDensity) < order(halfKmDensity),
        'this test needs a metadata path that sorts before both densities',
    )
    // FIPS sorts before the missing density but renders after it, so counting preceding rows
    // would wrongly push the warning past the density row it belongs above.
    assert.deepStrictEqual(
        warningRowIndices([population, halfKmDensity, fips], [order(quarterKmDensity)]),
        [1],
    )
})

void test('a warning about statistics before a trailing metadata row still goes first', () => {
    assert.deepStrictEqual(
        warningRowIndices([populationDensity, fips], [order(population)]),
        [0],
    )
})
