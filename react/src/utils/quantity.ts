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

export type Party = { kind: 'color', hue: Hue } | { kind: 'lead', system: PartySystem }

export type System = 'metric' | 'imperial'

/**
 * A fixed number of places only means something once the unit is known: two decimals of
 * micrograms, not of grams. So a statistic declares the two together.
 */
export interface WrittenIn {
    units: (system: System) => Partial<Record<BaseUnit, NamedUnit>>
    style: NumberFormat
}

export type Decoration = { kind: 'none' } | { kind: 'percent', party?: Party } | { kind: 'writtenIn', in: WrittenIn }

/**
 * Temperature is not expressed in units that scale each other: 0°C is not 0°F. A duration is
 * expressed in two at once: the 1 of 1:30 is hours and the 30 is minutes.
 */
export type Unit = (
    { kind: 'temperature' }
    | { kind: 'duration' }
    | { kind: 'scalar', dimensions: Dimension[], decoration: Decoration, difference: boolean }
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

const missingValue = 'N/A'

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

export const kilometer = scaling('m', 'km', 1e3, costScaledUnit)
export const mile = scaling('m', 'mi', metersPerMile, costScaledUnit)
export const people = scaling('person', '', 1, 0)
export const hundredThousandPeople = scaling('person', '100k', 1e5, 0)
export const fatalities = scaling('fatality', '', 1, 0)
export const meter = scaling('m', 'm', 1, 0)
export const centimeter = scaling('m', 'cm', 0.01, costScaledUnit)
export const inch = scaling('m', 'in', metersPerInch, costScaledUnit)
export const year = scaling('s', 'yr', 365.25 * 24 * 60 * 60, 0)
export const microgram = scaling('g', 'μg', 1e-6, costScaledUnit)

const massUnits: NamedUnit[] = [
    scaling('g', 'g', 1, 0),
    microgram,
    scaling('g', 'mg', 1e-3, costScaledUnit),
    scaling('g', 'kg', 1e3, costScaledUnit),
]

const timeUnits: NamedUnit[] = [
    scaling('s', 's', 1, 0),
    scaling('s', 'min', 60, costScaledUnit),
    scaling('s', 'hr', 60 * 60, costScaledUnit),
    scaling('s', 'days', 24 * 60 * 60, costScaledUnit),
    year,
]

const lengthUnits: Record<'metric' | 'imperial', NamedUnit[]> = {
    metric: [
        meter,
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
        ...massUnits,
        ...timeUnits,
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
    prefix?: string
}

/** What quantities of these dimensions are written like, however they arose. */
const conventions: Record<DimensionKey, Convention | undefined> = {
    '': { style: { kind: 'significantFigures' } },
    // things that are counted come in whole numbers, unless they are counted in thousands
    'person^1': { style: { kind: 'fixed', places: 0 } },
    'usd^1': { style: { kind: 'fixed', places: 0 }, prefix: '$' },
    'fatality^1': { style: { kind: 'fixed', places: 0 } },
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
    if (unit.kind === 'duration') {
        // it is named for the largest part of it that there is any of, as h:mm reads in hours
        const anHourOrMore = Math.round(Math.abs(inBaseUnits) / 60) >= 60
        return { unitName: atom(anHourOrMore ? 'h' : 'min'), scale: value => value / 60, format: { kind: 'hoursMinutes' } }
    }
    if (unit.kind === 'temperature') {
        return settings.temperatureUnit === 'celsius'
            ? { unitName: atom('°C'), scale: value => (value - 32) * (5 / 9), format: { kind: 'fixed', places: 1 } }
            : { unitName: atom('°F'), scale: value => value, format: { kind: 'fixed', places: 1 } }
    }
    if (unit.decoration.kind === 'percent') {
        // a lead is given more digits the closer it is, since that is what is being read off it
        return unit.decoration.party?.kind === 'lead' ? margin : percent
    }
    const convention = conventions[renderAsKey(unit.dimensions)]
    // a statistic written in units of its own leaves the search nothing to choose between
    const writtenIn = unit.decoration.kind === 'writtenIn' ? unit.decoration.in : undefined
    const pool = writtenIn === undefined ? allUnits(settings) : Object.values(writtenIn.units(systemOf(settings)))
    const { written, scale, format } = chooseUnits(inBaseUnits, unit.dimensions, pool,
        chosen => writtenIn?.style ?? styleFor(convention, chosen))
    return { scale, unitName: nameOf(written), format, prefix: convention?.prefix }
}

function getParty(partySystem: PartySystem, value: number): { label: string, hue: Hue } {
    const side = value > 0 ? 'positive' : 'negative'
    return { label: partyLabels[partySystem][side], hue: partyHues[partySystem][side] }
}

function hueFor(unit: Unit): Hue | undefined {
    if (unit.kind !== 'scalar' || unit.decoration.kind !== 'percent') {
        return undefined
    }
    return unit.decoration.party?.kind === 'color' ? unit.decoration.party.hue : undefined
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
    const leads = unit.kind === 'scalar' && unit.decoration.kind === 'percent' && unit.decoration.party?.kind === 'lead'
        ? unit.decoration.party.system
        : undefined
    let party = undefined
    if (leads !== undefined) {
        party = getParty(leads, inBaseUnits)
        inBaseUnits = Math.abs(inBaseUnits)
    }
    const explicitSign = unit.kind === 'scalar' && unit.difference && inBaseUnits >= 0 ? '+' : ''
    const written = formatNumber(representation.scale(inBaseUnits), representation.format)
    return {
        renderedValue: `${party === undefined ? '' : `${party.label}+`}${explicitSign}${representation.prefix ?? ''}${written}`,
        unitName: representation.unitName,
        hue: party?.hue ?? hueFor(unit),
    }
}
