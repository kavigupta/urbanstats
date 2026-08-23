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

void test('a regression is read field by field', () => {
    const people = 'regr = regression(y=population, x1=area)\n'
    // the intercept is in the units of what was regressed, and the residuals are a difference of those
    assert.equal(inferred(`${people}regr.b`), 'person^1 times=1 x1')
    assert.equal(inferred(`${people}regr.residuals`), 'person^1 times=0 x1')
    // a coefficient is that difference over a difference of its parameter: people per square kilometre
    assert.equal(inferred(`${people}regr.m1`), 'm^-2 person^1 times=unknown x0.000001')
    assert.equal(inferred(`${people}regr.r2`), 'unknown')
    assert.equal(inferred(`${people}regr.nonesuch`), 'unknown')
})

void test('a regression says nothing of a parameter it cannot read', () => {
    // the coefficient of a log is a share over nothing anybody can name
    assert.equal(inferred('regr = regression(y=commute_bike, x1=ln(population))\nregr.m1'), 'unknown')
    // and one of no dependent variable is a regression in name only
    assert.equal(inferred('regr = regression(x1=area)\nregr.b'), 'unknown')
})

void test('a name bound over regression is that name, not the regression', () => {
    assert.equal(inferred('regression = population\nregression'), 'person^1 times=1 x1')
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
