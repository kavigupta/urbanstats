import { HueColors } from '../page_template/color-themes'

import { assert } from './defensive'
import { HumanReadableElement } from './human-readable-name'
import { formatToSignificantFigures, Rounding, roundToDigits, separateNumber } from './text'

export type Hue = keyof HueColors

type PartySystem = 'democratic' | 'left'

/**
 * The units everything else is measured in. A value is put in these before it is written out, so
 * that quantities of the same kind are written the same way however they happen to be stored.
 */
export type BaseUnit = 'person' | 'usd' | 'fatality'

/** A base unit raised to a power, e.g., people, or square meters. */
export interface Dimension {
    baseUnit: BaseUnit
    power: number
}

// Abstract interpretation of a quantity as a unit.
export type Unit = (
    { kind: 'raw-percentage', partyColor?: Hue }
    | { kind: 'delta-percentage', partyColor?: Hue }
    | { kind: 'lead-percentage', partySystem: PartySystem }
    | { kind: 'temperature-F' }
    | { kind: 'dimensionfull', scales: Dimension[] }
)

export interface StoredUnit {
    unit: Unit
    // e.g., a value stored in cm will have 0.01 for this field
    toBaseUnits: number
}

export interface ReaderSettings {
    useImperial?: boolean
    temperatureUnit?: string
}

export const missingValue = 'N/A'

/** How the number is written: to a fixed number of decimal places, or to a number of digits. */
type NumberFormat = (
    { kind: 'fixed', places: number }
    | ({ kind: 'rounded' } & Rounding)
    | { kind: 'significantFigures' }
)

interface Representation {
    /** E.g., for cm this is x => x * 100 */
    scale: (inBaseUnits: number) => number
    unitName: HumanReadableElement[]
    format: NumberFormat
    /** Written in front of the number, as a dollar sign is */
    prefix?: string
}

function atom(value: string): HumanReadableElement[] {
    return [{ type: 'atom', value }]
}

const percent: Representation = { unitName: atom('%'), scale: value => value * 100, format: { kind: 'fixed', places: 2 } }
/** A margin is written as the size of the lead, which is given more digits the closer it is. */
const margin: Representation = { ...percent, format: { kind: 'rounded', significantDigits: 3, minDecimals: 1, maxDecimals: 4 } }

const partyLabels = {
    democratic: { positive: 'D', negative: 'R' },
    // outside the US the left is drawn in red, and the right in blue
    left: { positive: 'L', negative: 'R' },
} as const

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
const partyHues = {
    democratic: { positive: 'blue', negative: 'red' },
    left: { positive: 'red', negative: 'blue' },
} as const
/* eslint-enable no-restricted-syntax */

/** One of the units a base unit can be written in, e.g., a million people. */
interface LadderUnit {
    name: string
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

/** The unit a quantity is counted in, which a count has no name of its own for. */
const itself: LadderUnit = { name: '', size: 1, cost: 0 }

/** Thousands, millions and billions, for a quantity that is counted rather than measured. */
const abbreviations: LadderUnit[] = [
    { name: 'k', size: 1e3, cost: abbreviated },
    { name: 'm', size: 1e6, cost: abbreviated },
    { name: 'B', size: 1e9, cost: abbreviated },
]

/**
 * The units each base unit can be written in. A quantity is written by choosing one of them for
 * each base unit it is measured in.
 */
const ladders: Record<BaseUnit, LadderUnit[]> = {
    person: [itself, ...abbreviations],
    usd: [itself, ...abbreviations],
    // fatalities are not abbreviated: there are never enough of them for it to save a digit
    fatality: [itself],
}

/** What the dimensions of a quantity are called when they are looked up in a table. */
function signatureOf(scales: Dimension[]): string {
    return scales
        .filter(({ power }) => power !== 0)
        .sort((a, b) => a.baseUnit < b.baseUnit ? -1 : 1)
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .join(' ')
}

/**
 * How the number is written once a unit has been chosen for it. Separate from the units: what a
 * quantity is measured in does not say how precisely it is worth writing.
 */
const styles: Record<string, NumberFormat | undefined> = {
    '': { kind: 'significantFigures' },
    // things that are counted come in whole numbers, unless they are counted in thousands
    'person^1': { kind: 'fixed', places: 0 },
    'usd^1': { kind: 'fixed', places: 0 },
    'fatality^1': { kind: 'fixed', places: 0 },
}

const defaultStyle: NumberFormat = { kind: 'rounded', significantDigits: 3 }
/** An abbreviated number is worth three figures, wherever they fall. */
const abbreviatedStyle: NumberFormat = { kind: 'significantFigures' }

const prefixes: Record<string, string | undefined> = { 'usd^1': '$' }

/** A base unit together with the unit off its ladder that a quantity is written in. */
interface Written extends Dimension {
    unit: LadderUnit
}

function styleFor(signature: string, written: Written[]): NumberFormat {
    if (written.some(({ unit }) => unit.cost === abbreviated)) {
        return abbreviatedStyle
    }
    return styles[signature] ?? defaultStyle
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

function combinations(dimensions: Dimension[]): Written[][] {
    if (dimensions.length === 0) {
        return [[]]
    }
    const [dimension, ...rest] = dimensions
    return ladders[dimension.baseUnit].flatMap(unit => combinations(rest).map(tail => [{ ...dimension, unit }, ...tail]))
}

/**
 * The best way of writing a value of these dimensions: of every combination of units from the
 * ladders of the base units it is measured in, the one that costs least once the number it leaves
 * behind is counted.
 */
function bestRepresentation(inBaseUnits: number, scales: Dimension[]): Representation {
    const signature = signatureOf(scales)
    let best: Representation | undefined
    let bestCost = Infinity
    for (const written of combinations(scales.filter(({ power }) => power !== 0))) {
        const format = styleFor(signature, written)
        const size = written.reduce((product, { power, unit }) => product * Math.pow(unit.size, power), 1)
        const scale = (value: number): number => value / size
        const cost = written.reduce((total, { power, unit }) => total + unit.cost * Math.abs(power), 0)
            + digitCost(scale(inBaseUnits), format)
        if (cost < bestCost) {
            best = { scale, unitName: nameOf(written), format, prefix: prefixes[signature] }
            bestCost = cost
        }
    }
    assert(best !== undefined, 'every quantity has at least one way of being written')
    return best
}

function representationFor(inBaseUnits: number, unit: Unit, settings: ReaderSettings): Representation {
    switch (unit.kind) {
        case 'raw-percentage':
        case 'delta-percentage':
            return percent
        case 'lead-percentage':
            return margin
        case 'temperature-F':
            return settings.temperatureUnit === 'celsius'
                ? { unitName: atom('°C'), scale: value => (value - 32) * (5 / 9), format: { kind: 'fixed', places: 1 } }
                : { unitName: atom('°F'), scale: value => value, format: { kind: 'fixed', places: 1 } }
        case 'dimensionfull':
            return bestRepresentation(inBaseUnits, unit.scales)
    }
}

function formatNumber(value: number, format: NumberFormat): string {
    switch (format.kind) {
        case 'fixed':
            return separateNumber(value.toFixed(format.places))
        case 'rounded':
            return roundToDigits(value, format)
        case 'significantFigures':
            return separateNumber(formatToSignificantFigures(value, 3))
    }
}

function getParty(partySystem: PartySystem, value: number): { label: string, hue: Hue } {
    const side = value > 0 ? 'positive' : 'negative'
    return { label: partyLabels[partySystem][side], hue: partyHues[partySystem][side] }
}

function hueFor(unit: Unit): Hue | undefined {
    switch (unit.kind) {
        case 'raw-percentage':
        case 'delta-percentage':
            return unit.partyColor
        case 'lead-percentage':
        case 'temperature-F':
        case 'dimensionfull':
            return undefined
    }
}

export interface WrittenQuantity {
    /** What the number reads as, a lead including its party and a plus, as in D+4.5 */
    renderedValue: string
    unitName: HumanReadableElement[]
    hue?: Hue
}

export function writeQuantity(value: number, stored: StoredUnit, settings: ReaderSettings = {}): WrittenQuantity {
    if (!isFinite(value)) {
        return { renderedValue: missingValue, unitName: [] }
    }
    const { unit } = stored
    let inBaseUnits = value * stored.toBaseUnits
    const representation = representationFor(inBaseUnits, unit, settings)
    let party = undefined
    if (unit.kind === 'lead-percentage') {
        party = getParty(unit.partySystem, inBaseUnits)
        inBaseUnits = Math.abs(inBaseUnits)
    }
    const explicitSign = unit.kind === 'delta-percentage' && inBaseUnits >= 0 ? '+' : ''
    const written = formatNumber(representation.scale(inBaseUnits), representation.format)
    return {
        renderedValue: `${party === undefined ? '' : `${party.label}+`}${explicitSign}${representation.prefix ?? ''}${written}`,
        unitName: representation.unitName,
        hue: party?.hue ?? hueFor(unit),
    }
}
