import { assert } from './defensive'
import type { BaseUnit, Dimension, NamedUnit } from './quantity'
import { formatNumber, NumberFormat } from './text'

export interface Written {
    unit: NamedUnit
    power: number
}

/** Rounding a quantity away, where the style asked for figures, is worse than any number of digits. */
const roundsAway = 100

/**
 * What a number costs to read in a given unit: a digit for every one past the three that three
 * significant figures fit in, wherever they fall. A number below one pays for its leading zeros,
 * which are digits like any other, and a unit that leaves a quantity with no figures at all pays
 * everything.
 *
 * Counted from the number as printed rather than from a logarithm, so that a value that rounds up
 * into another unit, such as 999.5 thousand people, costs what a million costs.
 */
function digitCost(value: number, format: NumberFormat): number {
    const digits = formatNumber(value, format).replace(/[^0-9]/g, '')
    // a fixed number of places is a decision that the places past them do not matter, so a value
    // that rounds away under one is being written as precisely as it was meant to be
    if (value !== 0 && format.kind !== 'fixed' && !/[1-9]/.test(digits)) {
        return roundsAway
    }
    return Math.max(0, digits.length - 3)
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
    const entries = Object.entries(needed) as [BaseUnit, number][]
    const next = entries.find(([baseUnit, power]) => power !== 0 && !settled.includes(baseUnit))
    if (next === undefined) {
        return [[]]
    }
    const [baseUnit, power] = next
    return pool.flatMap((unit) => {
        const covers = exponentsOf(unit.dimensions)[baseUnit] ?? 0
        // it has to take this base unit's exponent to exactly zero, and leave the settled ones be
        if (covers === 0 || power % covers !== 0 || unit.dimensions.some(dimension => settled.includes(dimension.baseUnit))) {
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

/**
 * The cheapest way of writing a value of these dimensions: of every way of covering them with
 * units from the pool, the one that costs least once the number it leaves behind is counted.
 */
export function chooseUnits(
    inBaseUnits: number,
    scales: Dimension[],
    pool: NamedUnit[],
    styleFor: (written: Written[]) => NumberFormat,
): { written: Written[], size: number, format: NumberFormat } {
    let best: { written: Written[], size: number, format: NumberFormat } | undefined
    let bestCost = Infinity
    for (const written of coverings(exponentsOf(scales), pool)) {
        const format = styleFor(written)
        const size = written.reduce((product, { power, unit }) => product * Math.pow(unit.size, power), 1)
        const cost = written.reduce((total, { power, unit }) => total + unit.cost * Math.abs(power), 0)
            + digitCost(inBaseUnits / size, format)
        if (cost < bestCost) {
            best = { written, size, format }
            bestCost = cost
        }
    }
    assert(best !== undefined, 'every quantity has at least one way of being written')
    return best
}
