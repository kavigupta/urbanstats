import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { mapUSSFromString } from '../src/mapper/settings/map-uss'
import { deriveMapUnit, deriveTableColumnUnit } from '../src/urban-stats-script/derive-unit'
import { reifyString } from '../src/utils/human-readable-name'
import { ReaderSettings, StoredUnit, writeQuantity } from '../src/utils/quantity'

/** A quantity of the base units, written the way the map's ramp would write it. */
function written(unit: StoredUnit | undefined, value = 1000, settings: ReaderSettings = {}): string {
    if (unit === undefined) {
        return 'nothing'
    }
    const quantity = writeQuantity(value, unit, settings)
    return `${quantity.renderedValue}${reifyString(quantity.unitName)}`
}

function unitOfMap(data: string): StoredUnit | undefined {
    return deriveMapUnit(mapUSSFromString(`cMap(data=${data}, scale=linearScale(), ramp=rampUridis)`), defaultTypeEnvironment('USA'))
}

function mapUnit(data: string): string {
    return written(unitOfMap(data))
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

void test('a reader in Celsius reads a difference of two temperatures as one', () => {
    const asRead = (data: string, temperatureUnit: string): string => written(unitOfMap(data), 22.3, { temperatureUnit })
    // twenty-two Fahrenheit degrees between the day's high and its low is twelve Celsius degrees,
    // where a reading of twenty-two Fahrenheit is a reading of five and a half below freezing
    assert.equal(asRead('high_temp - low_temp', 'celsius'), '+12.4°C')
    assert.equal(asRead('high_temp', 'celsius'), '-5.4°C')
    // and the mean of two readings is a reading again, which the coefficient is what keeps track of
    assert.equal(asRead('(high_temp + low_temp) / 2', 'celsius'), '-5.4°C')
    assert.equal(asRead('high_temp - low_temp', 'fahrenheit'), '+22.3°F')
    assert.equal(asRead('high_temp', 'fahrenheit'), '22.3°F')
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
