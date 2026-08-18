import { assert } from './defensive'
import type { BaseUnit, Dimension, NamedUnit } from './quantity'
import { formatNumber, NumberFormat } from './text'

export interface Written {
    unit: NamedUnit
    power: number
}

/**
 * What a number costs to read in a given unit: how far its magnitude is from the range three
 * significant figures fit in, which is one to a thousand. A factor of ten above that costs a
 * digit, and one below costs nine tenths of a digit, a number just under one reading a little
 * easier than a long one.
 *
 * The places after the point are not counted. At three significant figures they are what a shorter
 * integer part buys: a million people reads as 1 000k, a digit past the third, or as 1.00m, which
 * spends two places to save that digit. Charging for both would leave the trade never worth
 * making, and nothing would ever be abbreviated.
 *
 * Measured from the number as printed rather than from a logarithm, so that a value that rounds up
 * into another unit, such as 999.5 thousand people, costs what a million costs.
 */
function digitCost(value: number, format: NumberFormat): number {
    if (value === 0) {
        // nothing is shorter than zero in any unit
        return 0
    }
    // the digits alone: neither the sign nor the separators between them make it harder to read
    const written = formatNumber(value, format).replaceAll('-', '').replaceAll('\u202f', '')
    const [integerPart, fraction = ''] = written.split('.')
    // where the magnitude shows up: in the digits before the point, or in the zeros after it
    if (integerPart !== '0') {
        return Math.max(0, integerPart.length - 3)
    }
    // a shade less than a digit, since a number below one reads a little better than a long one
    return 0.9 * (1 + (/^0*/.exec(fraction)?.[0].length ?? 0))
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
