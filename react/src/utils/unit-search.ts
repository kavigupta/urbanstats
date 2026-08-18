import { assert } from './defensive'
import { atom, HumanReadableElement } from './human-readable-name'
import type { BaseUnit, Dimension, Representation } from './quantity'
import { formatNumber, NumberFormat } from './text'

/**
 * One of the units a quantity can be written in: a named scaling of some dimensions. Most are a
 * scaling of a single base unit, but one that is its own thing rather than a power of another,
 * such as an acre, is one of these too.
 */
interface NamedUnit {
    name: string
    /** What one of it is, e.g., m^2 for an acre */
    dimensions: Dimension[]
    /** How many base units one of it is: a thousand people is a thousand of them */
    size: number
    /**
     * What reaching for it costs, before the digits it saves. Zero for the unit a quantity is
     * ordinarily counted in, and more for one that only earns its place by shortening the number.
     */
    cost: number
}

/** An abbreviation is a unit of its own only in the sense that it saves digits. */
const abbreviated = 1

function scaling(baseUnit: BaseUnit, name: string, size: number, cost: number): NamedUnit {
    return { name, dimensions: [{ baseUnit, power: 1 }], size, cost }
}

/** Thousands, millions and billions, for a quantity that is counted rather than measured. */
function abbreviationsOf(baseUnit: BaseUnit): NamedUnit[] {
    return ([['k', 1e3], ['m', 1e6], ['B', 1e9]] as const)
        .map(([name, size]) => scaling(baseUnit, name, size, abbreviated))
}

/** The units there are to write a quantity in, whatever dimensions it turns out to have. */
const unitPool: NamedUnit[] = [
    scaling('person', '', 1, 0),
    ...abbreviationsOf('person'),
    scaling('usd', '', 1, 0),
    ...abbreviationsOf('usd'),
    // fatalities are not abbreviated: there are never enough of them for it to save a digit
    scaling('fatality', '', 1, 0),
]

type DimensionKey = string

function renderAsKey(scales: Dimension[]): DimensionKey {
    return scales
        .filter(({ power }) => power !== 0)
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .sort((a, b) => a.localeCompare(b))
        .join(' ')
}

/**
 * Certain dimensionfull units have specific styles.
 */
const styles: Record<DimensionKey, NumberFormat | undefined> = {
    '': { kind: 'significantFigures' },
    // things that are counted come in whole numbers, unless they are counted in thousands
    'person^1': { kind: 'fixed', places: 0 },
    'usd^1': { kind: 'fixed', places: 0 },
    'fatality^1': { kind: 'fixed', places: 0 },
}

const defaultStyle: NumberFormat = { kind: 'rounded', significantDigits: 3 }
/** An abbreviated number is worth three figures, wherever they fall. */
const abbreviatedStyle: NumberFormat = { kind: 'significantFigures' }

const prefixes: Record<DimensionKey, string | undefined> = { 'usd^1': '$' }

/** A unit a quantity is written in, and the power it is written to. */
interface Written {
    unit: NamedUnit
    power: number
}

function styleFor(key: DimensionKey, written: Written[]): NumberFormat {
    if (written.some(({ unit }) => unit.cost === abbreviated)) {
        return abbreviatedStyle
    }
    return styles[key] ?? defaultStyle
}

/**
 * What a number costs to read in a given unit: one for every digit past the third before the
 * point, and nine tenths of one for the point itself and each leading zero after it. The number is
 * written out to count it, so that a value that rounds up into another unit, such as 999.5 thousand
 * people, costs what a million costs rather than what nine hundred thousand costs.
 */
function digitCost(value: number, format: NumberFormat): number {
    if (value === 0) {
        // nothing is shorter than zero in any unit
        return 0
    }
    // the digits alone: neither the sign nor the separators between them make it harder to read
    const written = formatNumber(value, format).replaceAll('-', '').replaceAll('\u202f', '')
    const [integerPart, fraction = ''] = written.split('.')
    if (integerPart !== '0') {
        return Math.max(0, integerPart.length - 3)
    }
    // a shade less than a digit, since a number below one reads a little better than a long one
    return 0.9 * (1 + (/^0*/.exec(fraction)?.[0].length ?? 0))
}

/** The name a quantity is written under, which a count has only when it is abbreviated. */
function nameOf(written: Written[]): HumanReadableElement[] {
    const names = written.map(({ unit }) => unit.name).filter(name => name !== '')
    return names.length === 0 ? [] : atom(names.join('\u00b7'))
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
function coverings(needed: Exponents, settled: BaseUnit[] = []): Written[][] {
    const entries = Object.entries(needed) as [BaseUnit, number][]
    const next = entries.find(([baseUnit, power]) => power !== 0 && !settled.includes(baseUnit))
    if (next === undefined) {
        return [[]]
    }
    const [baseUnit, power] = next
    return unitPool.flatMap((unit) => {
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
        return coverings(rest, [...settled, baseUnit]).map(tail => [{ unit, power: times }, ...tail])
    })
}

/**
 * The best way of writing a value of these dimensions: of every combination of units from the
 * ladders of the base units it is measured in, the one that costs least once the number it leaves
 * behind is counted.
 */
export function bestRepresentation(inBaseUnits: number, scales: Dimension[]): Representation {
    const key = renderAsKey(scales)
    let best: Representation | undefined
    let bestCost = Infinity
    for (const written of coverings(exponentsOf(scales))) {
        const format = styleFor(key, written)
        const size = written.reduce((product, { power, unit }) => product * Math.pow(unit.size, power), 1)
        const scale = (value: number): number => value / size
        const cost = written.reduce((total, { power, unit }) => total + unit.cost * Math.abs(power), 0)
            + digitCost(scale(inBaseUnits), format)
        if (cost < bestCost) {
            best = { scale, unitName: nameOf(written), format, prefix: prefixes[key] }
            bestCost = cost
        }
    }
    assert(best !== undefined, 'every quantity has at least one way of being written')
    return best
}
