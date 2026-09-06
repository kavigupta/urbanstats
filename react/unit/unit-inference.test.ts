import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { noLocation } from '../src/urban-stats-script/location'
import { parseNoError } from '../src/urban-stats-script/parser'
import { AbstractInterpValue, unitToWriteIn } from '../src/urban-stats-script/unit-algebra'
import { unitCheck, unitWithin } from '../src/urban-stats-script/unit-inference'
import { StoredUnit } from '../src/utils/quantity'

/** What is known, as a string: the dimensions, how many of itself it is, and its scale. */
function shape(known: AbstractInterpValue): string {
    if (known.kind === 'none') {
        return 'inconsistent'
    }
    if (known.kind === 'any') {
        return known.constant === undefined ? 'unknown' : `unknown ${known.constant}`
    }
    const written = [...known.unit.unit.dimensions]
        .sort((a, b) => a.baseUnit.localeCompare(b.baseUnit))
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .join(' ')
    return `${written === '' ? 'dimensionless' : written} times=${known.unit.unit.times} x${known.unit.toBaseUnits}`
}

function of(code: string, expected?: StoredUnit): AbstractInterpValue {
    const typeEnvironment = defaultTypeEnvironment('USA')
    const checked = unitCheck(parseNoError(code, 'test'), typeEnvironment, expected)
    // read again, since reading a checked script has to give the same answer
    return unitWithin({ type: 'customNode', entireLoc: noLocation, expr: checked.ast, originalCode: code }, typeEnvironment, checked.named, expected)
}

/** What the script works out to. How it was converted to get there is a caption's business. */
function inferred(code: string, expected?: StoredUnit): string {
    return shape(of(code, expected))
}

/** The unit an expression of the same environment works out to, for expecting one of it. */
function unitOf(code: string): StoredUnit {
    const unit = unitCheck(parseNoError(code, 'test'), defaultTypeEnvironment('USA')).unit
    assert.ok(unit !== undefined, `${code} is of no unit to expect`)
    return unit
}

function writable(code: string): boolean {
    return unitToWriteIn(of(code)) !== undefined
}

void test('statistics have units', () => {
    assert.equal(inferred('population'), 'person^1 times=1 x1')
    assert.equal(inferred('area'), 'm^2 times=1 x1000000')
    assert.equal(inferred('high_temp'), 'F^1 times=1 x1')
})

void test('arithmetic combines units', () => {
    assert.equal(inferred('population / area'), 'm^-2 person^1 times=1 x0.000001')
    assert.equal(inferred('area ** 0.5'), 'm^1 times=1 x1000')
    assert.equal(inferred('population * 2'), 'person^1 times=2 x1')
    assert.equal(inferred('-population'), 'person^1 times=-1 x1')
    assert.equal(inferred('(high_temp + low_temp) / 2'), 'F^1 times=1 x1')
})

void test('temperature arithmetic tracks the coefficient', () => {
    assert.equal(inferred('high_temp - low_temp + high_temp_djf'), 'F^1 times=1 x1')
    assert.equal(inferred('high_temp * 2 - high_temp'), 'F^1 times=1 x1')
    assert.equal(inferred('(high_temp + low_temp + high_temp_djf) / 3'), 'F^1 times=1 x1')
    assert.ok(writable('high_temp - low_temp + high_temp_djf'))
    // and where they cancel, a number of degrees, which is also a thing to write
    assert.equal(inferred('high_temp - low_temp + high_temp_djf - high_temp'), 'F^1 times=0 x1')
    assert.ok(writable('high_temp - low_temp + high_temp_djf - high_temp'))
    // but minus one temperature is no temperature, and there is nothing to write it as
    assert.equal(inferred('5 - high_temp'), 'F^1 times=-1 x1')
    assert.ok(!writable('5 - high_temp'))
})

void test('powers raise units', () => {
    // in kilometres, of which it is root two, since the coefficient is raised along with the area
    assert.equal(inferred('(area * 2) ** 0.5'), 'm^1 times=1.4142135623730951 x1000')
    assert.equal(inferred('(area ** 0.5) ** 2'), 'm^2 times=1 x1000000')
    assert.equal(inferred('(population / area) ** 0.5 * area ** 0.5'), 'person^0.5 times=1 x1')
    // a temperature is raised from its own zero, so that zero is subtracted first
    assert.equal(inferred('(high_temp * 2) ** 0.5'), 'F^0.5 times=0 x1')
})

void test('a sum of unlike units', () => {
    // people and an area add when the area is read as so many people, so the sum counts two of them
    assert.equal(inferred('population + area'), 'person^1 times=2 x1')
    assert.equal(inferred('(population + area) / area'), 'm^-2 person^1 times=2 x0.000001')
})

void test('a name takes the unit it was assigned', () => {
    assert.equal(inferred('x = population / area\nx * 2'), 'm^-2 person^1 times=2 x0.000001')
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
    // where the arm that did not run left it as it was
    assert.equal(inferred('x = area\nif (population > 0) { x = area * 2 }\nx'), 'm^2 times=unknown x1000000')
    assert.equal(inferred('x = area\nif (population > 0) { x = area / 2 }\nx'), 'm^2 times=unknown x1000000')
})

void test('a vector takes the unit of its elements', () => {
    assert.equal(inferred('[high_temp, low_temp]'), 'F^1 times=1 x1')
    assert.equal(inferred('[population, area]'), 'person^1 times=1 x1')
    // two temperatures are not one, so either of them and one of them is neither, and unwritable
    assert.equal(inferred('[high_temp, high_temp + high_temp]'), 'F^1 times=unknown x1')
    assert.ok(!writable('[high_temp, high_temp + high_temp]'))
    // as is a temperature or a difference of two, where an area or a difference of two is an area
    assert.ok(!writable('if (population > 0) { high_temp } else { high_temp - low_temp }'))
    assert.ok(writable('if (population > 0) { area } else { area - area }'))
})

// What each built-in makes of a quantity it is given, which each one says for itself
for (const [code, expected] of [
    ['abs(high_temp - low_temp)', 'F^1 times=0 x1'],
    ['round(population)', 'person^1 times=1 x1'],
    ['nanTo0(density_pw_1km)', 'm^-2 person^1 times=unknown x0.000001'],
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
    // a function that states no rule says any quantity at all, rather than none
    ['rgb(0.1, 0.2, 0.3)', 'unknown'],
    ['toNumber(population)', 'person^1 times=1 x1'],
    ['toNumber(population) + population', 'person^1 times=2 x1'],
] as const) {
    void test(code, () => {
        assert.equal(inferred(code), expected)
    })
}

void test('abs keeps a difference but not a reading', () => {
    // ten degrees below freezing is one number in Fahrenheit and another in Celsius
    assert.equal(inferred('abs(high_temp)'), 'F^1 times=unknown x1')
    assert.ok(!writable('abs(high_temp)'))
    assert.equal(inferred('abs(high_temp - low_temp)'), 'F^1 times=0 x1')
    assert.ok(writable('abs(high_temp - low_temp)'))
    // as is putting a zero in for a missing reading, that zero being wherever the scale puts it
    assert.equal(inferred('nanTo0(high_temp)'), 'F^1 times=unknown x1')
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
    // two bare numbers stay bare, no unit being known of either
    assert.equal(inferred('maximum(1, 2)'), 'unknown')
    // and the larger of a population and an area is a population, just as their sum is one
    assert.equal(inferred('maximum(population, area)'), 'person^1 times=1 x1')
    assert.equal(inferred('maximum(population + area, population)'), 'person^1 times=unknown x1')
})

void test('a total has an unknown coefficient', () => {
    assert.equal(inferred('sum(population)'), 'person^1 times=unknown x1')
    // so many people are people all the same, where so many temperatures are no temperature
    assert.ok(writable('sum(population)'))
    assert.equal(inferred('sum(high_temp)'), 'F^1 times=unknown x1')
    assert.ok(!writable('sum(high_temp)'))
    // a mean of them is one of them again, and a total of differences is a difference
    assert.ok(writable('mean(high_temp)'))
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
    assert.equal(inferred('sqrt = area\nsqrt(population)'), 'unknown')
    assert.equal(inferred('ln = area\nln(population)'), 'unknown')
})

void test('a node the editor wraps is read through', () => {
    // the mapper's editor wraps parts of a script, which say nothing about units themselves
    assert.equal(inferred('autoUXNode(population, "{}")'), 'person^1 times=1 x1')
    assert.equal(inferred('autoUXNode(population + area, "{}")'), 'person^1 times=2 x1')
})

void test('an object literal is read field by field', () => {
    // a script can make one of its own, and a field of it is worth what was put there
    assert.equal(inferred('x = { a: population, b: area }\nx.a'), 'person^1 times=1 x1')
    assert.equal(inferred('x = { a: population, b: area }\nx.b'), 'm^2 times=1 x1000000')
    assert.equal(inferred('x = { a: population }\nx.nonesuch'), 'unknown')
})

void test('a regression is read field by field', () => {
    const people = 'regr = regression(y=population, x1=area)\n'
    // the intercept is in the units of what was regressed, and the residuals are a difference of those
    assert.equal(inferred(`${people}regr.b`), 'person^1 times=1 x1')
    assert.equal(inferred(`${people}regr.residuals`), 'person^1 times=0 x1')
    // a coefficient is that difference over a difference of its parameter: people per square kilometre
    assert.equal(inferred(`${people}regr.m1`), 'm^-2 person^1 times=unknown x0.000001')
    assert.equal(inferred(`${people}regr.r2`), 'dimensionless times=1 x1')
    // and of a temperature, degrees per square kilometre, a difference of them being what multiplies
    assert.equal(inferred('regr = regression(y=high_temp, x1=area)\nregr.m1'), 'F^1 m^-2 times=unknown x0.000001')
    // and a share over a logarithm is dimensionless: neither is counted in anything
    assert.equal(inferred('regr = regression(y=commute_bike, x1=ln(population))\nregr.m1'), 'dimensionless times=unknown x1')
    assert.equal(inferred(`${people}regr.nonesuch`), 'unknown')
})

void test('a regression of what has no unit', () => {
    // a parameter with no known unit leaves the coefficient unknown
    assert.equal(inferred('regr = regression(y=commute_bike, x1=rgb(0, 0, 0))\nregr.m1'), 'unknown')
    // and one of no dependent variable is a regression in name only
    assert.equal(inferred('regr = regression(x1=area)\nregr.b'), 'unknown')
})

void test('a factor goes on the right', () => {
    assert.equal(inferred('population + area'), 'person^1 times=2 x1')
    assert.equal(inferred('area + population'), 'm^2 times=2 x1000000')
    // a difference of two quantities is a difference; a comparison has no unit of its own
    assert.equal(inferred('population - area'), 'person^1 times=0 x1')
    assert.equal(inferred('population < area'), 'unknown')
    assert.equal(inferred('area >= population'), 'unknown')
})

void test('a literal already there takes the unit', () => {
    // the 2 of area * 2 is read as two people per square kilometre, so the sum has one unit
    assert.equal(inferred('population + area * 2'), 'person^1 times=unknown x1')
    assert.equal(inferred('population + area / 2'), 'person^1 times=unknown x1')
    // where there is no literal to read, the conversion is recorded on the expression
    assert.equal(inferred('population + sqrt(area)'), 'person^1 times=2 x1')
    // a share is dimensionless and a count is people, so a factor separates them
    assert.equal(inferred('commute_bike + population'), 'dimensionless times=2 x1')
})

void test('several factors in one expression', () => {
    assert.equal(inferred('population + area + area'), 'person^1 times=3 x1')
    assert.equal(inferred('population * 2 + area'), 'person^1 times=3 x1')
    assert.equal(inferred('(population + area) * 2'), 'person^1 times=4 x1')
    // a name has the unit it was bound to, and converts the same way
    assert.equal(inferred('x = area\npopulation + x'), 'person^1 times=2 x1')
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
    assert.equal(inferred('[population, area]', unitOf('density_pw_1km')),
        'm^-2 person^1 times=1 x0.000001')
    assert.equal(inferred('if (population > 0) { population } else { area }', unitOf('density_pw_1km')),
        'm^-2 person^1 times=1 x0.000001')
})

void test('a product takes the zero off a reading', () => {
    // a temperature times an area is a temperature difference times an area
    assert.equal(inferred('high_temp * area'), 'F^1 m^2 times=0 x1000000')
    assert.equal(inferred('area * high_temp'), 'F^1 m^2 times=0 x1000000')
    assert.equal(inferred('high_temp / area'), 'F^1 m^-2 times=0 x0.000001')
    assert.equal(inferred('high_temp ** 2'), 'F^2 times=0 x1')
    assert.equal(inferred('high_temp ** 2 * area'), 'F^2 m^2 times=0 x1000000')
    assert.equal(inferred('sqrt(high_temp)'), 'F^0.5 times=0 x1')
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
    ['population + area', 'rainfall', 'm^1 s^-1 times=1 x3.168808781402895e-8'],
    ['population + area', 'sunny_hours', 's^1 times=1 x3600'],
    ['population + area', 'density_pw_1km', 'm^-2 person^1 times=1 x0.000001'],
    // a share is dimensionless, as a plain number is, so the sum is read as a plain number
    ['population + area', 'commute_bike', 'dimensionless times=1 x1'],
    // a temperature is counted from its own zero, so a zero is added at the end
    ['population + area', 'high_temp', 'F^1 times=1 x1'],
    // one statistic is converted into another's unit the same way
    ['population', 'rainfall', 'm^1 s^-1 times=1 x3.168808781402895e-8'],
    ['population', 'high_temp', 'F^1 times=1 x1'],
    ['population / area', 'density_pw_1km', 'm^-2 person^1 times=1 x0.000001'],
    ['population / area', 'sunny_hours', 's^1 times=1 x3600'],
    // a logarithm is dimensionless, so a single factor converts it into any unit
    ['ln(population)', 'rainfall', 'm^1 s^-1 times=1 x3.168808781402895e-8'],
    ['ln(population)', 'commute_bike', 'dimensionless times=1 x1'],
    // and a bare number is simply read in the expected unit
    ['100', 'rainfall', 'm^1 s^-1 times=1 x3.168808781402895e-8'],
    ['100', 'high_temp', 'F^1 times=1 x1'],
    ['100', 'density_pw_1km', 'm^-2 person^1 times=1 x0.000001'],
] as const) {
    void test(`${code} as ${expected}`, () => {
        assert.equal(inferred(code, unitOf(expected)), reads)
    })
}

void test('an expected unit reaches bare numbers', () => {
    // a script that is nothing but a number has nothing else to read it from
    assert.equal(inferred('100', unitOf('area')), 'm^2 times=1 x1000000')
    assert.equal(inferred('100', unitOf('high_temp')), 'F^1 times=1 x1')
    assert.equal(inferred('0.1', unitOf('commute_bike')), 'dimensionless times=1 x1')
    // and the expectation reaches every number in the script
    assert.equal(inferred('maximum(100, 200)', unitOf('area')), 'm^2 times=1 x1000000')
    assert.equal(inferred('[100, 200]', unitOf('area')), 'm^2 times=1 x1000000')
    assert.equal(inferred('if (population > 0) { 100 } else { 200 }', unitOf('area')),
        'm^2 times=1 x1000000')
})

void test('an expected unit converts the script', () => {
    // a factor appears wherever the script does not say what is expected
    assert.equal(inferred('population', unitOf('area')), 'm^2 times=1 x1000000')
    assert.equal(inferred('ln(100)', unitOf('area')), 'm^2 times=1 x1000000')
    assert.equal(inferred('ln(density_pw_1km)', unitOf('area')),
        'm^2 times=1 x1000000')
    // a reading does not scale, so its zero is subtracted first and added back after
    assert.equal(inferred('area / 2', unitOf('high_temp')), 'F^1 times=1 x1')
    assert.equal(inferred('high_temp', unitOf('area')), 'm^2 times=0 x1000000')
})

void test('a script with nothing to read', () => {
    assert.equal(inferred('someFunctionOrOther(population)'), 'unknown')
    assert.equal(inferred('"a string"'), 'unknown')
    assert.equal(inferred('rampUridis'), 'unknown')
    assert.equal(inferred('12'), 'unknown 12')
    assert.equal(inferred('population > area'), 'unknown')
    assert.equal(inferred(''), 'unknown')
    // code that does not parse is code all the same, and reading it says nothing rather than failing
    assert.equal(inferred('population +'), 'unknown')
})
