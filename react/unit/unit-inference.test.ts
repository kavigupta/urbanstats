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
    // read again, since what the pass wrote in has to give the same answer
    return unitWithin({ type: 'customNode', entireLoc: noLocation, expr: checked.ast, originalCode: code }, typeEnvironment, checked.named, expected)
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
    // a temperature is raised from its own zero, so that zero comes out first
    assert.equal(inferred('(high_temp * 2) ** 0.5'), '(high_temp * 2 - 0) ** 0.5 : F^0.5 times=0 x1')
})

void test('a sum of two unlike kinds is read with the factor between them written in', () => {
    // people and an area add when the area is read as so many people, making the sum two of them
    assert.equal(inferred('population + area'), 'population + area * 1 : person^1 times=2 x1')
    assert.equal(inferred('(population + area) / area'), '(population + area * 1) / area : m^-2 person^1 times=2 x0.000001')
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
    assert.equal(inferred('if (population > 0) { population } else { area }'), 'if (population > 0) { population } else { area * 1 } : person^1 times=1 x1')
    // an arm with no counterpart writes where its mask holds and nothing where it does not
    assert.equal(inferred('if (population > 0) { high_temp }'), 'if (population > 0) { high_temp } : F^1 times=1 x1')
})

void test('a name an arm binds is bound outside it', () => {
    assert.equal(inferred('if (population > 0) { x = area }\nx'), 'if (population > 0) { x = area }; x : m^2 times=1 x1000000')
    assert.equal(inferred('if (population > 0) { x = area } else { x = population }\nx'), 'if (population > 0) { x = area } else { x = population * 1 }; x : m^2 times=1 x1000000')
    // where the arm that did not run left it as it was
    assert.equal(inferred('x = area\nif (population > 0) { x = area * 2 }\nx'), 'x = area; if (population > 0) { x = area * 2 }; x : m^2 times=unknown x1000000')
    assert.equal(inferred('x = area\nif (population > 0) { x = area / 2 }\nx'), 'x = area; if (population > 0) { x = area / 2 }; x : m^2 times=unknown x1000000')
})

void test('a vector is of the kind of what is in it', () => {
    assert.equal(inferred('[high_temp, low_temp]'), '[high_temp, low_temp] : F^1 times=1 x1')
    assert.equal(inferred('[population, area]'), '[population, area * 1] : person^1 times=1 x1')
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
    // the larger of a population and an area is a population: the area is read as so many people
    ['maximum(population, area)', 'maximum(population, area * 1) : person^1 times=1 x1'],
    ['inverseQuantile(population, population)', 'inverseQuantile(population, population) : dimensionless times=1 x1'],
    ['sign(population)', 'sign(population) : dimensionless times=1 x1'],
    // a function that states no rule says any quantity at all, rather than none
    ['rgb(0.1, 0.2, 0.3)', 'rgb(0.1, 0.2, 0.3) : unknown'],
    ['toNumber(population)', 'population : person^1 times=1 x1'],
    ['toNumber(population) + population', 'population + population : person^1 times=2 x1'],
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
    // and a population ranks among areas the same way
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
    assert.equal(inferred('ln(density_pw_1km)'), 'ln(density_pw_1km) : dimensionless times=1 x1')
    assert.equal(inferred('log10(area)'), 'log10(area) : dimensionless times=1 x1')
    assert.equal(inferred('sin(population)'), 'sin(population) : dimensionless times=1 x1')
    // being of no kind, it scales what it multiplies rather than adding a dimension to it
    assert.equal(inferred('ln(population) * area'), '(ln(population)) * area : m^2 times=1 x1000000')
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
    // and a share over a logarithm is dimensionless: neither is counted in anything
    assert.equal(inferred('regr = regression(y=commute_bike, x1=ln(population))\nregr.m1'), 'regr = regression(y=commute_bike, x1=ln(population)); regr.m1 : dimensionless times=unknown x1')
    assert.equal(inferred(`${people}regr.nonesuch`), 'regr = regression(y=population, x1=area); regr.nonesuch : unknown')
})

void test('a regression says nothing of a parameter it cannot read', () => {
    // a parameter nothing is known of leaves the coefficient unknown
    assert.equal(inferred('regr = regression(y=commute_bike, x1=rgb(0, 0, 0))\nregr.m1'), 'regr = regression(y=commute_bike, x1=rgb(0, 0, 0)); regr.m1 : unknown')
    // and one of no dependent variable is a regression in name only
    assert.equal(inferred('regr = regression(x1=area)\nregr.b'), 'regr = regression(x1=area); regr.b : unknown')
})

void test('a factor is written beside the right of an operation, and beside no other side', () => {
    assert.equal(inferred('population + area'), 'population + area * 1 : person^1 times=2 x1')
    assert.equal(inferred('area + population'), 'area + population * 1 : m^2 times=2 x1000000')
    // a difference of two is a difference; a comparison has no unit of its own
    assert.equal(inferred('population - area'), 'population - area * 1 : person^1 times=0 x1')
    assert.equal(inferred('population < area'), 'population < area * 1 : unknown')
    assert.equal(inferred('area >= population'), 'area >= population * 1 : unknown')
})

void test('a literal already written is read for what it must be, rather than one being added', () => {
    // the 2 of area * 2 is read as two people per square kilometre, which makes the sum work
    assert.equal(inferred('population + area * 2'), 'population + area * 2 : person^1 times=unknown x1')
    assert.equal(inferred('population + area / 2'), 'population + area / 2 : person^1 times=unknown x1')
    // where there is no literal to read, one is written in
    assert.equal(inferred('population + sqrt(area)'), 'population + (sqrt(area)) * 1 : person^1 times=2 x1')
    // a share is dimensionless and a count is people, so a factor separates them
    assert.equal(inferred('commute_bike + population'), 'commute_bike + population * 1 : dimensionless times=2 x1')
})

void test('a factor is written wherever an operation wants one, however many that is', () => {
    assert.equal(inferred('population + area + area'), 'population + area * 1 + area * 1 : person^1 times=3 x1')
    assert.equal(inferred('population * 2 + area'), 'population * 2 + area * 1 : person^1 times=3 x1')
    assert.equal(inferred('(population + area) * 2'), '(population + area * 1) * 2 : person^1 times=4 x1')
    // a name is worth what it was bound to, so the factor goes beside the name
    assert.equal(inferred('x = area\npopulation + x'), 'x = area; population + x * 1 : person^1 times=2 x1')
})

void test('an argument that has to be of a kind with another is made to be', () => {
    assert.equal(inferred('maximum(area, population)'), 'maximum(area, population * 1) : m^2 times=1 x1000000')
    assert.equal(inferred('minimum(population, area)'), 'minimum(population, area * 1) : person^1 times=1 x1')
    assert.equal(inferred('inverseQuantile(population, area)'), 'inverseQuantile(population, area * 1) : dimensionless times=1 x1')
})

void test('nothing is written in where the two sides already go together', () => {
    assert.equal(inferred('population + population'), 'population + population : person^1 times=2 x1')
    assert.equal(inferred('area / area'), 'area / area : dimensionless times=1 x1')
    assert.equal(inferred('high_temp + low_temp'), 'high_temp + low_temp : F^1 times=2 x1')
})

void test('the arms of an if and the elements of a vector are made to be of one kind', () => {
    // the first of them sets the unit when nothing else does
    assert.equal(inferred('[population, area, sunny_hours]'),
        '[population, area * 1, sunny_hours * 1] : person^1 times=1 x1')
    // an expected unit sets it instead, so the first is reconciled too
    assert.equal(inferred('[population, area]', unitOf('density_pw_1km')),
        '[population * 1, area * 1] : m^-2 person^1 times=1 x0.000001')
    assert.equal(inferred('if (population > 0) { population } else { area }', unitOf('density_pw_1km')),
        'if (population > 0) { population * 1 } else { area * 1 } : m^-2 person^1 times=1 x0.000001')
})

void test('a zero comes off a reading so that what wants to scale it can', () => {
    // an area of so many degrees is an area of a temperature difference
    assert.equal(inferred('high_temp * area'), '(high_temp - 0) * area : F^1 m^2 times=0 x1000000')
    assert.equal(inferred('area * high_temp'), 'area * (high_temp - 0) : F^1 m^2 times=0 x1000000')
    assert.equal(inferred('high_temp / area'), '(high_temp - 0) / area : F^1 m^-2 times=0 x0.000001')
    assert.equal(inferred('high_temp ** 2'), '(high_temp - 0) ** 2 : F^2 times=0 x1')
    assert.equal(inferred('high_temp ** 2 * area'), '(high_temp - 0) ** 2 * area : F^2 m^2 times=0 x1000000')
    assert.equal(inferred('sqrt(high_temp)'), 'sqrt(high_temp - 0) : F^0.5 times=0 x1')
    // a bare number scales the reading itself, which keeps its zero
    assert.equal(inferred('high_temp * 2'), 'high_temp * 2 : F^1 times=2 x1')
    assert.equal(inferred('(high_temp + low_temp) / 2'), '(high_temp + low_temp) / 2 : F^1 times=1 x1')
})

void test('a zero comes off a reading so that a factor has something to scale', () => {
    // a temperature is counted from its own zero, which does not scale; what is left once the
    // zero is out is a number of degrees, which does
    assert.equal(inferred('high_temp + population'), 'high_temp + (population - 0) * 1 : F^1 times=1 x1')
    assert.equal(inferred('population + high_temp'), 'population + (high_temp - 0) * 1 : person^1 times=1 x1')
    // a difference is already counted from nothing, so no zero comes off
    assert.equal(inferred('high_temp - low_temp + population'),
        'high_temp - low_temp + (population - 0) * 1 : F^1 times=0 x1')
    assert.equal(inferred('if (population > 0) { high_temp } else { area }'),
        'if (population > 0) { high_temp } else { (area - 0) * 1 + 0 } : F^1 times=1 x1')
})

// What a script works out to when the caller expects a unit of it. Whatever the script says is
// rewritten to be of that unit.
for (const [code, expected, reads] of [
    ['population + area', 'rainfall', 'population * 1 + (area - 0) * 1 : m^1 s^-1 times=1 x3.168808781402895e-8'],
    ['population + area', 'sunny_hours', 'population * 1 + (area - 0) * 1 : s^1 times=1 x3600'],
    ['population + area', 'density_pw_1km', 'population * 1 + (area - 0) * 1 : m^-2 person^1 times=1 x0.000001'],
    // a share is dimensionless, as a plain number is, so the sum is read as a plain number
    ['population + area', 'commute_bike', 'population * 1 + area : dimensionless times=1 x1'],
    // a temperature is counted from its own zero, which goes back on at the end
    ['population + area', 'high_temp', '(population - 0) * 1 + 0 + (area - 0) * 1 : F^1 times=1 x1'],
    // one statistic is rewritten into another's unit the same way
    ['population', 'rainfall', 'population * 1 : m^1 s^-1 times=1 x3.168808781402895e-8'],
    ['population', 'high_temp', '(population - 0) * 1 + 0 : F^1 times=1 x1'],
    ['population / area', 'density_pw_1km', 'population / area : m^-2 person^1 times=1 x0.000001'],
    ['population / area', 'sunny_hours', 'population / (area * 1) : s^1 times=1 x3600'],
    // a logarithm is dimensionless, so any unit at all is one factor away
    ['ln(population)', 'rainfall', '(ln(population)) * 1 : m^1 s^-1 times=1 x3.168808781402895e-8'],
    ['ln(population)', 'commute_bike', 'ln(population) : dimensionless times=1 x1'],
    // and a bare number is read as the unit itself
    ['100', 'rainfall', '100 : m^1 s^-1 times=1 x3.168808781402895e-8'],
    ['100', 'high_temp', '100 : F^1 times=1 x1'],
    ['100', 'density_pw_1km', '100 : m^-2 person^1 times=1 x0.000001'],
] as const) {
    void test(`${code} as ${expected}`, () => {
        assert.equal(inferred(code, unitOf(expected)), reads)
    })
}

void test('a unit expected of the whole script is what its bare numbers are read as', () => {
    // a script that is nothing but a number has nothing else to read it from
    assert.equal(inferred('100', unitOf('area')), '100 : m^2 times=1 x1000000')
    assert.equal(inferred('100', unitOf('high_temp')), '100 : F^1 times=1 x1')
    assert.equal(inferred('0.1', unitOf('commute_bike')), '0.1 : dimensionless times=1 x1')
    // and is pushed down to wherever a number is written
    assert.equal(inferred('maximum(100, 200)', unitOf('area')), 'maximum(100, 200) : m^2 times=1 x1000000')
    assert.equal(inferred('[100, 200]', unitOf('area')), '[100, 200] : m^2 times=1 x1000000')
    assert.equal(inferred('if (population > 0) { 100 } else { 200 }', unitOf('area')),
        'if (population > 0) { 100 } else { 200 } : m^2 times=1 x1000000')
})

void test('a unit expected of the whole script is what the script is made to be', () => {
    // a factor is written in wherever the script does not say what is expected
    assert.equal(inferred('population', unitOf('area')), 'population * 1 : m^2 times=1 x1000000')
    assert.equal(inferred('ln(100)', unitOf('area')), '(ln(100)) * 1 : m^2 times=1 x1000000')
    assert.equal(inferred('ln(density_pw_1km)', unitOf('area')),
        '(ln(density_pw_1km)) * 1 : m^2 times=1 x1000000')
    // a reading does not scale, so its zero comes out first and goes back on after, leaving two
    // things that do scale
    assert.equal(inferred('area / 2', unitOf('high_temp')), '(area / 2 - 0) * 1 + 0 : F^1 times=1 x1')
    assert.equal(inferred('high_temp', unitOf('area')), '(high_temp - 0) * 1 : m^2 times=0 x1000000')
})

void test('what cannot be read comes back as anything, rather than throwing', () => {
    assert.equal(inferred('someFunctionOrOther(population)'), 'someFunctionOrOther(population) : unknown')
    assert.equal(inferred('"a string"'), '"a string" : unknown')
    assert.equal(inferred('rampUridis'), 'rampUridis : unknown')
    assert.equal(inferred('12'), '12 : unknown 12')
    assert.equal(inferred('population > area'), 'population > area * 1 : unknown')
    assert.equal(inferred(''), ' : unknown')
    // code that does not parse is code all the same, and reading it says nothing rather than failing
    assert.equal(inferred('population +'), 'population + : unknown')
})
