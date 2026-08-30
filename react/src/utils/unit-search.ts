import { assert } from './defensive'
import type { BaseUnit, Dimension, NamedUnit } from './quantity'
import { formatNumber, NumberFormat } from './text'

export interface Written {
    unit: NamedUnit
    power: number
}

const artificialZeroCost = 100

/**
 * We charge 1 for every digit as printed, with two adjustments:
 * - a number rounded away to 0 is heavily penalized, unless in fixed point
 * - every leading 0 past the decimal point is charged as another digit
 */
function digitCost(value: number, format: NumberFormat): number {
    const written = formatNumber(value, format)
    const digits = written.replace(/[^0-9]/g, '')
    if (value !== 0 && format.kind !== 'fixed' && !/[1-9]/.test(digits)) {
        return artificialZeroCost
    }
    return digits.length + (/^-?0\.(0*)[1-9]/.exec(written)?.[1].length ?? 0)
}

type Exponents = Partial<Record<BaseUnit, number>>

function exponentsOf(dimensions: Dimension[]): Exponents {
    const exponents: Exponents = {}
    for (const { baseUnit, power } of dimensions) {
        exponents[baseUnit] = (exponents[baseUnit] ?? 0) + power
    }
    return exponents
}

/**
 * Every way of writing these dimensions as a product of units from the pool. A unit may be used to
 * a power, so that a length covers an area, and one that spans several base units covers all of
 * them at once. Base units are taken in turn and settled outright, so a unit that would reopen one
 * already settled is not offered -- which also keeps the search from going round in circles.
 */
function coverings(needed: Exponents, pool: NamedUnit[], settled: BaseUnit[] = []): Written[][] {
    const entries = Object.entries(needed).filter(
        ([baseUnit, power]) => (power ?? 0) !== 0 && !settled.includes(baseUnit),
    ).sort(([baseUnitA], [baseUnitB]) => baseUnitA.localeCompare(baseUnitB))
    if (entries.length === 0) {
        return [[]]
    }
    const [baseUnit, power] = entries[0]
    assert(power !== undefined, 'we filtered out undefined powers')
    return pool.flatMap((unit) => {
        const covers = exponentsOf(unit.dimensions)[baseUnit] ?? 0
        // A unit of one that goes unnamed can be taken to any power at all, contributing neither a
        // name nor a scale: half of a person is what a root of a count is counted in.
        const anyPowerWillDo = unit.name === '' && unit.size === 1
        // it has to take this base unit's exponent to exactly zero, and leave the settled ones be
        if (covers === 0 || (power % covers !== 0 && !anyPowerWillDo) || unit.dimensions.some(dimension => settled.includes(dimension.baseUnit))) {
            return []
        }
        const times = power / covers
        const rest = { ...needed }
        for (const dimension of unit.dimensions) {
            rest[dimension.baseUnit] = (rest[dimension.baseUnit] ?? 0) - times * dimension.power
        }
        return coverings(rest, pool, [...settled, baseUnit]).map(tail => [{ unit, power: times }, ...tail])
    })
}

function scaledBy(written: Written[]): (value: number) => number {
    return value => written.reduce((scaled, { unit, power }) => scaled / Math.pow(unit.size, power), value)
}

/**
 * The way of writing these dimensions in which one of the unit is exactly one -- the unit a stored
 * value is counted in, rather than whichever unit its magnitude reads best in.
 */
export function writtenAsCounted(scales: Dimension[], pool: NamedUnit[], oneInBaseUnits: number): Written[] | undefined {
    for (const written of coverings(exponentsOf(scales), pool)) {
        if (Math.abs(scaledBy(written)(oneInBaseUnits) - 1) < 1e-9) {
            return written
        }
    }
    return undefined
}

/**
 * The cheapest way of writing a value of these dimensions
 */
export function chooseUnits(
    inBaseUnits: number,
    scales: Dimension[],
    pool: NamedUnit[],
    styleFor: (written: Written[]) => NumberFormat,
): { written: Written[], scale: (value: number) => number, format: NumberFormat } {
    let best: { written: Written[], scale: (value: number) => number, format: NumberFormat } | undefined
    let bestCost = Infinity
    for (const written of coverings(exponentsOf(scales), pool)) {
        const format = styleFor(written)
        const scale = scaledBy(written)
        const cost = written.reduce((total, { power, unit }) => total + unit.cost * Math.abs(power), 0)
            + Math.max(0, digitCost(scale(inBaseUnits), format) - 3)
        if (cost < bestCost) {
            best = { written, scale, format }
            bestCost = cost
        }
    }
    assert(best !== undefined, 'every quantity has at least one way of being written')
    return best
}
