import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { noLocation } from '../src/urban-stats-script/location'
import { parseNoError, unparse } from '../src/urban-stats-script/parser'
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
    // read again, since what the pass wrote in has to say the same thing the pass said
    return unitWithin({ type: 'customNode', entireLoc: noLocation, expr: checked.ast, originalCode: code }, typeEnvironment, checked.named)
}

/** The script as the pass rewrote it, and what it works out to. */
function inferred(code: string, expected?: StoredUnit): string {
    const checked = unitCheck(parseNoError(code, 'test'), defaultTypeEnvironment('USA'), expected)
    return `${unparse(checked.ast, { inline: true, expressionalContext: true })} : ${shape(of(code, expected))}`
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

void test('a statistic is of the kind its column is', () => {
    assert.equal(inferred('population'), 'population : person^1 times=1 x1')
    assert.equal(inferred('area'), 'area : m^2 times=1 x1000000')
    assert.equal(inferred('high_temp'), 'high_temp : F^1 times=1 x1')
})

void test('arithmetic on statistics carries their kinds through', () => {
    assert.equal(inferred('population / area'), 'population / area : m^-2 person^1 times=1 x0.000001')
    assert.equal(inferred('area ** 0.5'), 'area ** 0.5 : m^1 times=1 x1000')
    assert.equal(inferred('population * 2'), 'population * 2 : person^1 times=2 x1')
    assert.equal(inferred('-population'), '-population : person^1 times=-1 x1')
    assert.equal(inferred('(high_temp + low_temp) / 2'), '(high_temp + low_temp) / 2 : F^1 times=1 x1')
})

void test('a chain of temperatures is one of them, where its coefficients come back to one', () => {
    assert.equal(inferred('high_temp - low_temp + high_temp_djf'), 'high_temp - low_temp + high_temp_djf : F^1 times=1 x1')
    assert.equal(inferred('high_temp * 2 - high_temp'), 'high_temp * 2 - high_temp : F^1 times=1 x1')
    assert.equal(inferred('(high_temp + low_temp + high_temp_djf) / 3'), '(high_temp + low_temp + high_temp_djf) / 3 : F^1 times=1 x1')
    assert.ok(writable('high_temp - low_temp + high_temp_djf'))
    // and where they cancel, a number of degrees, which is also a thing to write
    assert.equal(inferred('high_temp - low_temp + high_temp_djf - high_temp'), 'high_temp - low_temp + high_temp_djf - high_temp : F^1 times=0 x1')
    assert.ok(writable('high_temp - low_temp + high_temp_djf - high_temp'))
    // but minus one temperature is no temperature, and there is nothing to write it as
    assert.equal(inferred('5 - high_temp'), '5 - high_temp : F^1 times=-1 x1')
    assert.ok(!writable('5 - high_temp'))
})

void test('a power raises what an expression worked out to', () => {
    // in kilometres, of which it is root two, since the coefficient is raised along with the area
    assert.equal(inferred('(area * 2) ** 0.5'), '(area * 2) ** 0.5 : m^1 times=1.4142135623730951 x1000')
    assert.equal(inferred('(area ** 0.5) ** 2'), 'area ** 0.5 ** 2 : m^2 times=1 x1000000')
    assert.equal(inferred('(population / area) ** 0.5 * area ** 0.5'), '(population / area) ** 0.5 * area ** 0.5 : person^0.5 times=1 x1')
    // where a temperature has no scale to raise, since twice as far above freezing is not twice as warm
    assert.equal(inferred('(high_temp * 2) ** 0.5'), '(high_temp * 2) ** 0.5 : inconsistent')
})

void test('a sum of two unlike kinds is read with the factor between them written in', () => {
    // people and an area add where the area is so many people each, and how many of itself the sum
    // is cannot be said, one side of it being a product
    assert.equal(inferred('population + area'), 'population + area * 1 : person^1 times=unknown x1')
    assert.equal(inferred('(population + area) / area'), '(population + area * 1) / area : m^-2 person^1 times=unknown x0.000001')
})

void test('a name is worth what it was assigned', () => {
    assert.equal(inferred('x = population / area\nx * 2'), 'x = population / area; x * 2 : m^-2 person^1 times=2 x0.000001')
    // and what a name was assigned last, since the statements are read in order
    assert.equal(inferred('x = population\nx = area\nx'), 'x = population; x = area; x : m^2 times=1 x1000000')
})

void test('a filter says nothing about what is measured of what it keeps', () => {
    assert.equal(inferred('condition(population > 1000)\npopulation / area'), 'condition (population > 1000)\npopulation / area : m^-2 person^1 times=1 x0.000001')
})

void test('an if runs both of its arms over the column, so a value is either of theirs', () => {
    assert.equal(inferred('if (population > 0) { high_temp } else { low_temp }'), 'if (population > 0) { high_temp } else { low_temp } : F^1 times=1 x1')
    assert.equal(inferred('if (population > 0) { population } else { area }'), 'if (population > 0) { population } else { area } : unknown')
    // an arm with no counterpart writes where its mask holds and nothing where it does not
    assert.equal(inferred('if (population > 0) { high_temp }'), 'if (population > 0) { high_temp } : F^1 times=1 x1')
})

void test('a name an arm binds is bound outside it', () => {
    assert.equal(inferred('if (population > 0) { x = area }\nx'), 'if (population > 0) { x = area }; x : m^2 times=1 x1000000')
    assert.equal(inferred('if (population > 0) { x = area } else { x = population }\nx'), 'if (population > 0) { x = area } else { x = population }; x : unknown')
    // where the arm that did not run left it as it was
    assert.equal(inferred('x = area\nif (population > 0) { x = area * 2 }\nx'), 'x = area; if (population > 0) { x = area * 2 }; x : m^2 times=unknown x1000000')
    assert.equal(inferred('x = area\nif (population > 0) { x = area / 2 }\nx'), 'x = area; if (population > 0) { x = area / 2 }; x : m^2 times=unknown x1000000')
})

void test('a vector is of the kind of what is in it', () => {
    assert.equal(inferred('[high_temp, low_temp]'), '[high_temp, low_temp] : F^1 times=1 x1')
    assert.equal(inferred('[population, area]'), '[population, area] : unknown')
    // two temperatures are not one, so either of them and one of them is neither, and unwritable
    assert.equal(inferred('[high_temp, high_temp + high_temp]'), '[high_temp, high_temp + high_temp] : F^1 times=unknown x1')
    assert.ok(!writable('[high_temp, high_temp + high_temp]'))
    // as is a temperature or a difference of two, where an area or a difference of two is an area
    assert.ok(!writable('if (population > 0) { high_temp } else { high_temp - low_temp }'))
    assert.ok(writable('if (population > 0) { area } else { area - area }'))
})

// What each built-in makes of a quantity it is given, which each one says for itself
for (const [code, expected] of [
    ['abs(high_temp - low_temp)', 'abs(high_temp - low_temp) : F^1 times=0 x1'],
    ['round(population)', 'round(population) : person^1 times=1 x1'],
    ['nanTo0(density_pw_1km)', 'nanTo0(density_pw_1km) : m^-2 person^1 times=unknown x0.000001'],
    ['sqrt(area)', 'sqrt(area) : m^1 times=1 x1000'],
    ['min(high_temp)', 'min(high_temp) : F^1 times=1 x1'],
    ['mean(density_pw_1km, weight=population)', 'mean(density_pw_1km, weight=population) : m^-2 person^1 times=1 x0.000001'],
    ['median(population)', 'median(population) : person^1 times=1 x1'],
    ['quantile(population, 0.5)', 'quantile(population, 0.5) : person^1 times=1 x1'],
    ['percentile(area, 90)', 'percentile(area, 90) : m^2 times=1 x1000000'],
    ['maximum(population, population)', 'maximum(population, population) : person^1 times=1 x1'],
    // the larger of a population and an area is a population, the area being read as so many people
    ['maximum(population, area)', 'maximum(population, area * 1) : person^1 times=1 x1'],
    ['inverseQuantile(population, population)', 'inverseQuantile(population, population) : dimensionless times=1 x1'],
    ['sign(population)', 'sign(toNumber(population)) : dimensionless times=1 x1'],
    // a function that states no rule says any quantity at all, rather than none
    ['rgb(0.1, 0.2, 0.3)', 'rgb(0.1, 0.2, 0.3) : unknown'],
    ['toNumber(population)', 'toNumber(population) : unknown'],
    ['toNumber(population) + population', '(toNumber(population)) + population : person^1 times=1 x1'],
] as const) {
    void test(code, () => {
        assert.equal(inferred(code), expected)
    })
}

void test('the size of a reading is no reading, where the size of a difference is a difference', () => {
    // ten degrees below freezing is one number in Fahrenheit and another in Celsius
    assert.equal(inferred('abs(high_temp)'), 'abs(high_temp) : F^1 times=unknown x1')
    assert.ok(!writable('abs(high_temp)'))
    assert.equal(inferred('abs(high_temp - low_temp)'), 'abs(high_temp - low_temp) : F^1 times=0 x1')
    assert.ok(writable('abs(high_temp - low_temp)'))
    // as is putting a zero in for a missing reading, that zero being wherever the scale puts it
    assert.equal(inferred('nanTo0(high_temp)'), 'nanTo0(high_temp) : F^1 times=unknown x1')
    assert.equal(inferred('nanTo0(high_temp - low_temp)'), 'nanTo0(high_temp - low_temp) : F^1 times=0 x1')
})

void test('a rank is of two of one kind, and is a number of none', () => {
    assert.equal(inferred('inverseQuantile(population, population)'), 'inverseQuantile(population, population) : dimensionless times=1 x1')
    assert.equal(inferred('inversePercentile(high_temp, low_temp)'), 'inversePercentile(high_temp, low_temp) : dimensionless times=1 x1')
    // and a population ranks among areas read as populations, as it adds to one
    assert.equal(inferred('inverseQuantile(population, area)'), 'inverseQuantile(population, area * 1) : dimensionless times=1 x1')
})

void test('a larger of a quantity and a bare number is that quantity', () => {
    // as a sum of one and the other is, only alike things being comparable in the first place
    assert.equal(inferred('maximum(high_temp, 80)'), 'maximum(high_temp, 80) : F^1 times=1 x1')
    assert.equal(inferred('minimum(area, 100)'), 'minimum(area, 100) : m^2 times=1 x1000000')
    assert.equal(inferred('maximum(0.05, commute_bike)'), 'maximum(0.05, commute_bike) : dimensionless times=1 x1')
    // two bare numbers stay bare, no unit being known of either
    assert.equal(inferred('maximum(1, 2)'), 'maximum(1, 2) : unknown')
    // and the larger of a population and an area is a population, as their sum is
    assert.equal(inferred('maximum(population, area)'), 'maximum(population, area * 1) : person^1 times=1 x1')
    assert.equal(inferred('maximum(population + area, population)'), 'maximum(population + area * 1, population) : person^1 times=unknown x1')
})

void test('a total is as many of them as there were, which is not a number anyone knows', () => {
    assert.equal(inferred('sum(population)'), 'sum(population) : person^1 times=unknown x1')
    // so many people are people all the same, where so many temperatures are no temperature
    assert.ok(writable('sum(population)'))
    assert.equal(inferred('sum(high_temp)'), 'sum(high_temp) : F^1 times=unknown x1')
    assert.ok(!writable('sum(high_temp)'))
    // a mean of them is one of them again, and a total of differences is a difference
    assert.ok(writable('mean(high_temp)'))
    assert.equal(inferred('sum(high_temp - low_temp)'), 'sum(high_temp - low_temp) : F^1 times=0 x1')
})

void test('a logarithm takes whatever it is given and gives a number of no kind', () => {
    assert.equal(inferred('ln(density_pw_1km)'), 'ln(toNumber(density_pw_1km)) : dimensionless times=1 x1')
    assert.equal(inferred('log10(area)'), 'log10(toNumber(area)) : dimensionless times=1 x1')
    assert.equal(inferred('sin(population)'), 'sin(toNumber(population)) : dimensionless times=1 x1')
    // being of no kind, it scales what it multiplies rather than adding a dimension to it
    assert.equal(inferred('ln(population) * area'), '(ln(toNumber(population))) * area : m^2 times=1 x1000000')
})

void test('a name the script bound is that name, not the built-in it hides', () => {
    assert.equal(inferred('sqrt = population\nsqrt'), 'sqrt = population; sqrt : person^1 times=1 x1')
})

void test('a regression is read field by field', () => {
    const people = 'regr = regression(y=population, x1=area)\n'
    // the intercept is in the units of what was regressed, and the residuals are a difference of those
    assert.equal(inferred(`${people}regr.b`), 'regr = regression(y=population, x1=area); regr.b : person^1 times=1 x1')
    assert.equal(inferred(`${people}regr.residuals`), 'regr = regression(y=population, x1=area); regr.residuals : person^1 times=0 x1')
    // a coefficient is that difference over a difference of its parameter: people per square kilometre
    assert.equal(inferred(`${people}regr.m1`), 'regr = regression(y=population, x1=area); regr.m1 : m^-2 person^1 times=unknown x0.000001')
    assert.equal(inferred(`${people}regr.r2`), 'regr = regression(y=population, x1=area); regr.r2 : dimensionless times=1 x1')
    // and of a temperature, degrees per square kilometre, a difference of them being what multiplies
    assert.equal(inferred('regr = regression(y=high_temp, x1=area)\nregr.m1'), 'regr = regression(y=high_temp, x1=area); regr.m1 : F^1 m^-2 times=unknown x0.000001')
    assert.equal(inferred(`${people}regr.nonesuch`), 'regr = regression(y=population, x1=area); regr.nonesuch : unknown')
})

void test('a regression says nothing of a parameter it cannot read', () => {
    // a share over a logarithm is a number of neither kind, the logarithm being of no kind at all
    assert.equal(inferred('regr = regression(y=commute_bike, x1=ln(population))\nregr.m1'), 'regr = regression(y=commute_bike, x1=ln(toNumber(population))); regr.m1 : dimensionless times=unknown x1')
    // where a parameter nothing is known of leaves the coefficient unknown too
    assert.equal(inferred('regr = regression(y=commute_bike, x1=rgb(0, 0, 0))\nregr.m1'), 'regr = regression(y=commute_bike, x1=rgb(0, 0, 0)); regr.m1 : unknown')
    // and one of no dependent variable is a regression in name only
    assert.equal(inferred('regr = regression(x1=area)\nregr.b'), 'regr = regression(x1=area); regr.b : unknown')
})

void test('a unit expected of the whole script is what its bare numbers are read as', () => {
    // there is nothing else to read them from, where a script is a number and nothing more
    assert.equal(inferred('100', unitOf('area')), '100 : m^2 times=1 x1000000')
    assert.equal(inferred('100', unitOf('high_temp')), '100 : F^1 times=1 x1')
    assert.equal(inferred('0.1', unitOf('commute_bike')), '0.1 : dimensionless times=1 x1')
    // and is pushed down to wherever a number is written, as the unit of anything else would be
    assert.equal(inferred('maximum(100, 200)', unitOf('area')), 'maximum(100, 200) : m^2 times=1 x1000000')
    assert.equal(inferred('[100, 200]', unitOf('area')), '[100, 200] : m^2 times=1 x1000000')
    assert.equal(inferred('if (population > 0) { 100 } else { 200 }', unitOf('area')),
        'if (population > 0) { 100 } else { 200 } : m^2 times=1 x1000000')
})

void test('a unit expected of the whole script gives way to one the script knows', () => {
    // what a statistic is counted in is not up to whoever is reading the script
    assert.equal(inferred('population', unitOf('area')), 'population : person^1 times=1 x1')
    assert.equal(inferred('area / 2', unitOf('high_temp')), 'area / 2 : m^2 times=0.5 x1000000')
    // nor does it reach past a call that gives a plain number back
    assert.equal(inferred('ln(100)', unitOf('area')), 'ln(100) : dimensionless times=1 x1')
})

void test('what cannot be read comes back as anything, rather than throwing', () => {
    assert.equal(inferred('someFunctionOrOther(population)'), 'someFunctionOrOther(population) : unknown')
    assert.equal(inferred('"a string"'), '"a string" : unknown')
    assert.equal(inferred('rampUridis'), 'rampUridis : unknown')
    assert.equal(inferred('12'), '12 : unknown 12')
    assert.equal(inferred('population > area'), 'population > area : unknown')
    assert.equal(inferred(''), ' : unknown')
    // code that does not parse is code all the same, and reading it says nothing rather than failing
    assert.equal(inferred('population +'), 'population + : unknown')
})
