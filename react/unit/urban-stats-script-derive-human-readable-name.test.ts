import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { mapUSSFromString } from '../src/mapper/settings/map-uss'
import { deriveMapLabel, deriveTableColumnLabel, deriveTableLabel } from '../src/urban-stats-script/derive-human-readable-name'
import { TypeEnvironment } from '../src/urban-stats-script/types-values'
import { HumanReadableName } from '../src/utils/human-readable-element'
import { reifyString } from '../src/utils/human-readable-name'

function getTypeEnvironment(): TypeEnvironment {
    return defaultTypeEnvironment('USA')
}

let mapLabelIdx = 0

function testMapLabel(testFn: typeof test, code: string, expectedLabel: string): void {
    void testFn(`map label ${++mapLabelIdx}`, () => {
        const label = deriveMapLabel(mapUSSFromString(code), getTypeEnvironment())
        assert.ok(label)
        assert.equal(reifyString(label), expectedLabel)
    })
}

// A number a script names is written in the units the script reads it from
for (const [condition, expected] of [
    ['commute_bike < 0.1', 'Commute Bike % < 10%'],
    ['high_temp > 80', 'Mean high temp > 80°F'],
    ['area > 100', 'Area > 100km^{2}'],
    ['density_pw_1km > 5000', 'PW Density (r=1km) > 5\u202f000/\u00a0km^{2}'],
    ['sqrt(area) > 10', 'sqrt(Area) > 10km'],
    ['maximum(population, 1000) > 0', 'max(Population, 1\u202f000) > 0'],
    // a pollution over an area is neither of those, and the number it is measured against is of it
    ['pm25_pollution * area > 10', 'PW Mean PM2.5 Pollution × Area > 10g/m'],
    ['pm25_pollution > 10', 'PW Mean PM2.5 Pollution > 10μg/m^{3}'],
    // what scales a quantity is no quantity, and neither is what one is divided into
    ['population * 2 > population', 'Population × 2 > Population'],
    ['rainfall * 2 > 100', 'Rainfall × 2 > 10\u202f000cm/yr'],
    // which of the two the 32 is cannot be said, where the 0 is of the kind it is compared against
    ['high_temp - 32 > 0', 'Mean high temp \u2212 32 > 0°F'],
] as const) {
    testMapLabel(test, `condition (${condition})\ncMap(data=population, scale=linearScale(), ramp=rampUridis)`, `Population where ${expected}`)
}

testMapLabel(test,
    `condition (population > 1000000)
condition (population_2000 > 1000000)
cMap(
    data=asin((density_pw_1km / population ** 3) ** 2),
    scale=linearScale(),
    ramp=rampUridis
)`,
    'sin^{-1}((PW Density (r=1km) ÷ Population^{3})^{2}) where Population (2000) > 1m and Population > 1m',
)

testMapLabel(test,
    `condition(population > 1m)
cMap(data=density_pw_1km_2000 / (density_pw_1km * density_pw_2km), scale=linearScale(), ramp=rampUridis)`,
    'PW Density (r=1km) (2000) ÷ (PW Density (r=1km) × PW Density (r=2km)) where Population > 1m',
)

testMapLabel(test,
    `condition(ped_cyclist_fatalities_per_capita > 1e-5)
cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)`,
    // in the units the statistic is read in, rather than as the fraction it is stored as
    'PW Density (r=1km) where Pedestrian/Cyclist Fatalities Per Capita Per Year > 1/\u00a0100k',
)

// Number formatting, in particular the boundaries where rounding to 3 significant
// digits would otherwise push toPrecision into scientific notation (e.g. 999999 → "1.00e+3k").
testMapLabel(test,
    'cMap(data=population * 12345, scale=linearScale(), ramp=rampUridis)',
    'Population × 12.3k',
)
testMapLabel(test,
    'cMap(data=population * 999499, scale=linearScale(), ramp=rampUridis)',
    'Population × 999k',
)
// Exact boundary (999.5e3): must be promoted to the m tier via >=, not >, or
// (999500 / 1e6).toPrecision(3) === "1.00e+3" leaks through as "1.00e+3k".
testMapLabel(test,
    'cMap(data=population * 999500, scale=linearScale(), ramp=rampUridis)',
    'Population × 1m',
)
testMapLabel(test,
    'cMap(data=population * 999999, scale=linearScale(), ramp=rampUridis)',
    'Population × 1m',
)
testMapLabel(test,
    'cMap(data=population * 999499999, scale=linearScale(), ramp=rampUridis)',
    'Population × 999m',
)
// Exact boundary (999.5e6): same off-by-one risk, promoted to the B tier.
testMapLabel(test,
    'cMap(data=population * 999500000, scale=linearScale(), ramp=rampUridis)',
    'Population × 1B',
)
testMapLabel(test,
    'cMap(data=population * 999999999, scale=linearScale(), ramp=rampUridis)',
    'Population × 1B',
)

testMapLabel(test,
    'cMap(data=population ** 0.5, scale=linearScale(), ramp=rampUridis)',
    'Population^{0.5}',
)
testMapLabel(test,
    'cMap(data=population * 3.14, scale=linearScale(), ramp=rampUridis)',
    'Population × 3.14',
)

testMapLabel(test,
    'cMap(data=population + 1234, scale=linearScale(), ramp=rampUridis)',
    'Population + 1 234',
)

void test('map label cannot be derived for a raw vector literal', () => {
    const label = deriveMapLabel(mapUSSFromString('cMap(data=[1, 2, 3], scale=linearScale(), ramp=rampUridis)'), getTypeEnvironment())
    assert.equal(label, undefined)
})

let tableColumnLabelIdx = 0

function testTableColumnLabel(testFn: typeof test, code: string, columnIndex: number, expectedLabel: string | undefined): void {
    void testFn(`table column label ${++tableColumnLabelIdx}`, () => {
        const label = deriveTableColumnLabel(mapUSSFromString(code), getTypeEnvironment(), columnIndex)
        if (expectedLabel === undefined) {
            assert.equal(label, undefined)
        }
        else {
            assert.ok(label)
            assert.equal(reifyString(label), expectedLabel)
        }
    })
}

testTableColumnLabel(test,
    'table(columns=[column(values=population), column(values=density_pw_1km / density_pw_2km)])',
    0,
    'Population',
)
testTableColumnLabel(test,
    'table(columns=[column(values=population), column(values=density_pw_1km / density_pw_2km)])',
    1,
    'PW Density (r=1km) ÷ PW Density (r=2km)',
)
testTableColumnLabel(test,
    'table(columns=[column(values=population)])',
    1,
    undefined,
)
testTableColumnLabel(test,
    'table(columns=[column(values=[1, 2, 3])])',
    0,
    undefined,
)
testTableColumnLabel(test,
    'customNode("x = 1")',
    0,
    undefined,
)

let tableLabelIdx = 0

function testTableLabel(testFn: typeof test, code: string, columnNames: HumanReadableName[], expectedLabel: string | undefined): void {
    void testFn(`table label ${++tableLabelIdx}`, () => {
        const label = deriveTableLabel(mapUSSFromString(code), getTypeEnvironment(), columnNames)
        if (expectedLabel === undefined) {
            assert.equal(label, undefined)
        }
        else {
            assert.ok(label)
            assert.equal(reifyString(label), expectedLabel)
        }
    })
}

testTableLabel(test,
    'table(columns=[column(values=population)])',
    ['Population'],
    'Population',
)
testTableLabel(test,
    'table(columns=[column(values=population), column(values=density_pw_1km / density_pw_2km)])',
    ['Population', 'PW Density (r=1km) ÷ PW Density (r=2km)'],
    'Population, PW Density (r=1km) ÷ PW Density (r=2km)',
)
testTableLabel(test,
    `condition(population > 1m)
table(columns=[column(values=population)])`,
    ['Population'],
    'Population where Population > 1m',
)
