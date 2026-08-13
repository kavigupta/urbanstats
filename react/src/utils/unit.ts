import { HueColors } from '../page_template/color-themes'

import { HumanReadableElement, HumanReadableName } from './human-readable-name'
import { hre } from './human-readable-template'
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
    | { kind: 'delta-percentage', partySystem?: 'democratic' | 'left', partyColor?: Hue }
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
const squareMileInSquareKm = mileInKm * mileInKm

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
const storedUnits: Record<UnitType, StoredUnit> = {
    percentage: { unit: { kind: 'raw-percentage' }, toBaseUnits: 1 },
    percentageChange: { unit: { kind: 'delta-percentage' }, toBaseUnits: 1 },
    democraticMargin: { unit: { kind: 'delta-percentage', partySystem: 'democratic' }, toBaseUnits: 1 },
    leftMargin: { unit: { kind: 'delta-percentage', partySystem: 'left' }, toBaseUnits: 1 },
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
 * One of the units a quantity of some dimensions can be written in, e.g., a kilometer, or people
 * per square mile.
 */
interface LadderUnit {
    name: HumanReadableName
    /** How many base units one of it is: a square kilometer is 1e6 square meters */
    size: number
    /**
     * What writing a quantity in it costs, before the cost of the number that leaves. Zero for
     * the unit a quantity of these dimensions is ordinarily written in, and more for one that
     * only earns its place by making the number shorter.
     */
    cost: number
    /** Whether the name is written directly after the number, as an abbreviation is */
    attached?: boolean
    /** Written immediately before the number, e.g., a dollar sign */
    prefix?: string
    /** Subtracted before dividing, for a unit whose zero is somewhere else */
    offset?: number
    /** How the number is written once it is in this unit */
    format: NumberFormat
}

/** An abbreviation saves digits, but a number that does not need saving reads better without. */
const abbreviated = 1
/** A coarser unit is worth reaching for only once the finer one runs to too many digits. */
const coarser = 0.5

const threeFigures: NumberFormat = { decimals: 'significantFigures' }
const threeDigits: NumberFormat = { decimals: { significantDigits: 3 } }
const whole: NumberFormat = { decimals: 0 }

/** Thousands, millions and billions, for a quantity that is counted. */
function abbreviations(prefix?: string): LadderUnit[] {
    return [
        { name: 'k', size: 1e3, cost: abbreviated, attached: true, prefix, format: threeFigures },
        { name: 'm', size: 1e6, cost: abbreviated, attached: true, prefix, format: threeFigures },
        { name: 'B', size: 1e9, cost: abbreviated, attached: true, prefix, format: threeFigures },
    ]
}

/**
 * The units a quantity of each dimensions can be written in. A quantity is written in whichever
 * of them costs least once the number it leaves is taken into account, so these are ladders
 * rather than a single choice: an area of a few hectares belongs in square meters and one the
 * size of a country in square kilometers.
 */
const metricLadders: Record<string, LadderUnit[] | undefined> = {
    '': [{ name: '', size: 1, cost: 0, format: { decimals: 'significantFigures', separators: false } }],
    'person^1': [{ name: '', size: 1, cost: 0, format: whole }, ...abbreviations()],
    // money is counted in thousands sooner than people are, and never written out in full
    'usd^1': [{ name: '', size: 1, cost: 0, prefix: '$', format: whole }, ...abbreviations('$')],
    'fatality^1': [{ name: '', size: 1, cost: 0, format: whole }],
    'fatality^1 person^-1': [
        // a rate per person only reads well for something that happens to most of them
        { name: '/person', size: 1, cost: abbreviated, attached: true, format: threeDigits },
        { name: '/100k', size: 1e-5, cost: 0, attached: true, format: { decimals: 2, separators: false } },
    ],
    'm^1': [
        { name: 'm', size: 1, cost: 0, format: whole },
        { name: 'km', size: 1e3, cost: coarser, format: { decimals: 2, separators: false } },
    ],
    'm^2': [
        { name: hre`m^{2}`, size: 1, cost: 0, format: threeDigits },
        { name: hre`km^{2}`, size: 1e6, cost: 0, format: threeDigits },
    ],
    'm^-2 person^1': [
        { name: hre`/\u00a0km^{2}`, size: 1e-6, cost: 0, attached: true, format: { decimals: { significantDigits: 2 } } },
    ],
    // a duration is written as h:mm, dropping the hours when there are none
    's^1': [{ name: '', size: 60 * 60, cost: 0, format: { decimals: 'hoursMinutes' } }],
    'm^1 s^-1': [{ name: 'cm/yr', size: 0.01 / secondsPerYear, cost: 0, format: { decimals: 1, separators: false } }],
    'g^1 m^-3': [{ name: hre`\u03bcg/m^{3}`, size: 1e-6, cost: 0, format: { decimals: 2, separators: false } }],
}

const imperialLadders: Record<string, LadderUnit[] | undefined> = {
    ...metricLadders,
    'm^1': [
        { name: 'ft', size: 1 / 3.28084, cost: 0, format: whole },
        { name: 'mi', size: 1e3 * mileInKm, cost: coarser, format: { decimals: 2, separators: false } },
    ],
    'm^2': [
        { name: 'acres', size: 1e6 * squareMileInSquareKm / 640, cost: 0, format: threeDigits },
        { name: hre`mi^{2}`, size: 1e6 * squareMileInSquareKm, cost: 0, format: threeDigits },
    ],
    'm^-2 person^1': [
        { name: hre`/\u00a0mi^{2}`, size: 1e-6 / squareMileInSquareKm, cost: 0, attached: true, format: { decimals: { significantDigits: 2 } } },
    ],
    'm^1 s^-1': [{ name: 'in/yr', size: 0.0254 / secondsPerYear, cost: 0, format: { decimals: 1, separators: false } }],
}

/**
 * What a number costs to read in a given unit: one for every digit past the third before the
 * point, and one for the point itself and every leading zero after it. The number is written out
 * to count it, so that a value that rounds up into another unit, such as 999.5 thousand people,
 * costs what a million costs rather than what nine hundred thousand costs.
 */
function digitCost(value: number, format: NumberFormat): number {
    const written = formatNumber(value, { ...format, separators: false }).replaceAll('-', '')
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

interface Dimension { baseUnit: BaseUnit, power: number }

/** A quantity of dimensions with no ladder is written in the base units themselves. */
function baseUnitLadder(scales: Dimension[]): LadderUnit {
    const name = scales
        .filter(({ power }) => power !== 0)
        .sort((a, b) => a.power !== b.power ? b.power - a.power : (a.baseUnit < b.baseUnit ? -1 : 1))
        .flatMap(({ baseUnit, power }, index): HumanReadableElement[] => [
            ...index === 0 ? [] : [{ type: 'atom', value: '·' } satisfies HumanReadableElement],
            { type: 'atom', value: baseUnit },
            ...power === 1 ? [] : [{ type: 'superscript', value: [{ type: 'atom', value: power.toString() }] } satisfies HumanReadableElement],
        ])
    return { name, size: 1, cost: 0, format: { decimals: 'significantFigures' } }
}

/**
 * The unit a value is best written in: the one on its ladder that costs least once the number it
 * leaves behind is taken into account.
 */
function bestUnit(valueInBaseUnits: number, scales: Dimension[], settings: ReaderSettings): LadderUnit {
    const ladder = (settings.useImperial === true ? imperialLadders : metricLadders)[renderDimensions(scales)]
    if (ladder === undefined) {
        return baseUnitLadder(scales)
    }
    let best = ladder[0]
    let bestCost = Infinity
    for (const unit of ladder) {
        const cost = unit.cost + digitCost(valueInBaseUnits / unit.size, unit.format)
        if (cost < bestCost) {
            best = unit
            bestCost = cost
        }
    }
    return best
}

const percent: LadderUnit = { name: '%', size: 1 / 100, cost: 0, attached: true, format: { decimals: 2, separators: false } }
/** A margin is written as the size of the lead, which is given to more digits the closer it is. */
const margin: LadderUnit = { ...percent, format: { decimals: { significantDigits: 3, minDecimals: 1, maxDecimals: 4 }, separators: false } }

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
function scaleFor(valueInBaseUnits: number, unit: Unit, settings: ReaderSettings): LadderUnit {
    switch (unit.kind) {
        case 'unknown':
            return { name: '', size: 1, cost: 0, format: { decimals: 'significantFigures', separators: false } }
        case 'raw-percentage':
            return percent
        case 'delta-percentage':
            return unit.partySystem === undefined ? percent : margin
        case 'temperature-F':
            return settings.temperatureUnit === 'celsius'
                ? { name: '°C', size: 9 / 5, offset: 32, cost: 0, format: { decimals: 1, separators: false } }
                : { name: '°F', size: 1, cost: 0, format: { decimals: 1, separators: false } }
        case 'dimensionfull':
            return bestUnit(valueInBaseUnits, unit.scales, settings)
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

function formatNumber(value: number, { decimals, separators }: NumberFormat): string {
    if (!isFinite(value)) {
        return value.toString()
    }
    if (decimals === 'hoursMinutes') {
        const totalMinutes = Math.round(Math.abs(value) * 60)
        const sign = value < 0 && totalMinutes > 0 ? '-' : ''
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        return hours > 0 ? `${sign}${hours}:${minutes.toString().padStart(2, '0')}` : `${sign}${minutes}`
    }
    const written = decimals === 'significantFigures'
        ? formatToSignificantFigures(value, 3)
        : value.toFixed(typeof decimals === 'number' ? decimals : decimalPlaces(value, decimals))
    return separators === false ? written : separateDigits(written)
}

/** The party a quantity written as a lead belongs to, if it is written as one. */
function party(unit: Unit, value: number): { label: string, hue: Hue } | undefined {
    if (unit.kind !== 'delta-percentage' || unit.partySystem === undefined) {
        return undefined
    }
    const side = value > 0 ? 'positive' : 'negative'
    return { label: partyLabels[unit.partySystem][side], hue: partyHues[unit.partySystem][side] }
}

function hueFor(unit: Unit, value: number): Hue | undefined {
    switch (unit.kind) {
        case 'raw-percentage':
            return unit.partyColor
        case 'delta-percentage':
            return party(unit, value)?.hue ?? unit.partyColor
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
    number: string
    name: HumanReadableName
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
    const written = { name: scale.name, attached: scale.attached ?? false, hue }
    if (hue !== undefined && !isFinite(value)) {
        // a quantity written in a party's color has no party, and no color, when it is missing
        return { ...written, number: 'N/A', hue: undefined }
    }
    const lead = party(unit, value)
    const magnitude = (lead === undefined ? inBaseUnits : Math.abs(inBaseUnits)) - (scale.offset ?? 0)
    const scaled = magnitude / scale.size
    const explicitSign = unit.kind === 'delta-percentage' && lead === undefined && scaled >= 0 ? '+' : ''
    return { ...written, number: `${lead === undefined ? '' : `${lead.label}+`}${explicitSign}${scale.prefix ?? ''}${formatNumber(scaled, scale.format)}` }
}

/**
 * Whether a comparison against a quantity of this unit reads as its opposite, which is the case
 * below zero for a lead, which is written as a size rather than as a signed number.
 */
export function flipsInequality(unit: Unit, value: number): boolean {
    return unit.kind === 'delta-percentage' && unit.partySystem !== undefined && value <= 0
}

/**
 * A unit name as it is written after a number, e.g., " hours" but "%".
 */
export function unitSuffix(name: HumanReadableName, attached: boolean): HumanReadableElement[] {
    const elements = typeof name === 'string' ? (name === '' ? [] : [{ type: 'atom', value: name } satisfies HumanReadableElement]) : name
    return elements.length === 0 || attached ? elements : [{ type: 'atom', value: ' ' }, ...elements]
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
