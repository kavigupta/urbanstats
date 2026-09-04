import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { mapDataExpression, MapUSS, mapUSSFromString, tableColumnExpression } from '../src/mapper/settings/map-uss'
import { UrbanStatsASTExpression } from '../src/urban-stats-script/ast'
import { deriveMapUnit, deriveTableColumnUnit } from '../src/urban-stats-script/derive-unit'
import { unparse } from '../src/urban-stats-script/parser'
import { ReadInUnits, unitCheck } from '../src/urban-stats-script/unit-inference'
import { reifyString } from '../src/utils/human-readable-name'
import { UnitSettings, StoredUnit, writeQuantity } from '../src/utils/quantity'

/** A quantity of the base units, written the way the map's ramp would write it. */
function written(unit: StoredUnit | undefined, value = 1000, settings: UnitSettings = {}): string {
    if (unit === undefined) {
        return 'nothing'
    }
    const quantity = writeQuantity(value, unit, settings, 'byItself')
    return `${quantity.renderedValue}${reifyString(quantity.unitName, {})}`
}

function mapOf(data: string): MapUSS {
    return mapUSSFromString(`cMap(data=${data}, scale=linearScale(), ramp=rampUridis)`)
}

function unitOfMap(data: string): StoredUnit | undefined {
    return deriveMapUnit(mapOf(data), defaultTypeEnvironment('USA'))
}

/** An expression as reading the script for its units left it, which is what the unit is read off. */
function asRead(uss: MapUSS, of: (checked: MapUSS<ReadInUnits>) => UrbanStatsASTExpression<ReadInUnits> | undefined): string {
    const expression = of(unitCheck(uss, defaultTypeEnvironment('USA')).ast)
    return expression === undefined ? 'nothing' : unparse(expression, { inline: true, expressionalContext: true })
}

function mapAsRead(data: string): string {
    return asRead(mapOf(data), checked => mapDataExpression(checked, defaultTypeEnvironment('USA')))
}

/** The expression as the script is read, and the unit a map of it is written in. */
function mapUnit(data: string): string {
    return `${mapAsRead(data)} : ${written(unitOfMap(data))}`
}

function columnUnit(values: string, columnIndex = 0): string {
    const uss = mapUSSFromString(`table(columns=[${values}])`)
    const unit = deriveTableColumnUnit(uss, defaultTypeEnvironment('USA'), columnIndex)
    return `${asRead(uss, checked => tableColumnExpression(checked, defaultTypeEnvironment('USA'), columnIndex))} : ${written(unit)}`
}

void test('a map is written in the units of what it maps', () => {
    assert.equal(mapUnit('population'), 'population : 1\u202f000')
    assert.equal(mapUnit('population / area'), 'population / area : 1\u202f000/km^{2}')
    assert.equal(mapUnit('area ** 0.5'), 'area ** 0.5 : 1\u202f000km')
    assert.equal(mapUnit('high_temp'), 'high_temp : 1\u202f000.0°F')
    // a difference of two temperatures is degrees, and written from no zero of its own
    assert.equal(mapUnit('high_temp - low_temp'), 'high_temp - low_temp : +1\u202f000.0°F')
})

void test('two quantities add in the units of the left, whatever the right is stored in', () => {
    // the values added are the ones the statistics are stored as, so metres added to kilometres are
    // read as a thousand of them each, which is a factor the caption writes out
    assert.equal(mapUnit('hospital_mean_dist + elevation'), 'hospital_mean_dist + elevation * 1 : 1\u202f000km')
    assert.equal(mapUnit('elevation + hospital_mean_dist'), 'elevation + hospital_mean_dist * 1 : 1\u202f000m')
    assert.equal(mapUnit('area + area'), 'area + area : 1\u202f000km^{2}')
})

void test('a literal is read in whatever unit makes the rest of the expression work', () => {
    // people are no area, but a number multiplying them may be an area over each of them
    assert.equal(mapUnit('area + population * 1'), 'area + population * 1 : 1\u202f000km^{2}')
    // and where no literal is written, the script is read as supplying one
    assert.equal(mapUnit('area + population'), 'area + population * 1 : 1\u202f000km^{2}')
    assert.equal(mapUnit('area + ln(population * 1)'), 'area + (ln(toNumber(population * 1))) * 1 : 1\u202f000km^{2}')
})

void test('a map of what no unit can be read off says nothing', () => {
    // no factor makes a sum of two readings one reading, there being no zero to add from
    assert.equal(mapUnit('high_temp + low_temp'), 'high_temp + low_temp : nothing')
    assert.equal(mapUnit('someFunctionOrOther(population)'), 'someFunctionOrOther(population) : nothing')
})

void test('a map of a regression is written in the units of what was regressed', () => {
    const map = (preamble: string, data: string): StoredUnit | undefined =>
        deriveMapUnit(mapUSSFromString(`${preamble}\ncondition (true)\ncMap(data=${data}, scale=linearScale(), ramp=rampUridis)`), defaultTypeEnvironment('USA'))
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
    const perCapita = deriveTableColumnUnit(mapUSSFromString('table(columns=[column(values=ped_cyclist_fatalities_per_capita)])'), defaultTypeEnvironment('USA'), 0)
    assert.equal(written(perCapita, 1e-5), '1.00/100k')
    assert.equal(written(unitOfMap('traffic_fatalities_per_capita'), 1e-5), '1.00/100k')
})

// What a map of each of these is written in, at a stored value of 1234
for (const [data, expected] of [
    // a rate times a time is a length, and a count over a time is a rate of its own
    ['rainfall * sunny_hours', 'rainfall * sunny_hours : 14.1cm'],
    ['population / sunny_hours', 'population / sunny_hours : 20.6/min'],
    ['elevation * elevation', 'elevation * elevation : 1\u202f234m^{2}'],
    ['area ** -1', 'area ** (-1) : 1\u202f234/km^{2}'],
    // of no dimension left, and of no kind either
    ['area / area', 'area / area : 1\u202f230'],
    ['population ** 0', 'population ** 0 : 1\u202f230'],
    ['inverseQuantile(area, area)', 'inverseQuantile(area, area) : 1\u202f230'],
    // a reading over a reading is what is left of each once the zero it is counted from is out
    ['high_temp / high_temp', '(high_temp - 0) / (high_temp - 0) : 1\u202f230'],
    // two lengths stored apart meet where one of them is read as so many of the other
    ['minimum(elevation, hospital_mean_dist)', 'minimum(elevation, hospital_mean_dist * 1) : 1.23km'],
    // an empty vector is of every kind and so of none
    ['[]', '[] : nothing'],
    // the ways a script has of saying the same thing
    ['if (population > 0) { area } else { area }', 'if (population > 0) { area } else { area } : 1\u202f234km^{2}'],
    ['if (population > 0) { area }', 'if (population > 0) { area } : 1\u202f234km^{2}'],
    ['do { x = area; x }', 'do { x = area; x } : 1\u202f234km^{2}'],
    ['[area, area]', '[area, area] : 1\u202f234km^{2}'],
    ['sum(area)', 'sum(area) : 1\u202f234km^{2}'],
] as const) {
    void test(`a map of ${data}`, () => {
        assert.equal(`${mapAsRead(data)} : ${written(unitOfMap(data), 1234)}`, expected)
    })
}

void test('a difference of two leads is written as the lead it is, and not twice over', () => {
    // whose lead it is carries a plus of its own, so a swing of four and a half is D+4.50%
    assert.equal(written(unitOfMap('pres_2020_margin - pres_2016_margin'), 0.045), 'D+4.50%')
    assert.equal(written(unitOfMap('pres_2020_margin'), 0.045), 'D+4.50%')
    // where a change of no party's keeps the plus that says it is a change
    assert.equal(written(unitOfMap('commute_bike - commute_transit'), 0.045), '+4.50%')
})

void test('a count is written as nothing, whatever else it is multiplied by', () => {
    // a root of a count is written as the plain number it is, the count having no name to raise
    assert.equal(mapUnit('population ** 0.5'), 'population ** 0.5 : 1\u202f000people^{0.5}')
    // people times an area is written km^{2}, one of a count being named by the statistic counting
    // it; an area over people says the people, there being no one of them to leave unsaid
    assert.equal(mapUnit('population * area'), 'population * area : 1\u202f000km^{2}')
    assert.equal(mapUnit('area / population'), 'area / population : 1\u202f000km^{2}/person')
    assert.equal(mapUnit('traffic_fatalities / population'), 'traffic_fatalities / population : 1\u202f000/person')
    assert.equal(mapUnit('traffic_fatalities / area'), 'traffic_fatalities / area : 1\u202f000/km^{2}')
    // a count is shortened only where it is the whole of what is written: a square of one is not
    // written in squares of millions
    assert.equal(written(unitOfMap('population'), 1.234e6), '1.23m')
    assert.equal(written(unitOfMap('population * population'), 1e12), '1\u202f000\u202f000\u202f000\u202f000people^{2}')
})

void test('dollars and fatalities are counted the way people are', () => {
    assert.equal(mapUnit('median_household_income_usd ** 0.5'), 'median_household_income_usd ** 0.5 : 1\u202f000dollars^{0.5}')
    assert.equal(mapUnit('median_household_income_usd * median_household_income_usd'), 'median_household_income_usd * median_household_income_usd : 1\u202f000dollars^{2}')
    assert.equal(mapUnit('area / median_household_income_usd'), 'area / median_household_income_usd : 1\u202f000km^{2}/dollar')
    assert.equal(mapUnit('traffic_fatalities ** 0.5'), 'traffic_fatalities ** 0.5 : 1\u202f000fatalities^{0.5}')
    assert.equal(mapUnit('traffic_fatalities * traffic_fatalities'), 'traffic_fatalities * traffic_fatalities : 1\u202f000fatalities^{2}')
    assert.equal(mapUnit('area / traffic_fatalities'), 'area / traffic_fatalities : 1\u202f000km^{2}/fatality')
    // one of a count goes unsaid above the solidus and is said under it, however many are counted
    assert.equal(mapUnit('traffic_fatalities / population'), 'traffic_fatalities / population : 1\u202f000/person')
    assert.equal(mapUnit('median_household_income_usd / population'), 'median_household_income_usd / population : 1\u202f000/person')
    assert.equal(mapUnit('traffic_fatalities / (population * area)'), 'traffic_fatalities / (population * area) : 1\u202f000/km^{2}·person')
    assert.equal(mapUnit('population / traffic_fatalities ** 2'), 'population / traffic_fatalities ** 2 : 1\u202f000/fatality^{2}')
    // and a root of one under the solidus is written the way a square of one is
    assert.equal(mapUnit('area / population ** 0.5'), 'area / population ** 0.5 : 1\u202f000km^{2}/person^{0.5}')
    // a root of anything else is written the same way, in roots of the unit it is measured in
    assert.equal(mapUnit('area ** 0.25'), 'area ** 0.25 : 1\u202f000km^{0.5}')
    assert.equal(written(unitOfMap('area ** 0.25'), 1000, { useImperial: true }), '788mi^{0.5}')
    // where a whole power of a unit will do, it is taken: a root of an area is a length, and a
    // length is written in miles rather than in roots of an acre
    assert.equal(written(unitOfMap('area ** 0.5'), 1000, { useImperial: true }), '621mi')
    assert.equal(mapUnit('area / traffic_fatalities ** 0.5'), 'area / traffic_fatalities ** 0.5 : 1\u202f000km^{2}/fatality^{0.5}')
    assert.equal(mapUnit('population ** -0.5'), 'population ** (-0.5) : 1\u202f000/person^{0.5}')
    assert.equal(mapUnit('population ** 1.5'), 'population ** 1.5 : 1\u202f000people^{1.5}')
})

void test('a word is spaced off the number it follows, and a symbol is not', () => {
    const inline = (data: string): string => {
        const unit = unitOfMap(data)
        assert.ok(unit)
        const quantity = writeQuantity(1000, unit, {}, 'afterNumber')
        return `${quantity.renderedValue}${reifyString(quantity.unitName, {})}`
    }
    assert.equal(inline('traffic_fatalities ** 0.5'), '1\u202f000\u00a0fatalities^{0.5}')
    assert.equal(inline('area / traffic_fatalities'), '1\u202f000km^{2}/fatality')
    assert.equal(inline('area'), '1\u202f000km^{2}')
})

void test('a reader in Celsius reads a difference of two temperatures as one', () => {
    const toAReader = (data: string, temperatureUnit: string): string => written(unitOfMap(data), 22.3, { temperatureUnit })
    // twenty-two Fahrenheit degrees between the day's high and its low is twelve Celsius degrees,
    // where a reading of twenty-two Fahrenheit is a reading of five and a half below freezing
    assert.equal(toAReader('high_temp - low_temp', 'celsius'), '+12.4°C')
    assert.equal(toAReader('high_temp', 'celsius'), '-5.4°C')
    // and the mean of two readings is a reading again, which the coefficient is what keeps track of
    assert.equal(toAReader('(high_temp + low_temp) / 2', 'celsius'), '-5.4°C')
    assert.equal(toAReader('high_temp - low_temp', 'fahrenheit'), '+22.3°F')
    assert.equal(toAReader('high_temp', 'fahrenheit'), '22.3°F')
})

void test('a difference of two is written as one', () => {
    assert.equal(mapUnit('population - population_2000'), 'population - population_2000 : +1\u202f000')
})

void test('a script is read as a whole, so a map of what it named is in those units', () => {
    const uss = mapUSSFromString('x = population / area\ncondition (true)\ncMap(data=x, scale=linearScale(), ramp=rampUridis)')
    assert.equal(written(deriveMapUnit(uss, defaultTypeEnvironment('USA'))), '1\u202f000/km^{2}')
})

void test('a column is written in the units of its values', () => {
    assert.equal(columnUnit('column(values=population / area)'), 'population / area : 1\u202f000/km^{2}')
    assert.equal(columnUnit('column(values=population), column(values=area)', 1), 'area : 1\u202f000km^{2}')
    assert.equal(columnUnit('column(values=population)', 1), 'nothing : nothing')
})
