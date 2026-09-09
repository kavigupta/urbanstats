import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { mapDataExpression, mapUSSFromString } from '../src/mapper/settings/map-uss'
import { parseNoError } from '../src/urban-stats-script/parser'
import { unitCheck } from '../src/urban-stats-script/unit-inference'
import { StoredUnit } from '../src/utils/quantity'

/** What is known, as a string: the dimensions, how many of itself it is, and its scale. */
function shape(known: StoredUnit): string {
    const written = [...known.unit.dimensions]
        .sort((a, b) => a.baseUnit.localeCompare(b.baseUnit))
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .join(' ')
    return `${written === '' ? 'dimensionless' : written} times=${known.unit.times} x${known.toBaseUnits}`
}

function of(code: string): StoredUnit {
    return unitCheck(parseNoError(code, 'test'), defaultTypeEnvironment('USA')).worksOutTo
}

/**
 * What a map's data works out to, where the map states the unit it is drawn in. That is how a
 * script says what is expected of an expression.
 */
function drawnAs(code: string, statedUnit: string): StoredUnit {
    const typeEnvironment = defaultTypeEnvironment('USA')
    const uss = mapUSSFromString(`cMap(data=${code}, scale=linearScale(), ramp=rampUridis, unit=${statedUnit})`)
    const data = mapDataExpression(unitCheck(uss, typeEnvironment), typeEnvironment)
    assert.ok(data !== undefined)
    return data.worksOutTo
}

/** What the script works out to. How it was converted to get there is a caption's business. */
function inferred(code: string): string {
    return shape(of(code))
}

/** What the script works out to where a map states the unit it is drawn in. */
function inferredAs(code: string, statedUnit: string): string {
    return shape(drawnAs(code, statedUnit))
}

void test('statistics have units', () => {
    assert.equal(inferred('population'), 'person^1 times=1 x1')
    assert.equal(inferred('area'), 'm^2 times=1 x1000000')
    assert.equal(inferred('high_temp'), 'F^1 times=1 x1')
})

void test('arithmetic combines units', () => {
    assert.equal(inferred('population / area'), 'm^-2 person^1 times=1 x0.000001')
    assert.equal(inferred('area ** 0.5'), 'm^1 times=1 x1000')
    assert.equal(inferred('population * 2'), 'person^1 times=1 x1')
    assert.equal(inferred('-population'), 'person^1 times=1 x1')
    assert.equal(inferred('(high_temp + low_temp) / 2'), 'F^1 times=1 x1')
})

void test('temperature arithmetic tracks the coefficient', () => {
    assert.equal(inferred('high_temp - low_temp + high_temp_djf'), 'F^1 times=1 x1')
    assert.equal(inferred('high_temp * 2 - high_temp'), 'F^1 times=1 x1')
    assert.equal(inferred('(high_temp + low_temp + high_temp_djf) / 3'), 'F^1 times=1 x1')
    // and where they cancel, a number of degrees, which is also a thing to write
    assert.equal(inferred('high_temp - low_temp + high_temp_djf - high_temp'), 'F^1 times=0 x1')
    // and minus one temperature is minus one of them: the count follows the arithmetic
    assert.equal(inferred('5 - high_temp'), 'F^1 times=-1 x1')
})

void test('powers raise units', () => {
    // in kilometres, of which it is root two, since the coefficient is raised along with the area
    assert.equal(inferred('(area * 2) ** 0.5'), 'm^1 times=1 x1000')
    assert.equal(inferred('(area ** 0.5) ** 2'), 'm^2 times=1 x1000000')
    assert.equal(inferred('(population / area) ** 0.5 * area ** 0.5'), 'person^0.5 times=1 x1')
    // a temperature is raised from its own zero, so that zero is subtracted first
    assert.equal(inferred('(high_temp * 2) ** 0.5'), 'dimensionless times=1 x1')
})

void test('a sum of unlike units', () => {
    // people and an area add when the area is read as so many people, so the sum counts two of them
    assert.equal(inferred('population + area'), 'person^1 times=1 x1')
    assert.equal(inferred('(population + area) / area'), 'm^-2 times=1 x0.000001')
})

void test('a name takes the unit it was assigned', () => {
    assert.equal(inferred('x = population / area\nx * 2'), 'm^-2 person^1 times=1 x0.000001')
    // and what a name was assigned last, since the statements are read in order
    assert.equal(inferred('x = population\nx = area\nx'), 'm^2 times=1 x1000000')
})

void test('a filter does not change units', () => {
    assert.equal(inferred('condition(population > 1000)\npopulation / area'), 'm^-2 person^1 times=1 x0.000001')
})

void test('an if joins both of its arms', () => {
    assert.equal(inferred('if (population > 0) { high_temp } else { low_temp }'), 'F^1 times=1 x1')
    assert.equal(inferred('if (population > 0) { population } else { area }'), 'person^1 times=1 x1')
    // an arm with no counterpart writes where its mask holds and nothing where it does not
    assert.equal(inferred('if (population > 0) { high_temp }'), 'F^1 times=1 x1')
})

void test('an arm of an if can bind a name', () => {
    assert.equal(inferred('if (population > 0) { x = area }\nx'), 'm^2 times=1 x1000000')
    assert.equal(inferred('if (population > 0) { x = area } else { x = population }\nx'), 'm^2 times=1 x1000000')
    // and neither arm names the unit by running first, a bare number naming none at all
    assert.equal(inferred('if (population > 0) { high_temp } else { 2 }'), 'F^1 times=1 x1')
    assert.equal(inferred('if (population > 0) { 2 } else { high_temp }'), 'F^1 times=1 x1')
    // where the arm that did not run left it as it was
    assert.equal(inferred('x = area\nif (population > 0) { x = area * 2 }\nx'), 'm^2 times=1 x1000000')
    assert.equal(inferred('x = area\nif (population > 0) { x = area / 2 }\nx'), 'm^2 times=1 x1000000')
})

void test('a vector takes the unit of its elements', () => {
    assert.equal(inferred('[high_temp, low_temp]'), 'F^1 times=1 x1')
    assert.equal(inferred('[population, area]'), 'person^1 times=1 x1')
    // a number the script writes states no unit, so it does not name the one they are all in,
    // whichever end of the vector it is written at
    assert.equal(inferred('[high_temp, 2]'), 'F^1 times=1 x1')
    assert.equal(inferred('[2, high_temp]'), 'F^1 times=1 x1')
    // where the elements disagree on how many temperatures they are, the numbers are read as written
    assert.equal(inferred('[high_temp, high_temp + high_temp]'), 'dimensionless times=1 x1')
    assert.equal(inferred('if (population > 0) { high_temp } else { high_temp - low_temp }'), 'dimensionless times=1 x1')
    // an area and a difference of two areas are both an area, an area having no zero of its own
    assert.equal(inferred('if (population > 0) { area } else { area - area }'), 'm^2 times=1 x1000000')
})

// What each built-in makes of a quantity it is given, which each one says for itself
for (const [code, expected] of [
    ['abs(high_temp - low_temp)', 'F^1 times=0 x1'],
    ['round(population)', 'person^1 times=1 x1'],
    ['nanTo0(density_pw_1km)', 'm^-2 person^1 times=1 x0.000001'],
    ['sqrt(area)', 'm^1 times=1 x1000'],
    ['min(high_temp)', 'F^1 times=1 x1'],
    ['mean(density_pw_1km, weight=population)', 'm^-2 person^1 times=1 x0.000001'],
    ['median(population)', 'person^1 times=1 x1'],
    ['quantile(population, 0.5)', 'person^1 times=1 x1'],
    ['percentile(area, 90)', 'm^2 times=1 x1000000'],
    ['maximum(population, population)', 'person^1 times=1 x1'],
    // the larger of a population and an area is a population: the area is read as so many people
    ['maximum(population, area)', 'person^1 times=1 x1'],
    ['inverseQuantile(population, population)', 'dimensionless times=1 x1'],
    ['sign(population)', 'dimensionless times=1 x1'],
    // a function that states no rule leaves what it gives back a plain number
    ['rgb(0.1, 0.2, 0.3)', 'dimensionless times=1 x1'],
    ['toNumber(population)', 'person^1 times=1 x1'],
    ['toNumber(population) + population', 'person^1 times=2 x1'],
] as const) {
    void test(code, () => {
        assert.equal(inferred(code), expected)
    })
}

void test('abs and nanTo0 take a reading as the number it is written as', () => {
    // ten degrees below freezing is one number in Fahrenheit and another in Celsius, so the size
    // of a temperature is of neither scale: it is the size of the Fahrenheit number
    assert.equal(inferred('abs(high_temp)'), 'dimensionless times=1 x1')
    // a difference of two is a number of degrees, and its size is that many again
    assert.equal(inferred('abs(high_temp - low_temp)'), 'F^1 times=0 x1')
    // the same goes for putting a zero in where a reading is missing
    assert.equal(inferred('nanTo0(high_temp)'), 'dimensionless times=1 x1')
    assert.equal(inferred('nanTo0(high_temp - low_temp)'), 'F^1 times=0 x1')
})

void test('a rank is a plain number', () => {
    assert.equal(inferred('inverseQuantile(population, population)'), 'dimensionless times=1 x1')
    assert.equal(inferred('inversePercentile(high_temp, low_temp)'), 'dimensionless times=1 x1')
    // and a population ranks among areas the same way
    assert.equal(inferred('inverseQuantile(population, area)'), 'dimensionless times=1 x1')
})

void test('max takes the unit of its arguments', () => {
    // as a sum of one and the other is, only alike things being comparable in the first place
    assert.equal(inferred('maximum(high_temp, 80)'), 'F^1 times=1 x1')
    assert.equal(inferred('minimum(area, 100)'), 'm^2 times=1 x1000000')
    assert.equal(inferred('maximum(0.05, commute_bike)'), 'dimensionless times=1 x1')
    // two bare numbers stay bare, neither of them naming a unit
    assert.equal(inferred('maximum(1, 2)'), 'dimensionless times=1 x1')
    // and the larger of a population and an area is a population, just as their sum is one
    assert.equal(inferred('maximum(population, area)'), 'person^1 times=1 x1')
    assert.equal(inferred('maximum(population + area, population)'), 'person^1 times=1 x1')
    // arguments that disagree on how many temperatures they are are read as the numbers written,
    // whichever of them comes first and wherever the call sits
    // and a bare number names no unit at either end of the call, as it names none in a vector
    assert.equal(inferred('maximum(2, area)'), 'm^2 times=1 x1000000')
    assert.equal(inferred('maximum(2, high_temp)'), 'F^1 times=1 x1')
    assert.equal(inferred('maximum(high_temp + low_temp, high_temp)'), 'dimensionless times=1 x1')
    assert.equal(inferred('maximum(high_temp, high_temp + low_temp)'), 'dimensionless times=1 x1')
    assert.equal(inferred('maximum(high_temp + low_temp, high_temp) > high_temp'), 'dimensionless times=1 x1')
    assert.equal(inferred('abs(maximum(high_temp + low_temp, high_temp))'), 'dimensionless times=1 x1')
})

void test('a total of people is people, and a total of temperatures is so many degrees', () => {
    assert.equal(inferred('sum(population)'), 'person^1 times=1 x1')
    // no temperature is the sum of several, but the degrees they are above zero add up
    assert.equal(inferred('sum(high_temp)'), 'dimensionless times=1 x1')
    // a mean of them is one of them again, and a total of differences is a difference
    assert.equal(inferred('sum(high_temp - low_temp)'), 'F^1 times=0 x1')
})

void test('a logarithm gives a plain number', () => {
    assert.equal(inferred('ln(density_pw_1km)'), 'dimensionless times=1 x1')
    assert.equal(inferred('log10(area)'), 'dimensionless times=1 x1')
    assert.equal(inferred('sin(population)'), 'dimensionless times=1 x1')
    // being of no kind, it scales what it multiplies rather than adding a dimension to it
    assert.equal(inferred('ln(population) * area'), 'm^2 times=1 x1000000')
})

void test('a script can shadow a built-in', () => {
    assert.equal(inferred('sqrt = population\nsqrt'), 'person^1 times=1 x1')
    // and calling the name it bound is not calling the built-in, so no rule of that one applies
    assert.equal(inferred('sqrt = area\nsqrt(population)'), 'dimensionless times=1 x1')
    assert.equal(inferred('ln = area\nln(population)'), 'dimensionless times=1 x1')
    // the built-in toNumber is read through, and a name the script bound is not
    assert.equal(inferred('toNumber(population)'), 'person^1 times=1 x1')
    assert.equal(inferred('toNumber = area\ntoNumber(population)'), 'dimensionless times=1 x1')
})

void test('a node the editor wraps is read through', () => {
    // the mapper's editor wraps parts of a script, which say nothing about units themselves
    assert.equal(inferred('autoUXNode(population, "{}")'), 'person^1 times=1 x1')
    assert.equal(inferred('autoUXNode(population + area, "{}")'), 'person^1 times=1 x1')
})

void test('an object literal is read field by field', () => {
    // a script can make one of its own, and a field of it has the unit that was put there
    assert.equal(inferred('x = { a: population, b: area }\nx.a'), 'person^1 times=1 x1')
    assert.equal(inferred('x = { a: population, b: area }\nx.b'), 'm^2 times=1 x1000000')
    assert.equal(inferred('x = { a: population }\nx.nonesuch'), 'dimensionless times=1 x1')
})

void test('a regression is read field by field', () => {
    const people = 'regr = regression(y=population, x1=area)\n'
    // the intercept is in the units of what was regressed, and the residuals are a difference of those
    assert.equal(inferred(`${people}regr.b`), 'person^1 times=1 x1')
    assert.equal(inferred(`${people}regr.residuals`), 'person^1 times=0 x1')
    // a coefficient is that difference over a difference of its parameter: people per square kilometre
    assert.equal(inferred(`${people}regr.m1`), 'm^-2 person^1 times=0 x0.000001')
    assert.equal(inferred(`${people}regr.r2`), 'dimensionless times=1 x1')
    // and of a temperature, degrees per square kilometre, a difference of them being what multiplies
    assert.equal(inferred('regr = regression(y=high_temp, x1=area)\nregr.m1'), 'dimensionless times=0 x1')
    // and a share over a logarithm is dimensionless: neither is counted in anything
    assert.equal(inferred('regr = regression(y=commute_bike, x1=ln(population))\nregr.m1'), 'dimensionless times=0 x1')
    assert.equal(inferred(`${people}regr.nonesuch`), 'dimensionless times=1 x1')
})

void test('a regression of what has no unit', () => {
    // a parameter in no unit leaves the coefficient in none either
    assert.equal(inferred('regr = regression(y=commute_bike, x1=rgb(0, 0, 0))\nregr.m1'), 'dimensionless times=0 x1')
    // and one of no dependent variable is a regression in name only
    assert.equal(inferred('regr = regression(x1=area)\nregr.b'), 'dimensionless times=1 x1')
})

void test('a factor goes on the right', () => {
    assert.equal(inferred('population + area'), 'person^1 times=1 x1')
    assert.equal(inferred('area + population'), 'm^2 times=1 x1000000')
    // a difference of two quantities is a difference; a comparison has no unit of its own
    assert.equal(inferred('population - area'), 'person^1 times=1 x1')
    assert.equal(inferred('population < area'), 'dimensionless times=1 x1')
    assert.equal(inferred('area >= population'), 'dimensionless times=1 x1')
})

void test('a literal already there takes the unit', () => {
    // the 2 of area * 2 is read as two people per square kilometre, so the sum has one unit
    assert.equal(inferred('population + area * 2'), 'person^1 times=1 x1')
    assert.equal(inferred('population + area / 2'), 'person^1 times=1 x1')
    // where there is no literal to read, the conversion is recorded on the expression
    assert.equal(inferred('population + sqrt(area)'), 'person^1 times=1 x1')
    // a share is dimensionless and a count is people, so a factor separates them
    assert.equal(inferred('commute_bike + population'), 'dimensionless times=1 x1')
})

void test('several factors in one expression', () => {
    assert.equal(inferred('population + area + area'), 'person^1 times=1 x1')
    assert.equal(inferred('population * 2 + area'), 'person^1 times=1 x1')
    assert.equal(inferred('(population + area) * 2'), 'person^1 times=1 x1')
    // a name has the unit it was bound to, and converts the same way
    assert.equal(inferred('x = area\npopulation + x'), 'person^1 times=1 x1')
})

void test('arguments of a call are made alike', () => {
    assert.equal(inferred('maximum(area, population)'), 'm^2 times=1 x1000000')
    assert.equal(inferred('minimum(population, area)'), 'person^1 times=1 x1')
    assert.equal(inferred('inverseQuantile(population, area)'), 'dimensionless times=1 x1')
})

void test('matching units need no factor', () => {
    assert.equal(inferred('population + population'), 'person^1 times=2 x1')
    assert.equal(inferred('area / area'), 'dimensionless times=1 x1')
    assert.equal(inferred('high_temp + low_temp'), 'F^1 times=2 x1')
})

void test('if arms and vector elements are made alike', () => {
    // the first of them sets the unit when nothing else does
    assert.equal(inferred('[population, area, sunny_hours]'),
        'person^1 times=1 x1')
    // an expected unit sets it instead, so the first is converted too
    assert.equal(inferredAs('[population, area]', 'unitDensity'),
        'm^-2 person^1 times=1 x0.000001')
    assert.equal(inferredAs('if (population > 0) { population } else { area }', 'unitDensity'),
        'm^-2 person^1 times=1 x0.000001')
})

void test('a product takes the zero off a reading', () => {
    // a temperature times an area is a temperature difference times an area
    assert.equal(inferred('high_temp * area'), 'm^2 times=1 x1000000')
    assert.equal(inferred('area * high_temp'), 'm^2 times=1 x1000000')
    assert.equal(inferred('high_temp / area'), 'm^-2 times=1 x0.000001')
    assert.equal(inferred('high_temp ** 2'), 'dimensionless times=1 x1')
    assert.equal(inferred('high_temp ** 2 * area'), 'm^2 times=1 x1000000')
    assert.equal(inferred('sqrt(high_temp)'), 'dimensionless times=1 x1')
    // a bare number scales the reading itself, which keeps its zero
    assert.equal(inferred('high_temp * 2'), 'F^1 times=2 x1')
    assert.equal(inferred('(high_temp + low_temp) / 2'), 'F^1 times=1 x1')
})

void test('a sum takes the zero off a reading', () => {
    // a temperature does not scale, but the degrees above its own zero do
    assert.equal(inferred('high_temp + population'), 'F^1 times=1 x1')
    assert.equal(inferred('population + high_temp'), 'person^1 times=1 x1')
    // a difference is already counted from nothing, so nothing is subtracted
    assert.equal(inferred('high_temp - low_temp + population'),
        'F^1 times=0 x1')
    assert.equal(inferred('if (population > 0) { high_temp } else { area }'),
        'F^1 times=1 x1')
})

// What a script works out to when the caller expects a unit of it. Whatever the script says is
// converted into that unit.
for (const [code, expected, reads] of [
    ['population + area', 'unitDistancePerYear', 'm^1 s^-1 times=1 x3.168808781402895e-8'],
    ['population + area', 'unitTime', 's^1 times=1 x3600'],
    ['population + area', 'unitDensity', 'm^-2 person^1 times=1 x0.000001'],
    // a share is dimensionless, as a plain number is, so the sum is read as a plain number
    ['population + area', 'unitPercentage', 'dimensionless times=1 x1'],
    // a temperature is counted from its own zero, so a zero is added at the end
    ['population + area', 'unitTemperature', 'F^1 times=1 x1'],
    // one statistic is converted into another's unit the same way
    ['population', 'unitDistancePerYear', 'm^1 s^-1 times=1 x3.168808781402895e-8'],
    ['population', 'unitTemperature', 'F^1 times=1 x1'],
    ['population / area', 'unitDensity', 'm^-2 person^1 times=1 x0.000001'],
    ['population / area', 'unitTime', 's^1 times=1 x3600'],
    // a logarithm is dimensionless, so a single factor converts it into any unit
    ['ln(population)', 'unitDistancePerYear', 'm^1 s^-1 times=1 x3.168808781402895e-8'],
    ['ln(population)', 'unitPercentage', 'dimensionless times=1 x1'],
    // and a bare number is simply read in the expected unit
    ['100', 'unitDistancePerYear', 'm^1 s^-1 times=1 x3.168808781402895e-8'],
    ['100', 'unitTemperature', 'F^1 times=1 x1'],
    ['100', 'unitDensity', 'm^-2 person^1 times=1 x0.000001'],
] as const) {
    void test(`${code} as ${expected}`, () => {
        assert.equal(inferredAs(code, expected), reads)
    })
}

void test('an expected unit reaches bare numbers', () => {
    // a script that is nothing but a number has nothing else to read it from
    assert.equal(inferredAs('100', 'unitArea'), 'm^2 times=1 x1000000')
    assert.equal(inferredAs('100', 'unitTemperature'), 'F^1 times=1 x1')
    assert.equal(inferredAs('0.1', 'unitPercentage'), 'dimensionless times=1 x1')
    // and the expectation reaches every number in the script
    assert.equal(inferredAs('maximum(100, 200)', 'unitArea'), 'm^2 times=1 x1000000')
    assert.equal(inferredAs('[100, 200]', 'unitArea'), 'm^2 times=1 x1000000')
    assert.equal(inferredAs('if (population > 0) { 100 } else { 200 }', 'unitArea'),
        'm^2 times=1 x1000000')
})

void test('an expected unit converts the script', () => {
    // a factor appears wherever the script does not say what is expected
    assert.equal(inferredAs('population', 'unitArea'), 'm^2 times=1 x1000000')
    assert.equal(inferredAs('ln(100)', 'unitArea'), 'm^2 times=1 x1000000')
    assert.equal(inferredAs('ln(density_pw_1km)', 'unitArea'),
        'm^2 times=1 x1000000')
    // a reading does not scale, so its zero is subtracted first and added back after
    assert.equal(inferredAs('area / 2', 'unitTemperature'), 'F^1 times=1 x1')
    assert.equal(inferredAs('high_temp', 'unitArea'), 'm^2 times=1 x1000000')
})

void test('a script with nothing to read', () => {
    assert.equal(inferred('someFunctionOrOther(population)'), 'dimensionless times=1 x1')
    assert.equal(inferred('"a string"'), 'dimensionless times=1 x1')
    assert.equal(inferred('rampUridis'), 'dimensionless times=1 x1')
    assert.equal(inferred('12'), 'dimensionless times=1 x1')
    assert.equal(inferred('population > area'), 'dimensionless times=1 x1')
    assert.equal(inferred(''), 'dimensionless times=1 x1')
    // code that does not parse is code all the same, and reading it says nothing rather than failing
    assert.equal(inferred('population +'), 'dimensionless times=1 x1')
})
