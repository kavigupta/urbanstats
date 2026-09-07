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
        assert.equal(reifyString(label, {}), expectedLabel)
    })
}

// A number a script names is written in the units the script reads it from
for (const [condition, expected] of [
    ['commute_bike < 0.1', 'Commute Bike % < 10%'],
    ['high_temp > 80', 'Mean high temp > 80°F'],
    ['area > 100', 'Area > 100km^{2}'],
    ['density_pw_1km > 5000', 'PW Density (r=1km) > 5\u202f000/km^{2}'],
    ['sqrt(area) > 10', 'sqrt(Area) > 10km'],
    ['maximum(population, 1000) > 0', 'max(Population, 1\u202f000) > 0'],
    // a pollution over an area is neither of those, and the number it is measured against is of it
    ['pm25_pollution * area > 10', 'PW Mean PM2.5 Pollution × Area > 10g/m'],
    ['pm25_pollution > 10', 'PW Mean PM2.5 Pollution > 10μg/m^{3}'],
    // what scales a quantity is no quantity, and neither is what one is divided into
    ['population * 2 > population', 'Population × 2 > Population'],
    ['rainfall * 2 > 100', 'Rainfall × 2 > 10\u202f000cm/yr'],
    // which of the two the 32 is cannot be said, where the 0 is in the unit it is compared against
    ['high_temp - 32 > 0', 'Mean high temp \u2212 32 > 0°F'],
    // either side of a comparison carries it to the other, and each side of an and is read alone
    ['80 < high_temp', '80°F < Mean high temp'],
    ['population > 1000 & high_temp > 80', 'Population > 1\u202f000 and Mean high temp > 80°F'],
    // a sign is written beside a number rather than in it, where minus a reading is no reading
    ['high_temp > -10', 'Mean high temp > -10°F'],
    ['-high_temp > -80', '-Mean high temp > -80'],
    // a root of a count is in no unit any pool holds, and writing one threw
    ['population ** 0.5 > 100', 'Population^{0.5} > 100\u00a0people^{0.5}'],
    // however many people there are they are still people, where the size of a reading is nothing
    ['sum(population) > 1000000', 'sum(Population) > 1m'],
    ['abs(high_temp) > 5', 'abs(Mean high temp) > 5'],
    ['ln(1000) > 0', 'ln(1\u202f000) > 0'],
    // a logarithm of a quantity is a number, so the caption says what the quantity was read in
    ['ln(density_pw_1km) > 0', 'ln(PW Density (r=1km) [in /km^{2}]) > 0'],
    ['ln(population) > 10', 'ln(Population) > 10'],
    ['ln(density_pw_1km / density_pw_2km) > 0', 'ln(PW Density (r=1km) ÷ PW Density (r=2km)) > 0'],
    // what the script computes with, which is not what a reader is shown: rainfall reads in cm/yr
    ['ln(rainfall) > 0', 'ln(Rainfall [in m/yr]) > 0'],
    // and a share is stored as the fraction it is, whatever percentage it is written as
    ['ln(commute_bike) > 0', 'ln(Commute Bike % [as a fraction]) > 0'],
    ['ln(pres_2020_margin) > 0', 'ln(2020 Presidential Election [as a fraction]) > 0'],
    // as is a count of one thing per another: these are stored per person, not per 100k
    ['ln(ped_cyclist_fatalities_per_capita) > 0', 'ln(Pedestrian/Cyclist Fatalities Per Capita Per Year [in /person]) > 0'],
    // a root of a count is in no unit at all, so there is nothing to say it is in
    ['ln(population ** 0.5) > 0', 'ln(Population^{0.5} [in people^{0.5}]) > 0'],
    // a number written the long way is written as the number, in the unit it is read in
    ['density_pw_1km > toNumber("1000")', 'PW Density (r=1km) > 1\u202f000/km^{2}'],
    ['high_temp > toNumber("80")', 'Mean high temp > 80°F'],
    // a value the script says nothing about is read as whatever it is compared against
    ['density_pw_1km > toNumber(geoName)', 'PW Density (r=1km) > Default Universe Geography Names [as /km^{2}]'],
    ['population > toNumber(geoName)', 'Population > Default Universe Geography Names'],
    // each name is read against the density separately, and the sign brackets the sum of them
    ['density_pw_1km > -toNumber(geoName + geoName)', 'PW Density (r=1km) > -(Default Universe Geography Names [as /km^{2}] + Default Universe Geography Names [as /km^{2}])'],
    // a lead is written as whose it is, and a change from one year to another as a change
    ['pres_2020_margin > 0.1', '2020 Presidential Election > D+10%'],
    ['population_change_2000_2020 > 0.05', 'Population Change (2000-2020) > +5%'],
    ['population > 0', 'Population > 0'],
    ['sunny_hours > 2000', 'Mean sunny hours > 2000:00h'],
] as const) {
    testMapLabel(test, `condition (${condition})\ncMap(data=population, scale=linearScale(), ramp=rampUridis)`, `Population where ${expected}`)
}

// a sign binds tighter than adding and looser than multiplying, so only a sum needs the brackets
testMapLabel(test, 'cMap(data=-(population + population), scale=linearScale(), ramp=rampUridis)', '-(Population + Population)')
testMapLabel(test, 'cMap(data=-(high_temp - low_temp), scale=linearScale(), ramp=rampUridis)', '-(Mean high temp \u2212 Mean low temp)')
testMapLabel(test, 'cMap(data=-(population * 2), scale=linearScale(), ramp=rampUridis)', '-Population \u00d7 2')
testMapLabel(test, 'cMap(data=-(area ** 2), scale=linearScale(), ramp=rampUridis)', '-Area^{2}')
testMapLabel(test, 'cMap(data=-population, scale=linearScale(), ramp=rampUridis)', '-Population')

// How a caption reads a script whose units are not the ones needed. Nothing about what the script
// computes changes, so the caption says what the conversion was.
for (const [data, expected] of [
    ['population + area', 'Population + Area × 1/km^{2}'],
    ['area + population', 'Area + Population × 1km^{2}/person'],
    ['population - area', 'Population − Area × 1/km^{2}'],
    ['population < area', 'Population < Area × 1/km^{2}'],
    ['area >= population', 'Area ≥ Population × 1km^{2}/person'],
    // a share is dimensionless and a count is people, so a factor separates them
    ['commute_bike + population', 'Commute Bike % + Population × 1/person'],
    // a literal already written takes the unit itself, rather than a conversion being recorded
    ['population + area * 2', 'Population + Area × 2/km^{2}'],
    ['population + area / 2', 'Population + Area ÷ 2km^{2}/person'],
    ['population + sqrt(area)', 'Population + sqrt(Area) × 1/km'],
    // as many conversions as the script needs, however deeply nested
    ['population + area + area', 'Population + Area × 1/km^{2} + Area × 1/km^{2}'],
    ['population * 2 + area', 'Population × 2 + Area × 1/km^{2}'],
    ['(population + area) * 2', '(Population + Area × 1/km^{2}) × 2'],
    // an argument that has to share a unit with another is read the same way
    ['maximum(area, population)', 'max(Area, Population × 1km^{2}/person)'],
    ['minimum(population, area)', 'min(Population, Area × 1/km^{2})'],
    ['inverseQuantile(population, area)', 'quantile^{-1}(Population, Area × 1/km^{2})'],
    // a temperature does not scale, so the caption writes the degrees above its zero
    ['high_temp * area', '(Mean high temp − 0°F) × Area'],
    ['high_temp / area', '(Mean high temp − 0°F) ÷ Area'],
    ['high_temp ** 2', '(Mean high temp − 0°F)^{2}'],
    ['high_temp ** 2 * area', '(Mean high temp − 0°F)^{2} × Area'],
    ['sqrt(high_temp)', 'sqrt(Mean high temp − 0°F)'],
    ['high_temp / high_temp', '(Mean high temp − 0°F) ÷ (Mean high temp − 0°F)'],
    // a count is counted from nothing already, so nothing is subtracted from it. A factor between
    // two scales is a difference of them: so many degrees per person, not a temperature per person
    ['high_temp + population', 'Mean high temp + Population × +1°F/person'],
    ['population + high_temp', 'Population + (Mean high temp − 0°F) × +1/°F'],
    ['high_temp - low_temp + population', '(Mean high temp − Mean low temp) + Population × +1°F/person'],
    // brackets go round a conversion only where something is written after it
    ['ln(area + area)', 'ln((Area + Area) [in km^{2}])'],
    ['ln(population + area)', 'ln(Population + Area × 1/km^{2})'],
    // and nothing is written where the two sides already have the same unit
    ['population + population', 'Population + Population'],
    ['area / area', 'Area ÷ Area'],
] as const) {
    testMapLabel(test, `cMap(data=${data}, scale=linearScale(), ramp=rampUridis)`, expected)
}

// How a conversion is written to a reader of other units. A factor is a quantity, so it is written
// in the units they read. An "[in ...]" annotation is not: it names the unit the script computed
// in, whatever the reader prefers.
const imperial = { useImperial: true }
const celsius = { temperatureUnit: 'celsius' }

for (const [data, reader, settings, expected] of [
    ['population + area', 'imperial', imperial, 'Population + Area × 2.59/mi^{2}'],
    ['area + population', 'imperial', imperial, 'Area + Population × 247acres/person'],
    ['population + sqrt(area)', 'imperial', imperial, 'Population + sqrt(Area) × 1.61/mi'],
    // a factor between two scales is a difference of them, so it converts as one: a degree
    // Fahrenheit per person is five ninths of a degree Celsius per person, not -17.2 of them
    ['high_temp + population', 'celsius', celsius, 'Mean high temp + Population × +0.556°C/person'],
    ['population + high_temp', 'celsius', celsius, 'Population + (Mean high temp − -17.8°C) × +1.8/°C'],
    // the zero subtracted from a reading is itself a reading, so it is shown on the reader's scale
    ['high_temp * area', 'celsius', celsius, '(Mean high temp − -17.8°C) × Area'],
    ['high_temp * area', 'imperial', imperial, '(Mean high temp − 0°F) × Area'],
    // and what a number was counted in does not change with the reader
    ['ln(area)', 'imperial', imperial, 'ln(Area [in km^{2}])'],
    ['ln(high_temp)', 'celsius', celsius, 'ln(Mean high temp [in °F])'],
] as const) {
    void test(`${data} to a ${reader} reader`, () => {
        const label = deriveMapLabel(mapUSSFromString(`cMap(data=${data}, scale=linearScale(), ramp=rampUridis)`), getTypeEnvironment())
        assert.ok(label)
        assert.equal(reifyString(label, settings), expected)
    })
}

// How a script that states its unit is read. The script is converted into that unit and the name
// says how, except where the script already gives that unit and there is nothing to say.
for (const [values, stated, expected] of [
    ['population', 'unitArea', 'Population × 1km^{2}/person'],
    ['ln(population)', 'unitArea', 'ln(Population) × 1km^{2}'],
    ['population / area', 'unitDensity', 'Population ÷ Area'],
    // converting a temperature subtracts its zero first; converting into one adds a zero at the end
    ['high_temp', 'unitArea', '(Mean high temp − 0°F) × +1km^{2}/°F'],
    ['population', 'unitTemperature', 'Population × +1°F/person + 0°F'],
    // a literal in the script takes the unit itself, rather than a factor being written after it
    ['area / 2', 'unitTemperature', '(Area ÷ 2km^{2}/°F) + 0°F'],
    ['area * 2', 'unitTemperature', '(Area × +2°F/km^{2}) + 0°F'],
    // and nothing is said where the script already gives that unit
    ['area', 'unitArea', 'Area'],
] as const) {
    testMapLabel(test, `cMap(data=${values}, scale=linearScale(), ramp=rampUridis, unit=${stated})`, expected)

    // a column states its unit the same way a map does
    void test(`a column of ${values} stated in ${stated}`, () => {
        const uss = mapUSSFromString(`table(columns=[column(values=${values}, unit=${stated})])`)
        const label = deriveTableColumnLabel(uss, getTypeEnvironment(), 0)
        assert.ok(label)
        assert.equal(reifyString(label, {}), expected)
    })
}

void test('a label reads in the units of whoever is reading it', () => {
    const label = deriveMapLabel(mapUSSFromString('condition (high_temp > 80 & area > 100)\ncMap(data=population, scale=linearScale(), ramp=rampUridis)'), getTypeEnvironment())
    assert.ok(label)
    assert.equal(reifyString(label, {}), 'Population where Mean high temp > 80°F and Area > 100km^{2}')
    assert.equal(reifyString(label, { temperatureUnit: 'celsius' }), 'Population where Mean high temp > 26.7°C and Area > 100km^{2}')
    assert.equal(reifyString(label, { useImperial: true }), 'Population where Mean high temp > 80°F and Area > 38.6mi^{2}')
})

testMapLabel(test,
    `condition (population > 1000000)
condition (population_2000 > 1000000)
cMap(
    data=asin((density_pw_1km / population ** 3) ** 2),
    scale=linearScale(),
    ramp=rampUridis
)`,
    // per person to the fourth per km to the fourth: the people are written, there not being one
    // of them to leave to the statistic's own name
    'sin^{-1}((PW Density (r=1km) ÷ Population^{3})^{2} [in /km^{4}·person^{4}]) where Population (2000) > 1m and Population > 1m',
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
    'PW Density (r=1km) where Pedestrian/Cyclist Fatalities Per Capita Per Year > 1/100k',
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
            assert.equal(reifyString(label, {}), expectedLabel)
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

// A map's data filters what it reports, so its label carries a where that is not the map's
testMapLabel(test,
    `condition (density_pw_1km > 0)
cMap(data=do { condition (low_temp < 50)
population }, scale=linearScale(), ramp=rampUridis)`,
    '(Population where Mean low temp < 50°F) where PW Density (r=1km) > 0/km^{2}',
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
            assert.equal(reifyString(label, {}), expectedLabel)
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
testTableLabel(test,
    `condition(population > 1m)
condition(area > 5)
table(columns=[column(values=population)])`,
    ['Population'],
    'Population where Area > 5km^{2} and Population > 1m',
)
// The columns are joined with commas, so a filter after them would read as one more of them
testTableLabel(test,
    `condition(population > 1m)
table(columns=[column(values=population), column(values=area)])`,
    ['Population', 'Area'],
    '(Population, Area) where Population > 1m',
)

// A column that filters what it reports carries a where of its own, which is not the table's
const coldWhereCold: HumanReadableName = [
    { type: 'atom', value: 'Population' },
    { type: 'where', value: [{ type: 'atom', value: 'Mean low temp < 50°F' }] },
]
const columnWithOwnCondition = 'column(values=do { condition (low_temp < 50)\npopulation })'
testTableLabel(test,
    `condition (density_pw_1km > 0)
table(columns=[${columnWithOwnCondition}])`,
    [coldWhereCold],
    '(Population where Mean low temp < 50°F) where PW Density (r=1km) > 0/km^{2}',
)
testTableLabel(test,
    `table(columns=[${columnWithOwnCondition}])`,
    [coldWhereCold],
    'Population where Mean low temp < 50°F',
)
