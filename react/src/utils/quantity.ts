import { HueColors } from '../page_template/color-themes'

import { atom, HumanReadableElement } from './human-readable-element'
import { formatNumber, hoursAndMinutes, NumberFormat } from './text'
import { chooseUnits, Written, writtenAsCounted } from './unit-search'

export type Hue = keyof HueColors

type PartySystem = 'democratic' | 'left'

/** Base units, multiplied together to form the units that inBaseUnits is counted in. */
export type BaseUnit = 'person' | 'usd' | 'fatality' | 'm' | 'g' | 's' | 'F'

export interface Dimension {
    baseUnit: BaseUnit
    power: number
}

export type Party = { kind: 'color', hue: Hue } | { kind: 'lead', system: PartySystem }

export type System = 'metric' | 'imperial'

/**
 * A fixed number of places only means something once the unit is known: two decimals of
 * micrograms, not of grams.
 */
export interface WrittenIn {
    units: Record<System, Partial<Record<BaseUnit, NamedUnit>>>
    style: NumberFormat
}

export function inEitherSystem(units: Partial<Record<BaseUnit, NamedUnit>>): Record<System, Partial<Record<BaseUnit, NamedUnit>>> {
    return { metric: units, imperial: units }
}

export type Decoration = { kind: 'none' } | { kind: 'percent', party?: Party } | { kind: 'writtenIn', in: WrittenIn }

/**
 * How many quantities were added to make this one: a level is 1, a difference of two is 0, and the
 * mean of two is 1 again. On a temperature scale, where 0 does not mean none of the quantity,
 * only 0 and 1 are quantities at all. Elsewhere the only thing read off it is whether it is 0, which is written
 * with a leading +. Arithmetic that cannot work it out gives 'unknown'.
 */
export type Coefficient = number | 'unknown'

export interface Unit {
    dimensions: Dimension[]
    decoration: Decoration
    times: Coefficient
    /** Whether 0 of it means none of the quantity. False of a temperature: 0°C is not 0°F. */
    baseIsScalar: boolean
}

export interface StoredUnit {
    unit: Unit
    // e.g., a value stored in cm will have 0.01 for this field
    toBaseUnits: number
}

/** Where a unit is written, which decides the spacing around it. */
export type UnitPlacement =
    /** In a column of its own, as a table writes it */
    | 'inColumn'
    /** Immediately after a number */
    | 'afterNumber'
    /** In a run of text, with no number before it */
    | 'byItself'

export interface UnitSettings {
    useImperial?: boolean
    temperatureUnit?: string
}

const missingValue = 'N/A'

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

/** One of the units a quantity can be written in. An acre is one, and is not a base unit. */
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

// a scaled unit has no cost, so whichever is most convenient wins
const costScaledUnit = 0

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
        // an acre is a unit of area in its own right, not the square of a length that is written
        { name: 'acres', dimensions: [{ baseUnit: 'm', power: 2 }], size: 4046.8564224, cost: costScaledUnit, abbreviation: false },
    ],
}

/** The units there are to write a quantity in. A count has no name here: the statistic gives it one. */
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
        // only the reader's own temperature unit, so the search has one candidate rather than two
        settings.temperatureUnit === 'celsius' ? celsius : fahrenheit,
    ]
}

/** Plural above the solidus, singular below it: people^{2}, and km^{2}/person. */
const baseUnitWords: Record<BaseUnit, { one: string, many: string }> = {
    person: { one: 'person', many: 'people' },
    usd: { one: 'dollar', many: 'dollars' },
    fatality: { one: 'fatality', many: 'fatalities' },
    m: { one: 'm', many: 'm' },
    g: { one: 'g', many: 'g' },
    s: { one: 's', many: 's' },
    F: { one: '°F', many: '°F' },
}

type DimensionKey = string

function renderAsKey(scales: Dimension[]): DimensionKey {
    return scales
        .filter(({ power }) => power !== 0)
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .sort((a, b) => a.localeCompare(b))
        .join(' ')
}

interface Convention {
    style?: NumberFormat
    prefix?: string
}

/** How a quantity of these dimensions is written, whatever arithmetic produced it. */
const conventions: Record<DimensionKey, Convention | undefined> = {
    '': { style: { kind: 'significantFigures' } },
    // things that are counted come in whole numbers
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

/** The units multiplied together, e.g., km^{2} or person·m. One side of a solidus, never both. */
function product(written: Written[], singular = false): HumanReadableElement[] {
    return written.flatMap(({ unit, power }, index) => [
        ...index === 0 ? [] : atom('\u00b7'),
        ...atom(unit.name === '' ? wordFor(unit, singular) : unit.name),
        ...raisedTo(power),
    ])
}

function wordFor(unit: NamedUnit, singular: boolean): string {
    const words = baseUnitWords[unit.dimensions[0].baseUnit]
    return singular ? words.one : words.many
}

function computedUnit(dimensions: Dimension[], toBaseUnits: number, times: Coefficient): StoredUnit {
    return { unit: { dimensions, decoration: { kind: 'none' }, times, baseIsScalar: true }, toBaseUnits }
}

export const dimensionless = computedUnit([], 1, 1)

/**
 * For products we do not propagate the exact times field, that being ill defined. We do propagate
 * whether it is 0, which is whether the unit is a difference, and is what renders it signed. A
 * product is a difference if any of its operands are.
 */
function timesOfAProduct(...operands: Unit[]): Coefficient {
    return operands.some(({ times }) => times === 0) ? 0 : 1
}

/**
 * Floating point leaves a power slightly off a whole number: a cube raised to a tenth and then to
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
 * A temperature cannot be scaled, 0°C and 0°F being different quantities though both read zero. A
 * difference of two can be: no degrees is no degrees on either scale.
 */
export function multiplies(unit: Unit): boolean {
    return unit.baseIsScalar || unit.times === 0
}

/** The same unit, as a difference of two quantities rather than as one of them. */
export function asADifference(unit: StoredUnit): StoredUnit {
    return { ...unit, unit: { ...unit.unit, times: 0 } }
}

/** A number of no unit. A share is not one, being a number of hundredths. */
export function isPlainNumber(unit: StoredUnit): boolean {
    return unit.unit.dimensions.length === 0 && unit.unit.decoration.kind === 'none' && sameSize(unit.toBaseUnits, 1)
}

/** Two sizes within floating point error are the same: a square root squared does not come back exact. */
export function sameSize(left: number, right: number): boolean {
    return Math.abs(left - right) <= 1e-9 * Math.max(Math.abs(left), Math.abs(right))
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
    return computedUnit(gathered(dimensions), toBaseUnits, timesOfAProduct(left.unit, right.unit))
}

export function unitPower(stored: StoredUnit, exponent: number): StoredUnit | undefined {
    if (!multiplies(stored.unit)) {
        return undefined
    }
    const raised = stored.unit.dimensions.map(({ baseUnit, power }) => ({ baseUnit, power: power * exponent }))
    return computedUnit(gathered(raised), Math.pow(stored.toBaseUnits, exponent), timesOfAProduct(stored.unit))
}

/**
 * What the numbers a statistic is stored as are counted in, which is what a script computes with:
 * rainfall is stored per metre though it is read per centimetre. Empty where no unit names it, as
 * a fraction and a count have no name, and undefined where no unit is exactly it.
 */
export function nameOfStoredUnit(stored: StoredUnit): HumanReadableElement[] | undefined {
    // both systems, since the unit a statistic is stored in is not the reader's to choose, and no
    // abbreviations, which shorten the number rather than saying what it is counted in
    const pool = [...allUnits({}), ...lengthUnits.imperial, celsius].filter(({ abbreviation }) => !abbreviation)
    const written = writtenAsCounted(stored.unit.dimensions, pool, stored.toBaseUnits)
    return written === undefined ? undefined : nameOf(written, 'byItself')
}

/** What a unit is called, spaced for where it is written. */
export function nameOf(written: Written[], placement: UnitPlacement = 'byItself'): HumanReadableElement[] {
    // one of a count is named by the statistic counting it, so it is dropped here. Its square is
    // not people, and is written
    const named = written.filter(({ unit, power }) => unit.name !== '' || power !== 1)
    const over = named.filter(({ power }) => power > 0)
    const under = named.filter(({ power }) => power < 0)
    // a word takes a space off the number it follows, where km^{2} and % do not
    const spaced = placement === 'afterNumber' && over.length > 0 && over[0].unit.name === ''
    const start = spaced ? atom('\u00a0') : []
    if (under.length === 0) {
        return merged([...start, ...product(over)])
    }
    // a solidus with no numerator in front of it reads as a dangling slash in a column of its own
    const solidus = over.length === 0 && placement === 'inColumn' ? '/\u00a0' : '/'
    return merged([...start, ...product(over), ...atom(solidus), ...product(under, true)])
}

/**
 * Where the zero of the units a quantity is written in sits. A difference of two quantities has
 * no offset, the zero cancelling between them.
 */
function offsetOf(written: Written[], times: Coefficient): number {
    return times === 1 ? written.reduce((total, { unit, power }) => total + (unit.offset ?? 0) * power, 0) : 0
}

function representationFor(inBaseUnits: number, unit: Unit, settings: UnitSettings, placement: UnitPlacement): Representation {
    if (unit.decoration.kind === 'percent') {
        return unit.decoration.party?.kind === 'lead' ? margin : percent
    }
    const convention = conventions[renderAsKey(unit.dimensions)]
    // a statistic written in units of its own fixes them, leaving the search no choice to make
    const writtenIn = unit.decoration.kind === 'writtenIn' ? unit.decoration.in : undefined
    // an abbreviation shortens a count: thousands of people are people. It does not scale anything
    // else, so people times an area is not written in billions of square metres
    const shortenable = unit.dimensions.length === 0 || (unit.dimensions.length === 1 && unit.dimensions[0].power === 1)
    const pool = writtenIn === undefined
        ? allUnits(settings).filter(({ abbreviation }) => shortenable || !abbreviation)
        : Object.values(writtenIn.units[systemOf(settings)])
    const { written, scale, format } = chooseUnits(inBaseUnits, unit.dimensions, pool,
        chosen => writtenIn?.style ?? styleFor(convention, chosen))
    const zero = offsetOf(written, unit.times)
    // h:mm uses two units and names one, so the format says which name
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
    /** The number as text. A lead carries its party and a plus, as in D+4.5 */
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
    // a lead carries a plus with its party already, and a difference of two leads is not D++4.5
    const explicitSign = party === undefined && unit.times === 0 && inBaseUnits >= 0 ? '+' : ''
    const written = formatNumber(representation.scale(inBaseUnits), representation.format)
    return {
        renderedValue: `${party === undefined ? '' : `${party.label}+`}${explicitSign}${representation.prefix ?? ''}${written}`,
        unitName: representation.unitName,
        hue: party?.hue ?? hueFor(unit),
    }
}
