import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { parseNoError } from '../src/urban-stats-script/parser'
import { AbstractInterpValue, unitToWriteIn } from '../src/urban-stats-script/unit-algebra'
import { inferUnit } from '../src/urban-stats-script/unit-inference'

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

function of(code: string): AbstractInterpValue {
    return inferUnit(parseNoError(code, 'test'), defaultTypeEnvironment('USA'))
}

function inferred(code: string): string {
    return shape(of(code))
}

function writable(code: string): boolean {
    return unitToWriteIn(of(code)) !== undefined
}

void test('a statistic is of the kind its column is', () => {
    assert.equal(inferred('population'), 'person^1 times=1 x1')
    assert.equal(inferred('area'), 'm^2 times=1 x1000000')
    assert.equal(inferred('high_temp'), 'F^1 times=1 x1')
})

void test('arithmetic on statistics carries their kinds through', () => {
    assert.equal(inferred('population / area'), 'm^-2 person^1 times=1 x0.000001')
    assert.equal(inferred('area ** 0.5'), 'm^1 times=1 x1000')
    assert.equal(inferred('population * 2'), 'person^1 times=2 x1')
    assert.equal(inferred('-population'), 'person^1 times=-1 x1')
    assert.equal(inferred('(high_temp + low_temp) / 2'), 'F^1 times=1 x1')
})

void test('a chain of temperatures is one of them, where its coefficients come back to one', () => {
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

void test('a power raises what an expression worked out to', () => {
    // in kilometres, of which it is root two, since the coefficient is raised along with the area
    assert.equal(inferred('(area * 2) ** 0.5'), 'm^1 times=1.4142135623730951 x1000')
    assert.equal(inferred('(area ** 0.5) ** 2'), 'm^2 times=1 x1000000')
    assert.equal(inferred('(population / area) ** 0.5 * area ** 0.5'), 'person^0.5 times=1 x1')
    // where a temperature has no scale to raise, since twice as far above freezing is not twice as warm
    assert.equal(inferred('(high_temp * 2) ** 0.5'), 'inconsistent')
})

void test('nothing is the sum of two unlike kinds', () => {
    assert.equal(inferred('population + area'), 'inconsistent')
    assert.equal(inferred('(population + area) / area'), 'inconsistent')
})

void test('a name is worth what it was assigned', () => {
    assert.equal(inferred('x = population / area\nx * 2'), 'm^-2 person^1 times=2 x0.000001')
    // and what a name was assigned last, since the statements are read in order
    assert.equal(inferred('x = population\nx = area\nx'), 'm^2 times=1 x1000000')
})

void test('a filter says nothing about what is measured of what it keeps', () => {
    assert.equal(inferred('condition(population > 1000)\npopulation / area'), 'm^-2 person^1 times=1 x0.000001')
})

void test('an if runs both of its arms over the column, so a value is either of theirs', () => {
    assert.equal(inferred('if (population > 0) { high_temp } else { low_temp }'), 'F^1 times=1 x1')
    assert.equal(inferred('if (population > 0) { population } else { area }'), 'unknown')
    // an arm with no counterpart writes where its mask holds and nothing where it does not
    assert.equal(inferred('if (population > 0) { high_temp }'), 'F^1 times=1 x1')
})

void test('a name an arm binds is bound outside it', () => {
    assert.equal(inferred('if (population > 0) { x = area }\nx'), 'm^2 times=1 x1000000')
    assert.equal(inferred('if (population > 0) { x = area } else { x = population }\nx'), 'unknown')
    // where the arm that did not run left it as it was
    assert.equal(inferred('x = area\nif (population > 0) { x = area * 2 }\nx'), 'm^2 times=unknown x1000000')
    assert.equal(inferred('x = area\nif (population > 0) { x = area / 2 }\nx'), 'm^2 times=unknown x1000000')
})

void test('a vector is of the kind of what is in it', () => {
    assert.equal(inferred('[high_temp, low_temp]'), 'F^1 times=1 x1')
    assert.equal(inferred('[population, area]'), 'unknown')
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
    // nothing is the larger of a population and an area
    ['maximum(population, area)', 'inconsistent'],
    ['inverseQuantile(population, population)', 'dimensionless times=1 x1'],
    ['sign(population)', 'dimensionless times=1 x1'],
    // a function that states no rule says any quantity at all, rather than none
    ['rgb(0.1, 0.2, 0.3)', 'unknown'],
    ['toNumber(population)', 'unknown'],
    ['toNumber(population) + population', 'person^1 times=1 x1'],
] as const) {
    void test(`${code} is ${expected}`, () => {
        assert.equal(inferred(code), expected)
    })
}

void test('the size of a reading is no reading, where the size of a difference is a difference', () => {
    // ten degrees below freezing is one number in Fahrenheit and another in Celsius
    assert.equal(inferred('abs(high_temp)'), 'F^1 times=unknown x1')
    assert.ok(!writable('abs(high_temp)'))
    assert.equal(inferred('abs(high_temp - low_temp)'), 'F^1 times=0 x1')
    assert.ok(writable('abs(high_temp - low_temp)'))
    // as is putting a zero in for a missing reading, that zero being wherever the scale puts it
    assert.equal(inferred('nanTo0(high_temp)'), 'F^1 times=unknown x1')
    assert.equal(inferred('nanTo0(high_temp - low_temp)'), 'F^1 times=0 x1')
})

void test('a rank is of two of one kind, and is a number of none', () => {
    assert.equal(inferred('inverseQuantile(population, population)'), 'dimensionless times=1 x1')
    assert.equal(inferred('inversePercentile(high_temp, low_temp)'), 'dimensionless times=1 x1')
    // nothing is the rank of a population among areas
    assert.equal(inferred('inverseQuantile(population, area)'), 'inconsistent')
})

void test('a larger of a quantity and a bare number is that quantity', () => {
    // as a sum of one and the other is, only alike things being comparable in the first place
    assert.equal(inferred('maximum(high_temp, 80)'), 'F^1 times=1 x1')
    assert.equal(inferred('minimum(area, 100)'), 'm^2 times=1 x1000000')
    assert.equal(inferred('maximum(0.05, commute_bike)'), 'dimensionless times=1 x1')
    // two bare numbers stay bare, no unit being known of either
    assert.equal(inferred('maximum(1, 2)'), 'unknown')
    // and nothing is the larger of a population and an area, as nothing is their sum
    assert.equal(inferred('maximum(population, area)'), 'inconsistent')
    assert.equal(inferred('maximum(population + area, population)'), 'inconsistent')
})

void test('a total is as many of them as there were, which is not a number anyone knows', () => {
    assert.equal(inferred('sum(population)'), 'person^1 times=unknown x1')
    // so many people are people all the same, where so many temperatures are no temperature
    assert.ok(writable('sum(population)'))
    assert.equal(inferred('sum(high_temp)'), 'F^1 times=unknown x1')
    assert.ok(!writable('sum(high_temp)'))
    // a mean of them is one of them again, and a total of differences is a difference
    assert.ok(writable('mean(high_temp)'))
    assert.equal(inferred('sum(high_temp - low_temp)'), 'F^1 times=0 x1')
})

void test('a logarithm takes whatever it is given and gives a number of no kind', () => {
    assert.equal(inferred('ln(density_pw_1km)'), 'dimensionless times=1 x1')
    assert.equal(inferred('log10(area)'), 'dimensionless times=1 x1')
    assert.equal(inferred('sin(population)'), 'dimensionless times=1 x1')
    // being of no kind, it scales what it multiplies rather than adding a dimension to it
    assert.equal(inferred('ln(population) * area'), 'm^2 times=1 x1000000')
})

void test('a name the script bound is that name, not the built-in it hides', () => {
    assert.equal(inferred('sqrt = population\nsqrt'), 'person^1 times=1 x1')
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
    assert.equal(inferred(`${people}regr.nonesuch`), 'unknown')
})

void test('a regression says nothing of a parameter it cannot read', () => {
    // a share over a logarithm is a number of neither kind, the logarithm being of no kind at all
    assert.equal(inferred('regr = regression(y=commute_bike, x1=ln(population))\nregr.m1'), 'dimensionless times=unknown x1')
    // where a parameter nothing is known of leaves the coefficient unknown too
    assert.equal(inferred('regr = regression(y=commute_bike, x1=rgb(0, 0, 0))\nregr.m1'), 'unknown')
    // and one of no dependent variable is a regression in name only
    assert.equal(inferred('regr = regression(x1=area)\nregr.b'), 'unknown')
})

void test('a script can shadow a built-in, and calling it is not calling the built-in', () => {
    assert.equal(inferred('sqrt = area\nsqrt(population)'), 'unknown')
    assert.equal(inferred('ln = area\nln(population)'), 'unknown')
})

void test('a node the editor wraps is read through', () => {
    assert.equal(inferred('autoUXNode(population, "{}")'), 'person^1 times=1 x1')
    assert.equal(inferred('autoUXNode(population + area, "{}")'), 'inconsistent')
})

void test('an object literal is read field by field', () => {
    assert.equal(inferred('x = { a: population, b: area }\nx.a'), 'person^1 times=1 x1')
    assert.equal(inferred('x = { a: population, b: area }\nx.b'), 'm^2 times=1 x1000000')
    assert.equal(inferred('x = { a: population }\nx.nonesuch'), 'unknown')
})

void test('unlike units in an operation', () => {
    assert.equal(inferred('population + area'), 'inconsistent')
    assert.equal(inferred('area + population'), 'inconsistent')
    assert.equal(inferred('population - area'), 'inconsistent')
    assert.equal(inferred('population < area'), 'unknown')
    assert.equal(inferred('area >= population'), 'unknown')
})

void test('a literal beside unlike units', () => {
    assert.equal(inferred('population + area * 2'), 'inconsistent')
    assert.equal(inferred('population + area / 2'), 'inconsistent')
    assert.equal(inferred('population + sqrt(area)'), 'inconsistent')
    assert.equal(inferred('commute_bike + population'), 'inconsistent')
})

void test('several unlike units in one expression', () => {
    assert.equal(inferred('population + area + area'), 'inconsistent')
    assert.equal(inferred('population * 2 + area'), 'inconsistent')
    assert.equal(inferred('(population + area) * 2'), 'inconsistent')
    assert.equal(inferred('x = area\npopulation + x'), 'inconsistent')
})

void test('arguments of a call that share a unit', () => {
    assert.equal(inferred('maximum(area, population)'), 'inconsistent')
    assert.equal(inferred('minimum(population, area)'), 'inconsistent')
    assert.equal(inferred('inverseQuantile(population, area)'), 'inconsistent')
})

void test('operations on matching units', () => {
    assert.equal(inferred('population + population'), 'person^1 times=2 x1')
    assert.equal(inferred('area / area'), 'dimensionless times=1 x1')
    assert.equal(inferred('high_temp + low_temp'), 'F^1 times=2 x1')
})

void test('if arms and vector elements of unlike units', () => {
    assert.equal(inferred('[population, area, sunny_hours]'), 'unknown')
    assert.equal(inferred('[population, area]'), 'unknown')
    assert.equal(inferred('if (population > 0) { population } else { area }'), 'unknown')
})

void test('a temperature in a product', () => {
    assert.equal(inferred('high_temp * area'), 'inconsistent')
    assert.equal(inferred('area * high_temp'), 'inconsistent')
    assert.equal(inferred('high_temp / area'), 'inconsistent')
    assert.equal(inferred('high_temp ** 2'), 'inconsistent')
    assert.equal(inferred('high_temp ** 2 * area'), 'inconsistent')
    assert.equal(inferred('sqrt(high_temp)'), 'inconsistent')
    // a bare number scales the reading itself, which keeps its zero
    assert.equal(inferred('high_temp * 2'), 'F^1 times=2 x1')
    assert.equal(inferred('(high_temp + low_temp) / 2'), 'F^1 times=1 x1')
})

void test('a temperature in a sum of unlike units', () => {
    assert.equal(inferred('high_temp + population'), 'inconsistent')
    assert.equal(inferred('population + high_temp'), 'inconsistent')
    assert.equal(inferred('high_temp - low_temp + population'), 'inconsistent')
    assert.equal(inferred('if (population > 0) { high_temp } else { area }'), 'unknown')
})

void test('what cannot be read comes back as anything, rather than throwing', () => {
    assert.equal(inferred('someFunctionOrOther(population)'), 'unknown')
    assert.equal(inferred('"a string"'), 'unknown')
    assert.equal(inferred('rampUridis'), 'unknown')
    assert.equal(inferred('12'), 'unknown 12')
    assert.equal(inferred('population > area'), 'unknown')
    assert.equal(inferred(''), 'unknown')
    // code that does not parse is code all the same, and reading it says nothing rather than failing
    assert.equal(inferred('population +'), 'unknown')
})
