import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { mapUSSFromString } from '../src/mapper/settings/map-uss'
import { deriveMapUnit, deriveTableColumnUnit, unitOrNothing } from '../src/urban-stats-script/derive-unit'
import { reifyString } from '../src/utils/human-readable-name'
import { UnitSettings, StoredUnit, writeQuantity } from '../src/utils/quantity'

/** A quantity of the base units, written the way the map's ramp would write it. */
function written(unit: StoredUnit | undefined, value = 1000, settings: UnitSettings = {}): string {
    if (unit === undefined) {
        return 'nothing'
    }
    const quantity = writeQuantity(value, unit, settings, {})
    return `${quantity.renderedValue}${reifyString(quantity.unitName, {})}`
}

function unitOfMap(data: string): StoredUnit | undefined {
    return unitOrNothing(deriveMapUnit(mapUSSFromString(`cMap(data=${data}, scale=linearScale(), ramp=rampUridis)`), defaultTypeEnvironment('USA')))
}

function mapUnit(data: string): string {
    return written(unitOfMap(data))
}

function columnUnit(values: string, columnIndex = 0): string {
    return written(unitOrNothing(deriveTableColumnUnit(mapUSSFromString(`table(columns=[${values}])`), defaultTypeEnvironment('USA'), columnIndex)))
}

void test('a map is written in the units of what it maps', () => {
    assert.equal(mapUnit('population'), '1\u202f000')
    assert.equal(mapUnit('population / area'), '1\u202f000/km^{2}')
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

void test('a map of a regression is written in the units of what was regressed', () => {
    const map = (preamble: string, data: string): StoredUnit | undefined =>
        unitOrNothing(deriveMapUnit(mapUSSFromString(`${preamble}\ncondition (true)\ncMap(data=${data}, scale=linearScale(), ramp=rampUridis)`), defaultTypeEnvironment('USA')))
    const shares = 'regr = regression(y=commute_transit, x1=ln(density_pw_1km), weight=population)'
    // what a share was above what the regression expected of it, which is a difference of two shares
    assert.equal(written(map(shares, 'do { x = regr.residuals; x }'), 0.05), '+5.00%')
    assert.equal(written(map(shares, 'regr.b'), 0.05), '5.00%')
    // a share over a logarithm is a number of neither kind, as r squared is a number of no kind
    assert.equal(written(map(shares, 'regr.m1'), 0.05), '0.0500')
    assert.equal(written(map(shares, 'regr.r2'), 0.05), '0.0500')
    const people = 'regr = regression(y=population, x1=area)'
    assert.equal(written(map(people, 'regr.m1'), 1000), '1\u202f000/km^{2}')
    assert.equal(written(map(people, 'regr.residuals'), 1000), '+1\u202f000')
})

void test('a statistic that names its own units is written in them, counted things and all', () => {
    // fatalities over people, both of them counted, which the statistic names as fatalities per 100k
    const perCapita = unitOrNothing(deriveTableColumnUnit(mapUSSFromString('table(columns=[column(values=ped_cyclist_fatalities_per_capita)])'), defaultTypeEnvironment('USA'), 0))
    assert.equal(written(perCapita, 1e-5), '1.00/100k')
    assert.equal(written(unitOfMap('traffic_fatalities_per_capita'), 1e-5), '1.00/100k')
})

// What a map of each of these is written in, at a stored value of 1234
for (const [data, expected] of [
    // a rate times a time is a length, and a count over a time is a rate of its own
    ['rainfall * sunny_hours', '14.1cm'],
    ['population / sunny_hours', '20.6/min'],
    ['elevation * elevation', '1\u202f234m^{2}'],
    ['area ** -1', '1\u202f234/km^{2}'],
    // of no dimension left, and of no kind either
    ['area / area', '1\u202f230'],
    ['population ** 0', '1\u202f230'],
    ['inverseQuantile(area, area)', '1\u202f230'],
    // a reading over a reading has no zero to divide from, and two lengths held apart do not meet
    ['high_temp / high_temp', 'nothing'],
    ['minimum(elevation, hospital_mean_dist)', 'nothing'],
    // an empty vector is of every kind and so of none
    ['[]', 'nothing'],
    // the ways a script has of saying the same thing
    ['if (population > 0) { area } else { area }', '1\u202f234km^{2}'],
    ['if (population > 0) { area }', '1\u202f234km^{2}'],
    ['do { x = area; x }', '1\u202f234km^{2}'],
    ['[area, area]', '1\u202f234km^{2}'],
    ['sum(area)', '1\u202f234km^{2}'],
] as const) {
    void test(`a map of ${data} is written ${expected}`, () => {
        assert.equal(written(unitOfMap(data), 1234), expected)
    })
}

void test('a difference of two leads is written as the lead it is, and not twice over', () => {
    // whose lead it is carries a plus of its own, so a swing of four and a half is D+4.50%
    assert.equal(written(unitOfMap('pres_2020_margin - pres_2016_margin'), 0.045), 'D+4.50%')
    assert.equal(written(unitOfMap('pres_2020_margin'), 0.045), 'D+4.50%')
    // where a change of no party's keeps the plus that says it is a change
    assert.equal(written(unitOfMap('commute_bike - commute_transit'), 0.045), '+4.50%')
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
    assert.equal(mapUnit('traffic_fatalities / area'), '1\u202f000/km^{2}')
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
    assert.equal(written(unitOrNothing(deriveMapUnit(uss, defaultTypeEnvironment('USA')))), '1\u202f000/km^{2}')
})

void test('a column is written in the units of its values', () => {
    assert.equal(columnUnit('column(values=population / area)'), '1\u202f000/km^{2}')
    assert.equal(columnUnit('column(values=population), column(values=area)', 1), '1\u202f000km^{2}')
    assert.equal(columnUnit('column(values=population)', 1), 'nothing')
})
