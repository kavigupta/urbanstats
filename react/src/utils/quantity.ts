import { HueColors } from '../page_template/color-themes'

import { atom, HumanReadableElement } from './human-readable-name'
import { formatNumber, NumberFormat } from './text'
import { chooseUnits, Written } from './unit-search'

export type Hue = keyof HueColors

type PartySystem = 'democratic' | 'left'

/**
 * Base units, combined together via multiplication to form the units that correspond to the inBaseUnits value
 */
export type BaseUnit = 'person' | 'usd' | 'fatality' | 'm' | 'g' | 's'

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

/** How a quantity is written: what to scale it by, what to call the result, and to how many places. */
export interface Representation {
    /** E.g., for cm this is x => x * 100 */
    scale: (inBaseUnits: number) => number
    unitName: HumanReadableElement[]
    format: NumberFormat
    prefix?: string
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

/**
 * One of the units a quantity can be written in. Not a base unit necessarily, e.g.,
 * an acre is a unit of area, but it is not a base unit.
 */
export interface NamedUnit {
    name: string
    /** What one of it is, e.g., m^2 for an acre */
    dimensions: Dimension[]
    /** E.g., for an acre, 4046.86 */
    size: number
    /* How much should we discourage using this, in units of cost (digits) */
    cost: number
    /** Whether it shortens the number rather than measuring in something else, as k and m do */
    abbreviation: boolean
}

function scaling(baseUnit: BaseUnit, name: string, size: number, cost: number): NamedUnit {
    return { name, dimensions: [{ baseUnit, power: 1 }], size, cost, abbreviation: false }
}

/** Thousands, millions and billions, for a quantity that is counted rather than measured. */
function abbreviationsOf(baseUnit: BaseUnit): NamedUnit[] {
    return ([['k', 1e3], ['m', 1e6], ['B', 1e9]] as const)
        .map(([name, size]) => ({ ...scaling(baseUnit, name, size, 1), abbreviation: true })) // relatively low cost, just the abbreviation's length
}

// no need for a cost for scaled units. It should pick whichever is most convenient.
const costScaledUnit = 0

// the exact definitions: an inch is 2.54cm, a foot twelve of them, a mile 5280 feet
const metersPerInch = 0.0254
const metersPerFoot = 12 * metersPerInch
const metersPerMile = 5280 * metersPerFoot

function systemOf(settings: ReaderSettings): 'metric' | 'imperial' {
    return settings.useImperial === true ? 'imperial' : 'metric'
}

const kilometer = scaling('m', 'km', 1e3, costScaledUnit)
const mile = scaling('m', 'mi', metersPerMile, costScaledUnit)
const people = scaling('person', '', 1, 0)
const meter = scaling('m', 'm', 1, 0)
const centimeter = scaling('m', 'cm', 0.01, costScaledUnit)
const inch = scaling('m', 'in', metersPerInch, costScaledUnit)
const year = scaling('s', 'yr', 365.25 * 24 * 60 * 60, 0)
const microgram = scaling('g', 'μg', 1e-6, 0)

const lengthUnits: Record<'metric' | 'imperial', NamedUnit[]> = {
    metric: [
        scaling('m', 'm', 1, 0),
        centimeter,
        kilometer,
    ],
    imperial: [
        scaling('m', 'ft', metersPerFoot, 0),
        inch,
        mile,
        // an acre is a unit of area in its own right, and the square of no length anybody writes
        { name: 'acres', dimensions: [{ baseUnit: 'm', power: 2 }], size: 4046.8564224, cost: costScaledUnit, abbreviation: false },
    ],
}

/**
 * The units there are to write a quantity in, whatever dimensions it turns out to have. A count is
 * named by the statistic counting it, so the unit it is counted in has no name to show.
 */
function allUnits(settings: ReaderSettings): NamedUnit[] {
    return [
        scaling('person', '', 1, 0),
        ...abbreviationsOf('person'),
        scaling('usd', '', 1, 0),
        ...abbreviationsOf('usd'),
        // fatalities are not abbreviated: there are never enough of them for it to save a digit
        scaling('fatality', '', 1, 0),
        ...lengthUnits[systemOf(settings)],
    ]
}

type DimensionKey = string

function renderAsKey(scales: Dimension[]): DimensionKey {
    return scales
        .filter(({ power }) => power !== 0)
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .sort((a, b) => a.localeCompare(b))
        .join(' ')
}

/**

 */
interface Convention {
    style?: NumberFormat
    /** Every base unit the quantity has, or there is no way left to write it in. */
    writeIn?: Partial<Record<BaseUnit, NamedUnit>>
    prefix?: string
}

function conventionsUsing(kmLike: NamedUnit, cmLike: NamedUnit): Record<DimensionKey, Convention | undefined> {
    return {
        '': { style: { kind: 'significantFigures' } },
        // things that are counted come in whole numbers, unless they are counted in thousands
        'person^1': { style: { kind: 'fixed', places: 0 } },
        'usd^1': { style: { kind: 'fixed', places: 0 }, prefix: '$' },
        'fatality^1': { style: { kind: 'fixed', places: 0 } },
        'fatality^1 person^-1': {
            style: { kind: 'fixed', places: 2 },
            writeIn: { fatality: scaling('fatality', '', 1, 0), person: scaling('person', '100k', 1e5, 0) },
        },
        // a density is not worth a third digit, and every one of them is read against the others
        'm^-2 person^1': { style: { kind: 'rounded', significantDigits: 2 }, writeIn: { person: people, m: kmLike } },
        // a concentration is scientific, and stays in the units science is written in
        'g^1 m^-3': { style: { kind: 'fixed', places: 2 }, writeIn: { g: microgram, m: meter } },
        // rainfall is per year, however many digits per hour would save
        'm^1 s^-1': { style: { kind: 'fixed', places: 1 }, writeIn: { m: cmLike, s: year } },
    }
}

const conventions: Record<'metric' | 'imperial', Record<DimensionKey, Convention | undefined>> = {
    metric: conventionsUsing(kilometer, centimeter),
    imperial: conventionsUsing(mile, inch),
}

const defaultStyle: NumberFormat = { kind: 'rounded', significantDigits: 3 }
/** An abbreviated number is worth three figures, wherever they fall. */
const abbreviatedStyle: NumberFormat = { kind: 'significantFigures' }

function styleFor(convention: Convention | undefined, written: Written[]): NumberFormat {
    if (written.some(({ unit }) => unit.abbreviation)) {
        return abbreviatedStyle
    }
    return convention?.style ?? defaultStyle
}

/** Adjacent names are one run of text, which the browser shapes as a whole. */
function merged(name: HumanReadableElement[]): HumanReadableElement[] {
    return name.reduce<HumanReadableElement[]>((run, element) => {
        const last = run.length === 0 ? undefined : run[run.length - 1]
        if (last?.type === 'atom' && element.type === 'atom') {
            return [...run.slice(0, -1), { type: 'atom', value: last.value + element.value }]
        }
        return [...run, element]
    }, [])
}

function raisedTo(power: number): HumanReadableElement[] {
    return Math.abs(power) === 1 ? [] : [{ type: 'superscript', value: atom(Math.abs(power).toString()) }]
}

/** The units multiplied together, e.g., km^2, or people per km^2 for a quantity with a denominator. */
function product(written: Written[]): HumanReadableElement[] {
    return written.flatMap(({ unit, power }, index) => [
        ...index === 0 ? [] : atom('\u00b7'),
        ...atom(unit.name),
        ...raisedTo(power),
    ])
}

/** The names of the units chosen. The ones with no name of their own are left out. */
export function nameOf(written: Written[]): HumanReadableElement[] {
    const named = written.filter(({ unit }) => unit.name !== '')
    const over = named.filter(({ power }) => power > 0)
    const under = named.filter(({ power }) => power < 0)
    if (under.length === 0) {
        return merged(product(over))
    }
    // a solidus with nothing in front of it is set with a space, as a bare per reads better that way
    return merged([...product(over), ...atom(over.length === 0 ? '/\u00a0' : '/'), ...product(under)])
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
        case 'dimensionfull': {
            const convention = conventions[systemOf(settings)][renderAsKey(unit.scales)]
            const pool = convention?.writeIn === undefined ? allUnits(settings) : Object.values(convention.writeIn)
            const { written, scale, format } = chooseUnits(inBaseUnits, unit.scales, pool, chosen => styleFor(convention, chosen))
            return { scale, unitName: nameOf(written), format, prefix: convention?.prefix }
        }
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
