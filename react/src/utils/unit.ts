import { HueColors } from '../page_template/color-themes'

import { assert } from './defensive'
import { HumanReadableElement } from './human-readable-name'
import { formatToSignificantFigures, separateNumber } from './text'

export type UnitType = 'percentage' | 'percentageChange' | 'fatalities' | 'fatalitiesPerCapita' | 'density' | 'population'
    | 'area' | 'distanceInKm' | 'distanceInM' | 'democraticMargin' | 'temperature' | 'time' | 'distancePerYear'
    | 'contaminantLevel' | 'number' | 'usd' | 'minutes'
    | 'partyPctBlue' | 'partyPctRed' | 'partyPctOrange' | 'partyPctTeal' | 'partyPctGreen' | 'partyPctPurple'
    | 'partyChangeBlue' | 'partyChangeRed' | 'partyChangeOrange' | 'partyChangeTeal' | 'partyChangeGreen' | 'partyChangePurple'
    | 'leftMargin'

// Validated list of all unit types - this ensures we have every value from UnitType
export const allUnitTypes = [
    'percentage',
    'percentageChange',
    'fatalities',
    'fatalitiesPerCapita',
    'density',
    'population',
    'area',
    'distanceInKm',
    'distanceInM',
    'democraticMargin',
    'temperature',
    'time',
    'distancePerYear',
    'contaminantLevel',
    'number',
    'usd',
    'minutes',
    'partyPctBlue',
    'partyPctRed',
    'partyPctOrange',
    'partyPctTeal',
    'partyPctGreen',
    'partyPctPurple',
    'partyChangeBlue',
    'partyChangeRed',
    'partyChangeOrange',
    'partyChangeTeal',
    'partyChangeGreen',
    'partyChangePurple',
    'leftMargin',
] as const

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- just to check that all unit types are covered
function checkAllIncluded(unitType: UnitType): (typeof allUnitTypes)[number] {
    return unitType
}

export type Hue = keyof HueColors

/**
 * The units everything else is measured in. A value is always given in these before it is
 * written out, so that quantities of the same kind are written the same way however they arose.
 */
export type BaseUnit = 'person' | 'm' | 's' | 'usd' | 'fatality' | 'g'

/**
 * What kind of quantity a number is. A quantity with dimensions is a product of powers of the
 * base units; the rest are the quantities that are not measurements, such as a share of a vote.
 */
export type Unit = (
    { kind: 'unknown' }
    | { kind: 'raw-percentage', partyColor?: Hue }
    | { kind: 'delta-percentage', partyColor?: Hue }
    | { kind: 'lead-percentage', partySystem: 'democratic' | 'left' }
    | { kind: 'temperature-F' }
    | { kind: 'dimensionfull', scales: { baseUnit: BaseUnit, power: number }[] }
)

/**
 * A unit together with what numbers written in it are multiplied by to be in base units, e.g., a
 * density is stored per square kilometer, so its numbers are multiplied by 1e-6 to be per square
 * meter. Units are abstract, so how a particular column of numbers is stored belongs here.
 */
export interface StoredUnit {
    unit: Unit
    toBaseUnits: number
}

function dimensionfull(scales: Partial<Record<BaseUnit, number>>, toBaseUnits = 1): StoredUnit {
    const entries = Object.entries(scales) as [BaseUnit, number][]
    return {
        unit: { kind: 'dimensionfull', scales: entries.map(([baseUnit, power]) => ({ baseUnit, power })) },
        toBaseUnits,
    }
}

const secondsPerYear = 365.25 * 24 * 60 * 60
const mileInKm = 1.60934

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
const storedUnits: Record<UnitType, StoredUnit> = {
    percentage: { unit: { kind: 'raw-percentage' }, toBaseUnits: 1 },
    percentageChange: { unit: { kind: 'delta-percentage' }, toBaseUnits: 1 },
    democraticMargin: { unit: { kind: 'lead-percentage', partySystem: 'democratic' }, toBaseUnits: 1 },
    leftMargin: { unit: { kind: 'lead-percentage', partySystem: 'left' }, toBaseUnits: 1 },
    partyPctBlue: { unit: { kind: 'raw-percentage', partyColor: 'blue' }, toBaseUnits: 1 },
    partyPctRed: { unit: { kind: 'raw-percentage', partyColor: 'red' }, toBaseUnits: 1 },
    partyPctOrange: { unit: { kind: 'raw-percentage', partyColor: 'orange' }, toBaseUnits: 1 },
    partyPctTeal: { unit: { kind: 'raw-percentage', partyColor: 'cyan' }, toBaseUnits: 1 },
    partyPctGreen: { unit: { kind: 'raw-percentage', partyColor: 'green' }, toBaseUnits: 1 },
    partyPctPurple: { unit: { kind: 'raw-percentage', partyColor: 'purple' }, toBaseUnits: 1 },
    partyChangeBlue: { unit: { kind: 'delta-percentage', partyColor: 'blue' }, toBaseUnits: 1 },
    partyChangeRed: { unit: { kind: 'delta-percentage', partyColor: 'red' }, toBaseUnits: 1 },
    partyChangeOrange: { unit: { kind: 'delta-percentage', partyColor: 'orange' }, toBaseUnits: 1 },
    partyChangeTeal: { unit: { kind: 'delta-percentage', partyColor: 'cyan' }, toBaseUnits: 1 },
    partyChangeGreen: { unit: { kind: 'delta-percentage', partyColor: 'green' }, toBaseUnits: 1 },
    partyChangePurple: { unit: { kind: 'delta-percentage', partyColor: 'purple' }, toBaseUnits: 1 },
    temperature: { unit: { kind: 'temperature-F' }, toBaseUnits: 1 },
    number: dimensionfull({}),
    population: dimensionfull({ person: 1 }),
    fatalities: dimensionfull({ fatality: 1 }),
    fatalitiesPerCapita: dimensionfull({ fatality: 1, person: -1 }),
    density: dimensionfull({ person: 1, m: -2 }, 1e-6),
    area: dimensionfull({ m: 2 }, 1e6),
    distanceInKm: dimensionfull({ m: 1 }, 1e3),
    distanceInM: dimensionfull({ m: 1 }),
    time: dimensionfull({ s: 1 }, 60 * 60),
    minutes: dimensionfull({ s: 1 }, 60),
    distancePerYear: dimensionfull({ m: 1, s: -1 }, 1 / secondsPerYear),
    contaminantLevel: dimensionfull({ g: 1, m: -3 }, 1e-6),
    usd: dimensionfull({ usd: 1 }),
}
/* eslint-enable no-restricted-syntax */

export function unitTypeToStoredUnit(unitType: UnitType): StoredUnit {
    return storedUnits[unitType]
}

export function renderDimensions(scales: { baseUnit: BaseUnit, power: number }[]): string {
    return scales
        .filter(({ power }) => power !== 0)
        .sort((a, b) => a.baseUnit < b.baseUnit ? -1 : 1)
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .join(' ')
}

/**
 * How the number itself is written.
 */
interface NumberFormat {
    /**
     * Decimal places: a fixed count; enough places that the number is written to
     * `significantDigits` digits, between `minDecimals` and `maxDecimals` of them (which default
     * to none and to `significantDigits`); three significant figures wherever they fall; or a
     * duration written as h:mm.
     */
    decimals: number | SignificantDigits | 'significantFigures' | 'hoursMinutes'
    /** Whether groups of three digits are separated. Defaults to true. */
    separators?: boolean
}

interface SignificantDigits {
    significantDigits: number
    minDecimals?: number
    maxDecimals?: number
}

/**
 * One of the units a base unit can be written in, e.g., a kilometer, or a million people.
 */
interface LadderUnit {
    name: string
    /** How many base units one of it is: a kilometer is a thousand meters */
    size: number
    /**
     * What reaching for it costs, before the digits it saves. Zero for the unit a quantity is
     * ordinarily measured in, and more for one that only earns its place by shortening the
     * number, such as an abbreviation.
     */
    cost: number
}

/** A unit off the base of its ladder is worth reaching for only once it shortens the number. */
const coarser = 0.5
/** An abbreviation is a unit of its own only in the sense that it saves digits. */
const abbreviated = 1

/** Thousands, millions and billions, for a quantity that is counted rather than measured. */
const abbreviations: LadderUnit[] = [
    { name: 'k', size: 1e3, cost: abbreviated },
    { name: 'm', size: 1e6, cost: abbreviated },
    { name: 'B', size: 1e9, cost: abbreviated },
]

const sharedLadders = {
    person: [{ name: '', size: 1, cost: 0 }, ...abbreviations, { name: '100k', size: 1e5, cost: abbreviated }],
    usd: [{ name: '', size: 1, cost: 0 }, ...abbreviations],
    fatality: [{ name: '', size: 1, cost: 0 }],
    s: [
        { name: 's', size: 1, cost: 0 },
        // minutes give way to hours and minutes together as soon as there is an hour to give
        { name: 'min', size: 60, cost: coarser + 0.1 },
        { name: 'hours', size: 60 * 60, cost: coarser },
        { name: 'days', size: 24 * 60 * 60, cost: coarser },
        { name: 'yr', size: secondsPerYear, cost: coarser },
    ],
    g: [
        { name: 'g', size: 1, cost: 0 },
        { name: 'μg', size: 1e-6, cost: coarser },
        { name: 'mg', size: 1e-3, cost: coarser },
        { name: 'kg', size: 1e3, cost: coarser },
    ],
} satisfies Partial<Record<BaseUnit, LadderUnit[]>>

/**
 * The units each base unit can be written in, in the system of measurement the reader reads in.
 * A quantity is written by choosing one of them for each base unit it is measured in.
 */
const ladders: Record<'metric' | 'imperial', Record<BaseUnit, LadderUnit[]>> = {
    metric: {
        ...sharedLadders,
        m: [
            { name: 'm', size: 1, cost: 0 },
            { name: 'cm', size: 0.01, cost: coarser },
            { name: 'km', size: 1e3, cost: coarser },
        ],
    },
    imperial: {
        ...sharedLadders,
        m: [
            { name: 'ft', size: 1 / 3.28084, cost: 0 },
            { name: 'in', size: 1 / (12 * 3.28084), cost: coarser },
            { name: 'mi', size: 1e3 * mileInKm, cost: coarser },
            // not a unit a reader of feet and miles measures in, but conventions may still ask for it
            { name: 'm', size: 1, cost: 10 },
        ],
    },
}

/**
 * The unit a quantity of these dimensions is conventionally written in, for each base unit it is
 * measured in. Nothing in a ladder can say that people per area belong in square kilometers while
 * an area itself belongs in square meters until it is large, since both are the same step up the
 * same ladder, so the convention says it here.
 */
type Conventions = Record<string, Partial<Record<BaseUnit, string>> | undefined>

const conventions: Record<'metric' | 'imperial', Conventions> = {
    metric: {
        'm^-2 person^1': { m: 'km' },
        'm^2': { m: 'km' },
        'g^1 m^-3': { g: 'μg', m: 'm' },
        'm^1 s^-1': { m: 'cm', s: 'yr' },
        'fatality^1 person^-1': { person: '100k' },
    },
    imperial: {
        'm^-2 person^1': { m: 'mi' },
        'm^2': { m: 'mi' },
        // a concentration is scientific, and stays in the units science is written in
        'g^1 m^-3': { g: 'μg', m: 'm' },
        'm^1 s^-1': { m: 'in', s: 'yr' },
        'fatality^1 person^-1': { person: '100k' },
    },
}

/** Departing from the convention has to be worth as much as a coarser unit is. */
const unconventional = coarser

/**
 * How the number is written once a unit has been chosen for it. Separate from the units: what a
 * quantity is measured in does not say how precisely it is worth writing.
 */
const styles: Record<string, NumberFormat | undefined> = {
    '': { decimals: 'significantFigures', separators: false },
    // things that are counted come in whole numbers, unless they are counted in thousands
    'person^1': { decimals: 0 },
    'usd^1': { decimals: 0 },
    'fatality^1': { decimals: 0 },
    // a density is not worth a third digit, and the rest are read against each other
    'm^-2 person^1': { decimals: { significantDigits: 2 } },
    'g^1 m^-3': { decimals: 2, separators: false },
    'fatality^1 person^-1': { decimals: 2, separators: false },
    'm^1 s^-1': { decimals: 1, separators: false },
}

const defaultStyle: NumberFormat = { decimals: { significantDigits: 3 } }
/** An abbreviated number is worth three figures, wherever they fall. */
const abbreviatedStyle: NumberFormat = { decimals: 'significantFigures' }
/** A duration of hours reads as hours and minutes rather than as a fraction of an hour. */
const hoursMinutes: NumberFormat = { decimals: 'hoursMinutes' }

const prefixes: Record<string, string | undefined> = { 'usd^1': '$' }

interface Dimension { baseUnit: BaseUnit, power: number }
interface Written { baseUnit: BaseUnit, power: number, unit: LadderUnit }

function styleFor(signature: string, written: Written[]): NumberFormat {
    if (signature === 's^1' && written[0].unit.name === 'hours') {
        return hoursMinutes
    }
    if (written.some(({ unit }) => unit.cost === abbreviated)) {
        return abbreviatedStyle
    }
    return styles[signature] ?? defaultStyle
}

/**
 * What a number costs to read in a given unit: one for every digit past the third before the
 * point, and nine tenths of one for the point itself and each leading zero after it. The number
 * is written out to count it, so that a value that rounds up into another unit, such as 999.5
 * thousand people, costs what a million costs rather than what nine hundred thousand costs.
 */
function digitCost(value: number, format: NumberFormat): number {
    if (value === 0) {
        // nothing is shorter than zero in any unit
        return 0
    }
    // a duration written as h:mm is counted by the hours it is written in
    const counted: NumberFormat = format.decimals === 'hoursMinutes' ? defaultStyle : format
    const written = formatNumber(value, { ...counted, separators: false }).join('').replaceAll('-', '')
    const [integerPart, fraction = ''] = written.split('.')
    if (!/^[0-9]+$/.test(integerPart)) {
        return 0
    }
    if (integerPart !== '0') {
        return Math.max(0, integerPart.length - 3)
    }
    // a shade less than a digit, since a number below one reads a little better than a long one
    return 0.9 * (1 + (/^0*/.exec(fraction)?.[0].length ?? 0))
}

function atom(value: string): HumanReadableElement[] {
    return [{ type: 'atom', value }]
}

function nameOf(written: Written[]): HumanReadableElement[] {
    // a unit with no name of its own, such as a person, is named after itself below the line
    const named = ({ power, unit }: Written): boolean => unit.name !== '' || power < 0
    const reifyPart = ({ baseUnit, unit }: Written): string => unit.name === '' ? baseUnit : unit.name
    const part = (one: Written): HumanReadableElement[] => [
        { type: 'atom', value: reifyPart(one) },
        ...Math.abs(one.power) === 1 ? [] : [{ type: 'superscript', value: [{ type: 'atom', value: Math.abs(one.power).toString() }] } satisfies HumanReadableElement],
    ]
    const join = (parts: HumanReadableElement[][]): HumanReadableElement[] =>
        parts.flatMap((elements, index) => index === 0 ? elements : [{ type: 'atom', value: '\u00b7' }, ...elements])
    const under = written.filter(({ power }) => power < 0).filter(named)
    const over = written.filter(({ power }) => power > 0).filter(named)
    // a quantity that is only a denominator, such as a density, is written /\u00a0km^2 rather than
    // /km^2, unless what follows the slash is a number, as in /100k
    const belowFirst = under.length === 0 ? '' : reifyPart(under[0])
    const slash = over.length === 0 && /^[a-z]/i.test(belowFirst) ? '/\u00a0' : '/'
    const name = [
        ...join(over.map(part)),
        ...under.length === 0 ? [] : [{ type: 'atom', value: slash } satisfies HumanReadableElement, ...join(under.map(part))],
    ]
    // adjacent atoms are one run of text, except across the space a bare denominator opens with
    const merged: HumanReadableElement[] = []
    for (const element of name) {
        const last = merged.length === 0 ? undefined : merged[merged.length - 1]
        if (last?.type === 'atom' && element.type === 'atom' && !last.value.endsWith('\u00a0')) {
            merged[merged.length - 1] = { type: 'atom', value: last.value + element.value }
        }
        else {
            merged.push(element)
        }
    }
    return merged
}

function combinations(dimensions: Dimension[], rungs: (dimension: Dimension) => LadderUnit[]): Written[][] {
    if (dimensions.length === 0) {
        return [[]]
    }
    const [dimension, ...rest] = dimensions
    return rungs(dimension).flatMap(unit => combinations(rest, rungs).map(tail => [{ ...dimension, unit }, ...tail]))
}

/** How a quantity is written: the units chosen for its dimensions, and the style they are in. */
interface Representation {
    /** Base units per unit written in */
    size: number
    /** Subtracted before dividing, for a unit whose zero is somewhere else */
    offset?: number
    name: HumanReadableElement[]
    attached: boolean
    prefix: string
    format: NumberFormat
}

// a name that begins with a symbol, such as /km^2 or %, is written straight after the number
function startsWithSymbol(name: HumanReadableElement[]): boolean {
    const first: HumanReadableElement | undefined = name.length === 0 ? undefined : name[0]
    return first?.type === 'atom' && /^[%/]/.test(first.value)
}

/**
 * The best way of writing a value of these dimensions: of every combination of units from the
 * ladders of the base units it is measured in, the one that costs least once the number it
 * leaves behind is counted.
 */
function bestRepresentation(valueInBaseUnits: number, scales: Dimension[], settings: ReaderSettings): Representation {
    const signature = renderDimensions(scales)
    const dimensions = scales.filter(({ power }) => power !== 0)
    const ladder = ladders[settings.useImperial === true ? 'imperial' : 'metric']
    const convention = conventions[settings.useImperial === true ? 'imperial' : 'metric'][signature]
    const costOf = ({ power, unit }: Written, baseUnit: BaseUnit): number => {
        const conventional = convention?.[baseUnit]
        const cost = conventional === undefined ? unit.cost : (unit.name === conventional ? 0 : unit.cost + unconventional)
        // a unit raised to a power costs what it costs each time it is used
        return cost * Math.abs(power)
    }
    const rungs = ({ baseUnit, power }: Dimension): LadderUnit[] => ladder[baseUnit].filter(unit =>
        // a count is abbreviated only when it is the whole quantity, not inside people per km^2
        unit.cost !== abbreviated
        || convention?.[baseUnit] === unit.name
        || (dimensions.length === 1 && Math.abs(power) === 1),
    )
    let best: Representation | undefined
    let bestCost = Infinity
    for (const written of combinations(dimensions, rungs)) {
        const format = styleFor(signature, written)
        const size = written.reduce((product, { power, unit }) => product * Math.pow(unit.size, power), 1)
        const cost = written.reduce((total, unit, index) => total + costOf(unit, dimensions[index].baseUnit), 0)
            + digitCost(valueInBaseUnits / size, format)
        if (cost < bestCost) {
            // a duration written as h:mm says so by being written that way
            const name = format.decimals === 'hoursMinutes' ? [] : nameOf(written)
            // an abbreviation is written against the number, as in 12.3k, and a symbol likewise
            const abbreviationOnly = written.every(({ unit }) => unit.name === '' || unit.cost === abbreviated)
            const attached = startsWithSymbol(name) || (name.length > 0 && abbreviationOnly)
            best = { size, name, attached, format, prefix: prefixes[signature] ?? '' }
            bestCost = cost
        }
    }
    assert(best !== undefined, 'every quantity has at least one way of being written')
    return best
}

const percent: Representation = { name: atom('%'), size: 1 / 100, attached: true, prefix: '', format: { decimals: 2, separators: false } }
/** A margin is written as the size of the lead, which is given to more digits the closer it is. */
const margin: Representation = { ...percent, format: { decimals: { significantDigits: 3, minDecimals: 1, maxDecimals: 4 }, separators: false } }

const partyLabels = {
    democratic: { positive: 'D', negative: 'R' },
    // the left is drawn in red, as it is outside the US
    left: { positive: 'L', negative: 'R' },
} as const

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
const partyHues = {
    democratic: { positive: 'blue', negative: 'red' },
    left: { positive: 'red', negative: 'blue' },
} as const
/* eslint-enable no-restricted-syntax */

export interface ReaderSettings {
    useImperial?: boolean
    temperatureUnit?: string
}

/**
 * How a value of this unit is written: which unit it is written in, and how the number is
 * written once it is in it.
 */
function scaleFor(valueInBaseUnits: number, unit: Unit, settings: ReaderSettings): Representation {
    switch (unit.kind) {
        case 'unknown':
            return { name: [], size: 1, attached: false, prefix: '', format: { decimals: 'significantFigures', separators: false } }
        case 'raw-percentage':
            return percent
        case 'delta-percentage':
            return percent
        case 'lead-percentage':
            return margin
        case 'temperature-F':
            return settings.temperatureUnit === 'celsius'
                ? { name: atom('\u00b0C'), size: 9 / 5, offset: 32, attached: false, prefix: '', format: { decimals: 1, separators: false } }
                : { name: atom('\u00b0F'), size: 1, attached: false, prefix: '', format: { decimals: 1, separators: false } }
        case 'dimensionfull':
            return bestRepresentation(valueInBaseUnits, unit.scales, settings)
    }
}

// e.g., to 3 significant digits, 123.4 is written with no decimal places and 1.234 with two
function decimalPlaces(value: number, { significantDigits, minDecimals, maxDecimals }: SignificantDigits): number {
    const most = maxDecimals ?? significantDigits
    const places = value === 0 ? most : significantDigits - Math.ceil(Math.log10(Math.abs(value)))
    return Math.min(Math.max(places, minDecimals ?? 0), most)
}

// separateNumber groups digits from the left, so it needs the integer part on its own
function separateDigits(value: string): string {
    const sign = value.startsWith('-') ? '-' : ''
    const [integerPart, ...rest] = value.slice(sign.length).split('.')
    return sign + [separateNumber(integerPart), ...rest].join('.')
}

/**
 * Writes a number out, in the pieces the browser shapes separately: the hours and minutes of a
 * duration are written either side of a colon, and shaped either side of it too.
 */
function formatNumber(value: number, { decimals, separators }: NumberFormat): string[] {
    if (!isFinite(value)) {
        return [value.toString()]
    }
    if (decimals === 'hoursMinutes') {
        const totalMinutes = Math.round(Math.abs(value) * 60)
        const sign = value < 0 && totalMinutes > 0 ? '-' : ''
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        return hours > 0 ? [`${sign}${hours}`, ':', minutes.toString().padStart(2, '0')] : [`${sign}${minutes}`]
    }
    const written = decimals === 'significantFigures'
        ? formatToSignificantFigures(value, 3)
        : value.toFixed(typeof decimals === 'number' ? decimals : decimalPlaces(value, decimals))
    return [separators === false ? written : separateDigits(written)]
}

/** The party a quantity written as a lead belongs to, if it is written as one. */
function party(unit: Unit, value: number): { label: string, hue: Hue } | undefined {
    if (unit.kind !== 'lead-percentage') {
        return undefined
    }
    const side = value > 0 ? 'positive' : 'negative'
    return { label: partyLabels[unit.partySystem][side], hue: partyHues[unit.partySystem][side] }
}

function hueFor(unit: Unit, value: number): Hue | undefined {
    switch (unit.kind) {
        case 'raw-percentage':
        case 'delta-percentage':
            return unit.partyColor
        case 'lead-percentage':
            return party(unit, value)?.hue
        case 'unknown':
        case 'temperature-F':
        case 'dimensionfull':
            return undefined
    }
}

/**
 * A quantity written out: the number as it reads, the name of the unit it is written in, and the
 * hue to write it in, for the quantities that are written in a party's color.
 */
export interface WrittenQuantity {
    /**
     * What the number reads as, in the pieces it is written in: a lead is written as its party,
     * a plus, and its size, which the browser shapes separately from one another.
     */
    number: string[]
    name: HumanReadableElement[]
    /** Whether the name is written directly after the number, rather than after a space */
    attached: boolean
    hue?: Hue
}

/**
 * Writes out a value stored in the given unit, e.g., 0.125 of a vote as `12.50` and `%`.
 */
export function writeQuantity(value: number, stored: StoredUnit, settings: ReaderSettings = {}): WrittenQuantity {
    const { unit } = stored
    const inBaseUnits = value * stored.toBaseUnits
    const scale = scaleFor(inBaseUnits, unit, settings)
    const hue = hueFor(unit, value)
    const written = { name: scale.name, attached: scale.attached, hue }
    if (hue !== undefined && !isFinite(value)) {
        // a quantity written in a party's color has no party, and no color, when it is missing
        return { ...written, number: ['N/A'], hue: undefined }
    }
    const lead = party(unit, value)
    const magnitude = (lead === undefined ? inBaseUnits : Math.abs(inBaseUnits)) - (scale.offset ?? 0)
    const scaled = magnitude / scale.size
    const explicitSign = unit.kind === 'delta-percentage' && scaled >= 0 ? '+' : ''
    return {
        ...written,
        number: [
            ...lead === undefined ? [] : [lead.label, '+'],
            ...explicitSign === '' ? [] : [explicitSign],
            ...scale.prefix === '' ? [] : [scale.prefix],
            ...formatNumber(scaled, scale.format),
        ],
    }
}

/**
 * Whether a comparison against a quantity of this unit reads as its opposite, which is the case
 * below zero for a lead, which is written as a size rather than as a signed number.
 */
export function flipsInequality(unit: Unit, value: number): boolean {
    return unit.kind === 'lead-percentage' && value <= 0
}

/**
 * A unit name as it is written after a number, e.g., " hours" but "%".
 */
export function unitSuffix(name: HumanReadableElement[], attached: boolean): HumanReadableElement[] {
    return name.length === 0 || attached ? name : [{ type: 'atom', value: ' ' }, ...name]
}

function fahrenheitToCelsius(value: number): number {
    return (value - 32) * (5 / 9)
}

function metersToCentimetersOrInches(value: number, useImperial: boolean): number {
    const centimeters = value * 100
    return useImperial ? centimeters / 2.54 : centimeters
}

export function convertTemperature(value: number, temperatureUnit: string): { value: number, unit: string } {
    return temperatureUnit === 'celsius'
        ? { value: fahrenheitToCelsius(value), unit: '°C' }
        : { value, unit: '°F' }
}

export function convertPrecipitation(value: number, useImperial: boolean): { value: number, unit: string } {
    return {
        value: metersToCentimetersOrInches(value, useImperial),
        unit: useImperial ? 'in' : 'cm',
    }
}

export function getUnitName(unitType: UnitType): string {
    switch (unitType) {
        case 'percentage':
            return 'Percentage'
        case 'percentageChange':
            return 'Percentage Change'
        case 'fatalities':
            return 'Fatalities'
        case 'fatalitiesPerCapita':
            return 'Fatalities Per Capita'
        case 'density':
            return 'Density'
        case 'population':
            return 'Population'
        case 'area':
            return 'Area'
        case 'distanceInKm':
            return 'Distance [km]'
        case 'distanceInM':
            return 'Distance [m]'
        case 'democraticMargin':
            return 'Democratic Margin'
        case 'temperature':
            return 'Temperature'
        case 'time':
            return 'Time'
        case 'distancePerYear':
            return 'Distance Per Year'
        case 'contaminantLevel':
            return 'Contaminant Level'
        case 'number':
            return 'Number'
        case 'usd':
            return 'USD'
        case 'minutes':
            return 'Minutes'
        case 'partyPctBlue':
            return 'Party Percentage (Blue)'
        case 'partyPctRed':
            return 'Party Percentage (Red)'
        case 'partyPctOrange':
            return 'Party Percentage (Orange)'
        case 'partyPctTeal':
            return 'Party Percentage (Teal)'
        case 'partyPctGreen':
            return 'Party Percentage (Green)'
        case 'partyPctPurple':
            return 'Party Percentage (Purple)'
        case 'partyChangeBlue':
            return 'Party Change (Blue)'
        case 'partyChangeRed':
            return 'Party Change (Red)'
        case 'partyChangeOrange':
            return 'Party Change (Orange)'
        case 'partyChangeTeal':
            return 'Party Change (Teal)'
        case 'partyChangeGreen':
            return 'Party Change (Green)'
        case 'partyChangePurple':
            return 'Party Change (Purple)'
        case 'leftMargin':
            return 'Left Margin'
    }
}

export function classifyStatistic(statname: string): UnitType {
    if (/20\d{2}GE/.test(statname) || /20\d{2}-20\d{2} Swing/.test(statname)) {
        // Canadian election statistics
        const isSwing = statname.includes('Swing')
        if (statname.includes('Lib %')) {
            return isSwing ? 'partyChangeRed' : 'partyPctRed'
        }
        if (statname.includes('Con %')) {
            return isSwing ? 'partyChangeBlue' : 'partyPctBlue'
        }
        if (statname.includes('NDP %')) {
            return isSwing ? 'partyChangeOrange' : 'partyPctOrange'
        }
        if (statname.includes('BQ %')) {
            return isSwing ? 'partyChangeTeal' : 'partyPctTeal'
        }
        if (statname.includes('Grn %')) {
            return isSwing ? 'partyChangeGreen' : 'partyPctGreen'
        }
        if (statname.includes('PPC %')) {
            return isSwing ? 'partyChangePurple' : 'partyPctPurple'
        }
    }
    if (statname.includes('2-Coalition Margin')) {
        return 'leftMargin'
    }
    if (statname.includes('Change') && (statname.includes('Population') || statname.includes('Density'))) {
        return 'percentageChange'
    }
    if (statname.includes('%') || statname.includes('Change') || statname.includes('(Grade)')) {
        return 'percentage'
    }
    if (statname.includes('Total') && statname.includes('Fatalities')) {
        return 'fatalities'
    }
    if (statname.includes('Fatalities Per Capita')) {
        return 'fatalitiesPerCapita'
    }
    if (statname.includes('Density')) {
        return 'density'
    }
    if (statname.includes('Elevation')) {
        return 'distanceInM'
    }
    if (statname.startsWith('Population')) {
        return 'population'
    }
    if (statname === 'Area') {
        return 'area'
    }
    if (statname.includes('Mean distance')) {
        return 'distanceInKm'
    }
    if (statname.includes('Election') || statname.includes('Swing')) {
        return 'democraticMargin'
    }
    if (statname.includes('high temp') || statname.includes('low temp') || statname.includes('high heat index') || statname.includes('dewpt')) {
        return 'temperature'
    }
    if (statname === 'Mean sunny hours') {
        return 'time'
    }
    if (statname === 'Rainfall' || statname === 'Snowfall [rain-equivalent]') {
        return 'distancePerYear'
    }
    if (statname.includes('Pollution')) {
        return 'contaminantLevel'
    }
    if (statname.includes('(USD)')) {
        return 'usd'
    }
    if (statname.includes('(min)')) {
        return 'minutes'
    }
    return 'number'
}
