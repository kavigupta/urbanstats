import { HueColors } from '../page_template/color-themes'

import { atom, HumanReadableElement } from './human-readable-element'
import { formatNumber, hoursAndMinutes, NumberFormat } from './text'
import { chooseUnits, Written, writtenAsCounted } from './unit-search'

export type Hue = keyof HueColors

type PartySystem = 'democratic' | 'left'

/**
 * Base units, combined together via multiplication to form the units that correspond to the inBaseUnits value
 */
export type BaseUnit = 'person' | 'usd' | 'fatality' | 'm' | 'g' | 's' | 'F'

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
    units: Record<System, Partial<Record<BaseUnit, NamedUnit>>>
    style: NumberFormat
}

/** For a quantity written the same way whichever units its reader measures in. */
export function inEitherSystem(units: Partial<Record<BaseUnit, NamedUnit>>): Record<System, Partial<Record<BaseUnit, NamedUnit>>> {
    return { metric: units, imperial: units }
}

export type Decoration = { kind: 'none' } | { kind: 'percent', party?: Party } | { kind: 'writtenIn', in: WrittenIn }

/**
 * The coefficients of the quantities that were added to make this one: a level is 1, a difference
 * of two is 0, and the mean of two is 1 again. Where the base has no zero of its own only those
 * two are quantities at all; where it has one, all that is read off this is whether it is zero,
 * which is what a leading + is written for. Arithmetic that cannot say which it is says so.
 */
export type Coefficient = number | 'unknown'

export interface Unit {
    dimensions: Dimension[]
    decoration: Decoration
    times: Coefficient
    /** Whether zero of it is nothing, which is false of a temperature: 0°C is not 0°F. */
    baseIsScalar: boolean
}

export interface StoredUnit {
    unit: Unit
    // e.g., a value stored in cm will have 0.01 for this field
    toBaseUnits: number
}

/** Whether a unit is rendered by itself or against the number it belongs to. */
export interface UnitPlacement {
    /** In a column of its own, where a leading solidus reads as a dangling slash. */
    alone?: boolean
    /** Straight after the number, where a word wants a space off it and km^{2} does not. */
    afterNumber?: boolean
}

export interface UnitSettings {
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
    /** Where its zero sits, in base units, for a base that has no zero of its own */
    offset?: number
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

function systemOf(settings: UnitSettings): 'metric' | 'imperial' {
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
export const minute = scaling('s', 'min', 60, costScaledUnit)
export const year = scaling('s', 'yr', 365.25 * 24 * 60 * 60, 0)
export const microgram = scaling('g', 'μg', 1e-6, costScaledUnit)
const fahrenheit: NamedUnit = { name: '°F', dimensions: [{ baseUnit: 'F', power: 1 }], size: 1, cost: 0, abbreviation: false }
const celsius: NamedUnit = { name: '°C', dimensions: [{ baseUnit: 'F', power: 1 }], size: 9 / 5, offset: 32, cost: 0, abbreviation: false }

const massUnits: NamedUnit[] = [
    scaling('g', 'g', 1, 0),
    microgram,
    scaling('g', 'mg', 1e-3, costScaledUnit),
    scaling('g', 'kg', 1e3, costScaledUnit),
]

const timeUnits: NamedUnit[] = [
    scaling('s', 's', 1, 0),
    minute,
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
function allUnits(settings: UnitSettings): NamedUnit[] {
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
        // the one a reader reads temperatures in, so there is nothing for the search to weigh
        settings.temperatureUnit === 'celsius' ? celsius : fahrenheit,
    ]
}

const counted: BaseUnit[] = ['person', 'usd', 'fatality']

const baseUnitWords: Record<BaseUnit, string> = {
    person: 'people', usd: 'dollars', fatality: 'fatalities', m: 'm', g: 'g', s: 's', F: '°F',
}

function plainly(elements: HumanReadableElement[]): string {
    return elements.map(element => element.type === 'superscript' ? `^{${plainly(element.value)}}` : (element.type === 'atom' ? element.value : '')).join('')
}

/**
 * What a quantity is stored in: the unit that is exactly it, or how much of the base units one of
 * it is worth. Two quantities of the same dimensions are told apart by that number, an area stored
 * in square kilometres being 1e6 where one stored in square metres is 1.
 */
export function describeStoredUnit(stored: StoredUnit): string {
    const name = nameOfStoredUnit(stored)
    return name === undefined || name.length === 0
        ? `${stored.toBaseUnits.toPrecision(3)} ${describeDimensions(stored.unit)}`
        : plainly(name)
}

/** The base units a quantity is in, for saying why two of them cannot be put together. */
export function describeDimensions(unit: Unit): string {
    const parts = unit.dimensions.map(({ baseUnit, power }) =>
        power === 1 ? baseUnitWords[baseUnit] : `${baseUnitWords[baseUnit]}^${power}`)
    return parts.length === 0 ? 'a plain number' : parts.join('·')
}

/**
 * A count goes unnamed, so it can only be the one thing counted: people times square kilometres
 * would be written `km²` and read as an area. A fractional power is in no pool at all. A statistic
 * that says which units it is written in has named them, counted things and all.
 */
export function writableDimensions(unit: Unit): boolean {
    // a fractional power of a count is written as nothing, the count having no name to raise
    return unit.dimensions.every(({ baseUnit, power }) => Number.isInteger(power) || counted.includes(baseUnit))
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
    'F^1': { style: { kind: 'fixed', places: 1 } },
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
        ...atom(unit.name === '' ? baseUnitWords[unit.dimensions[0].baseUnit] : unit.name),
        ...raisedTo(power),
    ])
}

function computedUnit(dimensions: Dimension[], toBaseUnits: number): StoredUnit {
    return { unit: { dimensions, decoration: { kind: 'none' }, times: 1, baseIsScalar: true }, toBaseUnits }
}

export const dimensionless = computedUnit([], 1)

/**
 * A power that arithmetic has left a hair off a whole one: a cube raised to a tenth and then to
 * ten comes back as 3.0000000000000004, which is no dimension anything is written in.
 */
export function snapToWhole(value: number): number {
    return Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : value
}

function gathered(dimensions: Dimension[]): Dimension[] {
    const totals = new Map<BaseUnit, number>()
    for (const { baseUnit, power } of dimensions) {
        totals.set(baseUnit, (totals.get(baseUnit) ?? 0) + power)
    }
    return [...totals]
        .map(([baseUnit, power]): Dimension => ({ baseUnit, power: snapToWhole(power) }))
        .filter(({ power }) => power !== 0)
}

export function sameDimensions(left: StoredUnit, right: StoredUnit): boolean {
    return renderAsKey(gathered(left.unit.dimensions)) === renderAsKey(gathered(right.unit.dimensions))
}

/**
 * Nothing scales a temperature, 0°C being no more nothing than 0°F is. A difference of two is
 * another matter: no degrees is no degrees on either scale, so it multiplies like anything else.
 */
function multiplies(unit: Unit): boolean {
    return unit.baseIsScalar || unit.times === 0
}

export function unitProduct(left: StoredUnit, right: StoredUnit, rightPower: 1 | -1): StoredUnit | undefined {
    if (!multiplies(left.unit) || !multiplies(right.unit)) {
        return undefined
    }
    const [over, under] = [left.unit.dimensions, right.unit.dimensions]
    const dimensions = [...over, ...under.map(({ baseUnit, power }) => ({ baseUnit, power: power * rightPower }))]
    const toBaseUnits = rightPower === 1
        ? left.toBaseUnits * right.toBaseUnits
        : left.toBaseUnits / right.toBaseUnits
    return computedUnit(gathered(dimensions), toBaseUnits)
}

export function unitPower(stored: StoredUnit, exponent: number): StoredUnit | undefined {
    if (!multiplies(stored.unit)) {
        return undefined
    }
    const raised = stored.unit.dimensions.map(({ baseUnit, power }) => ({ baseUnit, power: power * exponent }))
    return computedUnit(gathered(raised), Math.pow(stored.toBaseUnits, exponent))
}

/**
 * What the numbers a statistic is stored as are counted in, which is what a script computes with:
 * rainfall is stored per metre though it is read per centimetre, and a share is stored as a
 * fraction though it is read as a percentage. Empty where nothing names it, a fraction and a count
 * having no name, and undefined where no unit is exactly it.
 */
export function nameOfStoredUnit(stored: StoredUnit): HumanReadableElement[] | undefined {
    // both systems, since the unit a statistic is stored in is not the reader's to choose, and no
    // abbreviations, which shorten a number rather than saying what it is counted in
    const pool = [...allUnits({}), ...lengthUnits.imperial, celsius].filter(({ abbreviation }) => !abbreviation)
    const written = writtenAsCounted(stored.unit.dimensions, pool, stored.toBaseUnits)
    return written === undefined ? undefined : nameOf(written, {})
}

/**
 * Set `alone` when the unit is rendered by itself, as in a table's unit column. A leading solidus
 * then takes a space, so that it reads as "per square kilometre" rather than as a dangling slash.
 */
export function nameOf(written: Written[], { alone = false, afterNumber = false }: UnitPlacement = {}): HumanReadableElement[] {
    // a count is named by the statistic counting it, but only where there is one of it: a square
    // of people is not people, and says so
    const named = written.filter(({ unit, power }) => unit.name !== '' || power !== 1)
    const over = named.filter(({ power }) => power > 0)
    const under = named.filter(({ power }) => power < 0)
    // a word takes a space off the number it follows, where km^{2} and % do not
    const spaced = afterNumber && over.length > 0 && over[0].unit.name === ''
    const start = spaced ? atom('\u00a0') : []
    if (under.length === 0) {
        return merged([...start, ...product(over)])
    }
    return merged([...start, ...product(over), ...atom(over.length === 0 && alone ? '/\u00a0' : '/'), ...product(under)])
}

/**
 * Where the zero of the units a quantity is written in sits. A quantity measured from that zero is
 * written from it; a difference of two is not, since the zero cancels between them.
 */
function offsetOf(written: Written[], times: Coefficient): number {
    return times === 1 ? written.reduce((total, { unit, power }) => total + (unit.offset ?? 0) * power, 0) : 0
}

function representationFor(inBaseUnits: number, unit: Unit, settings: UnitSettings, placement: UnitPlacement): Representation {
    if (unit.decoration.kind === 'percent') {
        // a lead is given more digits the closer it is, since that is what is being read off it
        return unit.decoration.party?.kind === 'lead' ? margin : percent
    }
    const convention = conventions[renderAsKey(unit.dimensions)]
    // a statistic written in units of its own leaves the search nothing to choose between
    const writtenIn = unit.decoration.kind === 'writtenIn' ? unit.decoration.in : undefined
    // An abbreviation shortens a count: thousands of people are people. It has no business scaling
    // anything else, so people times an area is not written in billions of square metres.
    const shortenable = unit.dimensions.length === 0 || (unit.dimensions.length === 1 && unit.dimensions[0].power === 1)
    const pool = writtenIn === undefined
        ? allUnits(settings).filter(({ abbreviation }) => shortenable || !abbreviation)
        : Object.values(writtenIn.units[systemOf(settings)])
    const { written, scale, format } = chooseUnits(inBaseUnits, unit.dimensions, pool,
        chosen => writtenIn?.style ?? styleFor(convention, chosen))
    const zero = offsetOf(written, unit.times)
    // h:mm spends two units and names one, so which one it names is the format's to say
    const unitName = format.kind === 'hoursMinutes'
        ? atom(hoursAndMinutes(scale(inBaseUnits)).unit)
        : nameOf(written, placement)
    return { scale: value => scale(value - zero), unitName, format, prefix: convention?.prefix }
}

function getParty(partySystem: PartySystem, value: number): { label: string, hue: Hue } {
    const side = value > 0 ? 'positive' : 'negative'
    return { label: partyLabels[partySystem][side], hue: partyHues[partySystem][side] }
}

function hueFor(unit: Unit): Hue | undefined {
    if (unit.decoration.kind !== 'percent') {
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

export function writeQuantity(value: number, stored: StoredUnit, settings: UnitSettings, placement: UnitPlacement): WrittenQuantity {
    if (!isFinite(value)) {
        return { renderedValue: missingValue, unitName: [] }
    }
    const { unit } = stored
    let inBaseUnits = value * stored.toBaseUnits
    const representation = representationFor(inBaseUnits, unit, settings, placement)
    const leads = unit.decoration.kind === 'percent' && unit.decoration.party?.kind === 'lead'
        ? unit.decoration.party.system
        : undefined
    let party = undefined
    if (leads !== undefined) {
        party = getParty(leads, inBaseUnits)
        inBaseUnits = Math.abs(inBaseUnits)
    }
    // whose lead it is carries a plus of its own, and a difference of two leads is not D++4.5
    const explicitSign = party === undefined && unit.times === 0 && inBaseUnits >= 0 ? '+' : ''
    const written = formatNumber(representation.scale(inBaseUnits), representation.format)
    return {
        renderedValue: `${party === undefined ? '' : `${party.label}+`}${explicitSign}${representation.prefix ?? ''}${written}`,
        unitName: representation.unitName,
        hue: party?.hue ?? hueFor(unit),
    }
}
