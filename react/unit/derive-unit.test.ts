import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { mapUSSFromString } from '../src/mapper/settings/map-uss'
import { deriveMapUnit, deriveTableColumnUnit } from '../src/urban-stats-script/derive-unit'
import { reifyString } from '../src/utils/human-readable-name'
import { StoredUnit, writeQuantity } from '../src/utils/quantity'

/** A quantity of 1000 of the base units, written the way the map's ramp would write it. */
function written(unit: StoredUnit | undefined): string {
    if (unit === undefined) {
        return 'nothing'
    }
    const quantity = writeQuantity(1000, unit)
    return `${quantity.renderedValue}${reifyString(quantity.unitName)}`
}

function mapUnit(data: string): string {
    return written(deriveMapUnit(mapUSSFromString(`cMap(data=${data}, scale=linearScale(), ramp=rampUridis)`), defaultTypeEnvironment('USA')))
}

function columnUnit(values: string, columnIndex = 0): string {
    return written(deriveTableColumnUnit(mapUSSFromString(`table(columns=[${values}])`), defaultTypeEnvironment('USA'), columnIndex))
}

void test('a map is written in the units of what it maps', () => {
    assert.equal(mapUnit('population'), '1\u202f000')
    assert.equal(mapUnit('population / area'), '1\u202f000/\u00a0km^{2}')
    assert.equal(mapUnit('area ** 0.5'), '1\u202f000km')
    assert.equal(mapUnit('high_temp'), '1\u202f000.0°F')
    // a difference of two temperatures is degrees, and written from no zero of its own
    assert.equal(mapUnit('high_temp - low_temp'), '+1\u202f000.0°F')
})

void test('a map of what no unit can be read off says nothing', () => {
    assert.equal(mapUnit('population + area'), 'nothing')
    assert.equal(mapUnit('high_temp + low_temp'), 'nothing')
    assert.equal(mapUnit('someFunctionOrOther(population)'), 'nothing')
})

void test('a quantity with no writing is left to whatever its name is taken for', () => {
    // a root of a count is in no unit any pool holds, and asking for one threw
    assert.equal(mapUnit('population ** 0.5'), 'nothing')
    // a count goes unnamed, so it can only be the one thing counted: people times an area would
    // be written km^{2} and read as an area, and an area over people as an area too
    assert.equal(mapUnit('population * area'), 'nothing')
    assert.equal(mapUnit('area / population'), 'nothing')
    assert.equal(mapUnit('traffic_fatalities / population'), 'nothing')
    // where a count over something measured is written the way a density is
    assert.equal(mapUnit('traffic_fatalities / area'), '1\u202f000/\u00a0km^{2}')
})

void test('a difference of two is written as one', () => {
    assert.equal(mapUnit('population - population_2000'), '+1\u202f000')
})

void test('a script is read as a whole, so a map of what it named is in those units', () => {
    const uss = mapUSSFromString('x = population / area\ncondition (true)\ncMap(data=x, scale=linearScale(), ramp=rampUridis)')
    assert.equal(written(deriveMapUnit(uss, defaultTypeEnvironment('USA'))), '1\u202f000/\u00a0km^{2}')
})

void test('a column is written in the units of its values', () => {
    assert.equal(columnUnit('column(values=population / area)'), '1\u202f000/\u00a0km^{2}')
    assert.equal(columnUnit('column(values=population), column(values=area)', 1), '1\u202f000km^{2}')
    assert.equal(columnUnit('column(values=population)', 1), 'nothing')
})
