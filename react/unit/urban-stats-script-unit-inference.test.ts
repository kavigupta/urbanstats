import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { mapUSSFromString } from '../src/mapper/settings/map-uss'
import { parse } from '../src/urban-stats-script/parser'
import { deriveMapUnit, deriveTableColumnUnit, inferUnit, InferredUnit } from '../src/urban-stats-script/unit-inference'
import { reifyString } from '../src/utils/human-readable-name'
import { combineUnits, displayQuantity, displayUnitFor, powerUnit, Unit, unitSuffix, unitTypeToUnit } from '../src/utils/unit'

function getTypeEnvironment(): ReturnType<typeof defaultTypeEnvironment> {
    return defaultTypeEnvironment('USA')
}

function renderQuantity(value: number, quantityUnit: Unit): string {
    const { value: rendered, unit: name } = displayQuantity(value, quantityUnit, false)
    const { attached } = displayUnitFor(value, quantityUnit, false)
    return `${rendered}${reifyString(unitSuffix(name, attached))}`
}

function unitOf(code: string): InferredUnit {
    const stmts = parse(code)
    assert.notEqual(stmts.type, 'error', `could not parse ${code}`)
    return inferUnit(stmts as Exclude<typeof stmts, { type: 'error' }>, getTypeEnvironment())
}

function testUnit(code: string, expected: InferredUnit): void {
    void test(`unit of ${code}`, () => {
        assert.deepEqual(unitOf(code), expected)
    })
}

function unit(dimensions: Record<string, number>, multiplier: number, presentation?: Unit['presentation']): Unit {
    return presentation === undefined ? { dimensions, multiplier } : { dimensions, multiplier, presentation }
}

const percentage = unit({}, 1, 'percentage')
const dimensionless = unit({}, 1)
const density = unit({ person: 1, length: -2 }, 1e-6)

// Leaves: statistic columns carry a unit, everything else is unknown
testUnit('population', unit({ person: 1 }, 1))
testUnit('density_pw_1km', density)
testUnit('commute_bike', percentage)
testUnit('elevation', unit({ length: 1 }, 1))
testUnit('commute_time_median', unit({ time: 1 }, 60))
testUnit('2', undefined)
testUnit('notAVariable', undefined)

// Dimension arithmetic, including the multipliers: people per square kilometer either way
testUnit('population / area', density)
testUnit('density_pw_1km * area', unit({ person: 1 }, 1))
testUnit('density_pw_1km / density_pw_2km', dimensionless)
testUnit('population + population_2000', unit({ person: 1 }, 1))
testUnit('population - area', undefined)
testUnit('area ** 0.5', unit({ length: 1 }, 1e3))
testUnit('area ** population', undefined)
testUnit('-population', unit({ person: 1 }, 1))

// Quantities of the same dimensions but different multipliers cannot be added
testUnit('hospital_mean_dist + elevation', undefined)
testUnit('hospital_mean_dist * elevation', unit({ length: 2 }, 1e3))

// A presentation only survives an operation that keeps the quantity the same kind of thing
testUnit('commute_bike + commute_car', percentage)
testUnit('commute_bike / commute_car', dimensionless)
testUnit('commute_bike + pres_2020_margin', percentage)
testUnit('commute_bike * population', unit({ person: 1 }, 1))
testUnit('population / commute_bike', unit({ person: 1 }, 1))

// Unknown op anything is that thing
testUnit('population * 2', unit({ person: 1 }, 1))
testUnit('2 - population', unit({ person: 1 }, 1))
testUnit('sqrt(population) * area', unit({ length: 2 }, 1e6))

// Comparisons and logical operations produce booleans, which have no unit
testUnit('population > 100', undefined)
testUnit('commute_bike > 0.1 & population > 100', undefined)

// The unit of a script is the unit of the value it evaluates to
testUnit(`condition (commute_bike < 0.1)
population / area`, density)
// Variables assigned in the script are not in the type environment, so their unit is not known
testUnit(`x = population / area
x * 2`, undefined)

// Operators that produce booleans, and operands that are not quantities at all
testUnit('population == population_2000', undefined)
testUnit('!(population > 100)', undefined)
testUnit('geoName', undefined)
testUnit('[1, 2, 3]', undefined)
testUnit('{ a: population }', undefined)
testUnit('"a string"', undefined)

// Chains of operators, where an unknown operand does not lose the units of the rest
testUnit('population / area * 2', density)
testUnit('(population + 1000) / area', density)
testUnit('population / (area * 2)', density)
testUnit('density_pw_1km * area / population', dimensionless)
testUnit('area ** 2 ** 0.5', unit({ length: 2 }, 1e6))

void test('unit arithmetic keeps the multipliers in step', () => {
    const area = unitTypeToUnit('area')
    const population = unitTypeToUnit('population')
    assert.deepEqual(combineUnits(population, area, -1), unitTypeToUnit('density'))
    assert.deepEqual(combineUnits(unitTypeToUnit('density'), area, 1), population)
    assert.deepEqual(powerUnit(area, 0.5), unitTypeToUnit('distanceInKm'))
    assert.deepEqual(powerUnit(unitTypeToUnit('distanceInKm'), 2), area)
    assert.deepEqual(combineUnits(area, area, -1), unit({}, 1))
})

void test('a unit that is not stored in base units is displayed correctly either way', () => {
    // an area is stored in square kilometers, so a computed one must be too
    const computed = combineUnits(unitTypeToUnit('distanceInKm'), unitTypeToUnit('distanceInKm'), 1)
    assert.deepEqual(displayQuantity(12.5, computed, false), displayQuantity(12.5, unitTypeToUnit('area'), false))
})

let mapUnitIdx = 0

function testMapUnit(code: string, expected: string | undefined): void {
    void test(`map unit ${++mapUnitIdx}`, () => {
        const mapUnit = deriveMapUnit(mapUSSFromString(code), getTypeEnvironment())
        if (expected === undefined) {
            assert.equal(mapUnit, undefined)
            return
        }
        assert.ok(mapUnit)
        assert.equal(renderQuantity(1234, mapUnit), expected)
    })
}

testMapUnit('cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', '1\u202f234/\u00a0km^{2}')
testMapUnit('cMap(data=population / area, scale=linearScale(), ramp=rampUridis)', '1\u202f234/\u00a0km^{2}')
testMapUnit('cMap(data=density_pw_1km / density_pw_2km, scale=linearScale(), ramp=rampUridis)', '1230')
testMapUnit('cMap(data=pres_2020_margin, scale=linearScale(), ramp=rampUridis)', '123400.00%')
testMapUnit('cMap(data=commute_time_median, scale=linearScale(), ramp=rampUridis)', '20:34')
testMapUnit('cMap(data=elevation, scale=linearScale(), ramp=rampUridis)', '1\u202f234 m')
// A quantity with no display units of its own is displayed in base units
testMapUnit('cMap(data=population * area, scale=linearScale(), ramp=rampUridis)', '1\u202f230\u202f000\u202f000 m^{2}·person')
testMapUnit('cMap(data=[1, 2, 3], scale=linearScale(), ramp=rampUridis)', undefined)
testMapUnit('cMapRGB(dataR=population, dataG=population, dataB=population)', undefined)
testMapUnit('pMap(data=population / area, scale=linearScale(), ramp=rampUridis)', '1\u202f234/\u00a0km^{2}')
testMapUnit(`condition (population > 1000)
cMap(data=commute_bike, scale=linearScale(), ramp=rampUridis)`, '123400.00%')

let columnUnitIdx = 0

function testColumnUnit(code: string, columnIndex: number, expected: string | undefined): void {
    void test(`table column unit ${++columnUnitIdx}`, () => {
        const columnUnit = deriveTableColumnUnit(mapUSSFromString(code), getTypeEnvironment(), columnIndex)
        if (expected === undefined) {
            assert.equal(columnUnit, undefined)
            return
        }
        assert.ok(columnUnit)
        assert.equal(renderQuantity(1234, columnUnit), expected)
    })
}

testColumnUnit('table(columns=[column(values=population), column(values=population / area)])', 0, '1\u202f234')
testColumnUnit('table(columns=[column(values=population), column(values=population / area)])', 1, '1\u202f234/\u00a0km^{2}')
testColumnUnit('table(columns=[column(values=population)])', 1, undefined)
testColumnUnit('table(columns=[column(values=[1, 2, 3])])', 0, undefined)
