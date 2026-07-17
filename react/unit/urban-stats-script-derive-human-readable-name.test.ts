import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { mapUSSFromString } from '../src/mapper/settings/map-uss'
import { deriveMapLabel, deriveTableColumnLabel, deriveTableLabel } from '../src/urban-stats-script/derive-human-readable-name'
import { TypeEnvironment } from '../src/urban-stats-script/types-values'
import { HumanReadableName, reifyString } from '../src/utils/human-readable-name'

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
    'PW Density (r=1km) where Pedestrian/Cyclist Fatalities Per Capita Per Year > 1x10^{-5}',
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
