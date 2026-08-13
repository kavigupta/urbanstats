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
     * to none and to `significantDigits`); three significant figures wherever they fall; three
     * significant figures of a number known to be at least one; or a duration written as h:mm.
     */
    decimals: number | SignificantDigits | 'significantFigures' | 'precision' | 'hoursMinutes'
    /** Whether groups of three digits are separated. Defaults to true. */
    separators?: boolean
}

interface SignificantDigits {
    significantDigits: number
    minDecimals?: number
    maxDecimals?: number
}

/**
 * One of the units a quantity with these dimensions is written in: the number written is the
 * value in base units times the factor, followed by the name.
 */
interface DisplayScale {
    factor?: number
    divisor?: number
    offset?: number
    name: HumanReadableName
    /** Whether the name is written directly after the number, rather than after a space */
    attached?: boolean
    /** Written immediately before the number, e.g., a dollar sign */
    prefix?: string
    format: NumberFormat
    /**
     * The smallest value in base units written in this scale, so that a quantity is written in
     * the largest of them it reaches. Defaults to zero, i.e., the scale is always usable.
     */
    threshold?: number
    system?: 'metric' | 'imperial'
}

/** Numbers too long to read are abbreviated, e.g., 12.3k rather than 12 345. */
function magnitudeScales(prefix: string | undefined, thousandsThreshold: number): DisplayScale[] {
    const tier = (divisor: number, name: string, threshold: number): DisplayScale =>
        ({ divisor, name, prefix, attached: true, threshold, format: { decimals: 'precision' } })
    return [tier(1e3, 'k', thousandsThreshold), tier(1e6, 'm', 999.5e3), tier(1e9, 'B', 999.5e6)]
}

/**
 * How a quantity of each kind of dimensions is written, smallest scale first. A quantity whose
 * dimensions are not here is written in base units.
 */
const displayScales: Record<string, DisplayScale[] | undefined> = {
    '': [{ name: '', format: { decimals: 'significantFigures', separators: false } }],
    'person^1': [{ name: '', format: { decimals: 0 } }, ...magnitudeScales(undefined, 1e4)],
    'usd^1': [{ name: '', prefix: '$', format: { decimals: 0 } }, ...magnitudeScales('$', 1e3)],
    'fatality^1': [{ name: '', format: { decimals: 0 } }],
    'fatality^1 person^-1': [{ factor: 1e5, name: '/100k', attached: true, format: { decimals: 2, separators: false } }],
    'm^-2 person^1': [
        { factor: 1e6, name: hre`/\u00a0km^{2}`, attached: true, format: { decimals: { significantDigits: 2 } }, system: 'metric' },
        { factor: 1e6 * squareMileInSquareKm, name: hre`/\u00a0mi^{2}`, attached: true, format: { decimals: { significantDigits: 2 } }, system: 'imperial' },
    ],
    'm^2': [
        { name: hre`m^{2}`, format: { decimals: { significantDigits: 3 } }, system: 'metric' },
        { divisor: 1e6, name: hre`km^{2}`, threshold: 1e4, format: { decimals: { significantDigits: 3 } }, system: 'metric' },
        { factor: 640 / 1e6, divisor: squareMileInSquareKm, name: 'acres', format: { decimals: { significantDigits: 3 } }, system: 'imperial' },
        { divisor: 1e6 * squareMileInSquareKm, name: hre`mi^{2}`, threshold: 1e6 * squareMileInSquareKm, format: { decimals: { significantDigits: 3 } }, system: 'imperial' },
    ],
    'm^1': [
        { name: 'm', format: { decimals: 0 }, system: 'metric' },
        { divisor: 1e3, name: 'km', threshold: 1e3, format: { decimals: 2, separators: false }, system: 'metric' },
        { factor: 3.28084, name: 'ft', format: { decimals: 0 }, system: 'imperial' },
        { divisor: 1e3 * mileInKm, name: 'mi', threshold: 1e3 * mileInKm, format: { decimals: 2, separators: false }, system: 'imperial' },
    ],
    // a duration is written as h:mm, dropping the hours when there are none
    's^1': [{ divisor: 60 * 60, name: '', format: { decimals: 'hoursMinutes' } }],
    'm^1 s^-1': [
        { factor: 100 * secondsPerYear, name: 'cm/yr', format: { decimals: 1, separators: false }, system: 'metric' },
        { factor: 100 * secondsPerYear, divisor: 2.54, name: 'in/yr', format: { decimals: 1, separators: false }, system: 'imperial' },
    ],
    'g^1 m^-3': [{ factor: 1e6, name: hre`\u03bcg/m^{3}`, format: { decimals: 2, separators: false } }],
}

function baseUnitScale(scales: { baseUnit: BaseUnit, power: number }[]): DisplayScale {
    const name = scales
        .filter(({ power }) => power !== 0)
        .sort((a, b) => a.power !== b.power ? b.power - a.power : (a.baseUnit < b.baseUnit ? -1 : 1))
        .flatMap(({ baseUnit, power }, index): HumanReadableElement[] => [
            ...index === 0 ? [] : [{ type: 'atom', value: '·' } satisfies HumanReadableElement],
            { type: 'atom', value: baseUnit },
            ...power === 1 ? [] : [{ type: 'superscript', value: [{ type: 'atom', value: power.toString() }] } satisfies HumanReadableElement],
        ])
    return { name, format: { decimals: 'significantFigures' } }
}

const percentScale: DisplayScale = { factor: 100, name: '%', attached: true, format: { decimals: 2, separators: false } }
/** A margin is written as the size of the lead, which is given to more digits the closer it is. */
const marginScale: DisplayScale = { ...percentScale, format: { decimals: { significantDigits: 3, minDecimals: 1, maxDecimals: 4 }, separators: false } }

const partyLabels = {
    democratic: { positive: 'D', negative: 'R' },
    // the left is drawn in red, as it is outside the US
    left: { positive: 'L', negative: 'R' },
} as const

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
const partyHues = {
    democratic: { positive: 'blue', negative: 'red' },
    left: { positive: 'red', negative: 'blue' },
} as const satisfies Record<string, { positive: Hue, negative: Hue }>
/* eslint-enable no-restricted-syntax */

export interface ReaderSettings {
    useImperial?: boolean
    temperatureUnit?: string
}

function scalesFor(unit: Unit, settings: ReaderSettings): DisplayScale[] {
    switch (unit.kind) {
        case 'unknown':
            return [{ name: '', format: { decimals: 'significantFigures', separators: false } }]
        case 'raw-percentage':
            return [percentScale]
        case 'delta-percentage':
            return [unit.partySystem === undefined ? percentScale : marginScale]
        case 'temperature-F':
            return settings.temperatureUnit === 'celsius'
                ? [{ factor: 5 / 9, offset: 32, name: '°C', format: { decimals: 1, separators: false } }]
                : [{ name: '°F', format: { decimals: 1, separators: false } }]
        case 'dimensionfull':
            const forDimensions = displayScales[renderDimensions(unit.scales)] ?? [baseUnitScale(unit.scales)]
            return forDimensions.filter(scale => scale.system !== (settings.useImperial === true ? 'metric' : 'imperial'))
    }
}

/**
 * The scale a value is written in: the largest of the unit's applicable scales that it reaches.
 */
function scaleFor(valueInBaseUnits: number, unit: Unit, settings: ReaderSettings): DisplayScale {
    const scales = scalesFor(unit, settings)
    let selected = scales[0]
    for (const scale of scales) {
        if (Math.abs(valueInBaseUnits) >= (scale.threshold ?? 0)) {
            selected = scale
        }
    }
    return selected
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
    let written: string
    if (decimals === 'significantFigures') {
        written = formatToSignificantFigures(value, 3)
    }
    else if (decimals === 'precision') {
        written = value.toPrecision(3)
    }
    else {
        written = value.toFixed(typeof decimals === 'number' ? decimals : decimalPlaces(value, decimals))
    }
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
    const scaled = magnitude * (scale.factor ?? 1) / (scale.divisor ?? 1)
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
