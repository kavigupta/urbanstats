import assert from 'assert/strict'
import test from 'node:test'

import { dimensionless, sameDimensions, StoredUnit, unitPower, unitProduct } from '../src/utils/quantity'
import { storedUnits } from '../src/utils/unit'

function shape(stored: StoredUnit | undefined): string {
    if (stored === undefined) return 'none'
    const written = [...stored.unit.dimensions]
        .sort((a, b) => a.baseUnit.localeCompare(b.baseUnit))
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .join(' ')
    return `${written === '' ? 'dimensionless' : written} x${stored.toBaseUnits}`
}

void test('a product adds the dimensions and multiplies what they are stored in', () => {
    assert.equal(shape(unitProduct(storedUnits.density, storedUnits.area, 1)), 'person^1 x1')
    assert.equal(shape(unitProduct(storedUnits.population, storedUnits.area, 1)), 'm^2 person^1 x1000000')
})

void test('a quotient subtracts them', () => {
    assert.equal(shape(unitProduct(storedUnits.population, storedUnits.area, -1)), 'm^-2 person^1 x0.000001')
    assert.equal(shape(unitProduct(storedUnits.fatalities, storedUnits.population, -1)), 'fatality^1 person^-1 x1')
})

void test('dimensions that cancel are gone rather than left at nothing', () => {
    assert.equal(shape(unitProduct(storedUnits.population, storedUnits.population, -1)), 'dimensionless x1')
    assert.equal(shape(unitProduct(storedUnits.distanceInKm, storedUnits.distanceInM, -1)), 'dimensionless x1000')
})

void test('a power raises the dimensions and the scale together', () => {
    assert.equal(shape(unitPower(storedUnits.distanceInKm, 2)), 'm^2 x1000000')
    assert.equal(shape(unitPower(storedUnits.distanceInKm, -1)), 'm^-1 x0.001')
    assert.equal(shape(unitPower(storedUnits.population, 0)), 'dimensionless x1')
})

void test('two quantities of the same kind can be told from two of different kinds', () => {
    assert.ok(sameDimensions(storedUnits.distanceInKm, storedUnits.distanceInM))
    assert.ok(sameDimensions(storedUnits.number, dimensionless))
    assert.ok(!sameDimensions(storedUnits.population, storedUnits.fatalities))
    assert.ok(!sameDimensions(storedUnits.area, storedUnits.distanceInM))
})

void test('two temperatures are the same kind of thing, so one can be taken from the other', () => {
    assert.ok(sameDimensions(storedUnits.temperature, storedUnits.temperature))
    assert.ok(!sameDimensions(storedUnits.temperature, storedUnits.number))
})

void test('a quantity measured from its own zero cannot be multiplied or raised', () => {
    assert.equal(shape(unitProduct(storedUnits.temperature, storedUnits.population, 1)), 'none')
    assert.equal(shape(unitProduct(storedUnits.population, storedUnits.temperature, -1)), 'none')
    assert.equal(shape(unitPower(storedUnits.temperature, 2)), 'none')
})

void test('what a statistic is written in does not survive being computed with', () => {
    assert.equal(unitProduct(storedUnits.population, storedUnits.area, -1)?.unit.decoration.kind, 'none')
    assert.equal(storedUnits.density.unit.decoration.kind, 'writtenIn')
})

void test('a power that comes back a hair off a whole one is the whole one', () => {
    // a cube raised to a tenth and then to ten is 3.0000000000000004 of a meter, which is no unit
    const cube = storedUnits.contaminantLevel
    const roundTrip = unitPower(unitPower(cube, 0.1)!, 10)!
    assert.ok(sameDimensions(roundTrip, cube))
    // the scale it is stored in comes back a hair off too, which is below anything a rendering shows
    assert.ok(Math.abs(roundTrip.toBaseUnits / cube.toBaseUnits - 1) < 1e-12)
})
