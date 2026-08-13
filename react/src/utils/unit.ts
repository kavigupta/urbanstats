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
 * How the number itself is written.
 */
export interface NumberFormat {
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

/**
 * One of the units a quantity can be written in. The number written is
 * (value - offset) * factor / divisor, followed by the unit's name. Both a factor and a divisor
 * because which one a conversion is written with decides how it rounds.
 */
interface SignificantDigits {
    significantDigits: number
    minDecimals?: number
    maxDecimals?: number
}

export interface UnitScale {
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
     * The smallest value written in this scale, so that a quantity is written in the largest of
     * its scales that it reaches. Defaults to zero, i.e., the scale is always usable.
     */
    threshold?: number
    /** Only used by a reader reading in these units */
    system?: 'metric' | 'imperial'
    temperature?: 'fahrenheit' | 'celsius'
}

/**
 * How the written number is marked up, for quantities that are more than a number, such as a
 * party's share of the vote or the margin between two parties.
 */
export interface Emphasis {
    /** Non-negative values are written with a leading plus sign */
    explicitSign?: boolean
    /**
     * The number is written as a magnitude labelled by its sign, e.g., D+12.3 against R+8.1.
     * Such a quantity is compared by its labelled magnitude, so inequalities flip below zero.
     */
    signLabels?: { positive: string, negative: string }
    /** The hue the number is written in, either the same always or one per sign */
    hue?: Hue | { positive: Hue, negative: Hue }
}

/**
 * How a quantity is written: the units it can be written in, and the markup they are written with.
 */
export interface Unit {
    scales: UnitScale[]
    emphasis?: Emphasis
}

const mileInKm = 1.60934
const squareMileInSquareKm = mileInKm * mileInKm
const footPerM = 3.28084

const percent: UnitScale = { factor: 100, name: '%', attached: true, format: { decimals: 2, separators: false } }

/** A margin is written as the size of the lead, labelled with whoever holds it. */
function margin(signLabels: { positive: string, negative: string }, hue: { positive: Hue, negative: Hue }): Unit {
    return {
        scales: [{ ...percent, format: { decimals: { significantDigits: 3, minDecimals: 1, maxDecimals: 4 }, separators: false } }],
        emphasis: { signLabels, hue },
    }
}

/** Numbers too long to read are abbreviated, e.g., 12.3k rather than 12 345. */
function magnitudeScales(prefix: string | undefined, thousandsThreshold: number): UnitScale[] {
    const tier = (divisor: number, name: string, threshold: number): UnitScale =>
        ({ divisor, name, prefix, attached: true, threshold, format: { decimals: 'precision' } })
    return [tier(1e3, 'k', thousandsThreshold), tier(1e6, 'm', 999.5e3), tier(1e9, 'B', 999.5e6)]
}

function partyShare(hue: Hue): Unit {
    return { scales: [percent], emphasis: { hue } }
}

function partyChange(hue: Hue): Unit {
    return { scales: [percent], emphasis: { hue, explicitSign: true } }
}

/* eslint-disable no-restricted-syntax -- these name the theme's hues, they are not css colors */
const units: Record<UnitType, Unit> = {
    percentage: { scales: [percent] },
    percentageChange: { scales: [percent], emphasis: { explicitSign: true } },
    // the left is drawn in red, as it is outside the US
    democraticMargin: margin({ positive: 'D', negative: 'R' }, { positive: 'blue', negative: 'red' }),
    leftMargin: margin({ positive: 'L', negative: 'R' }, { positive: 'red', negative: 'blue' }),
    partyPctBlue: partyShare('blue'),
    partyPctRed: partyShare('red'),
    partyPctOrange: partyShare('orange'),
    partyPctTeal: partyShare('cyan'),
    partyPctGreen: partyShare('green'),
    partyPctPurple: partyShare('purple'),
    partyChangeBlue: partyChange('blue'),
    partyChangeRed: partyChange('red'),
    partyChangeOrange: partyChange('orange'),
    partyChangeTeal: partyChange('cyan'),
    partyChangeGreen: partyChange('green'),
    partyChangePurple: partyChange('purple'),
    number: { scales: [{ name: '', format: { decimals: 'significantFigures', separators: false } }] },
    population: { scales: [{ name: '', format: { decimals: 0 } }, ...magnitudeScales(undefined, 1e4)] },
    usd: { scales: [{ name: '', prefix: '$', format: { decimals: 0 } }, ...magnitudeScales('$', 1e3)] },
    fatalities: { scales: [{ name: '', format: { decimals: 0 } }] },
    fatalitiesPerCapita: { scales: [{ factor: 1e5, name: '/100k', attached: true, format: { decimals: 2, separators: false } }] },
    density: {
        scales: [
            { name: hre`/\u00a0km^{2}`, attached: true, format: { decimals: { significantDigits: 2 } }, system: 'metric' },
            { factor: squareMileInSquareKm, name: hre`/\u00a0mi^{2}`, attached: true, format: { decimals: { significantDigits: 2 } }, system: 'imperial' },
        ],
    },
    area: {
        scales: [
            { factor: 1e6, name: hre`m^{2}`, format: { decimals: { significantDigits: 3 } }, system: 'metric' },
            { name: hre`km^{2}`, threshold: 0.01, format: { decimals: { significantDigits: 3 } }, system: 'metric' },
            { divisor: squareMileInSquareKm, factor: 640, name: 'acres', format: { decimals: { significantDigits: 3 } }, system: 'imperial' },
            { divisor: squareMileInSquareKm, name: hre`mi^{2}`, threshold: squareMileInSquareKm, format: { decimals: { significantDigits: 3 } }, system: 'imperial' },
        ],
    },
    distanceInKm: {
        scales: [
            { name: 'km', format: { decimals: 2, separators: false }, system: 'metric' },
            { divisor: mileInKm, name: 'mi', format: { decimals: 2, separators: false }, system: 'imperial' },
        ],
    },
    distanceInM: {
        scales: [
            { name: 'm', format: { decimals: 0 }, system: 'metric' },
            { factor: footPerM, name: 'ft', format: { decimals: 0 }, system: 'imperial' },
        ],
    },
    temperature: {
        scales: [
            { name: '°F', format: { decimals: 1, separators: false }, temperature: 'fahrenheit' },
            { factor: 5 / 9, offset: 32, name: '°C', format: { decimals: 1, separators: false }, temperature: 'celsius' },
        ],
    },
    time: { scales: [{ name: '', format: { decimals: 'hoursMinutes' } }] },
    minutes: { scales: [{ divisor: 60, name: '', format: { decimals: 'hoursMinutes' } }] },
    distancePerYear: {
        scales: [
            { factor: 100, name: 'cm/yr', format: { decimals: 1, separators: false }, system: 'metric' },
            { factor: 100, divisor: 2.54, name: 'in/yr', format: { decimals: 1, separators: false }, system: 'imperial' },
        ],
    },
    contaminantLevel: { scales: [{ name: hre`\u03bcg/m^{3}`, format: { decimals: 2, separators: false } }] },
}
/* eslint-enable no-restricted-syntax */

export function unitTypeToUnit(unitType: UnitType): Unit {
    return units[unitType]
}

export interface ReaderSettings {
    useImperial?: boolean
    temperatureUnit?: string
}

function scaleApplies(scale: UnitScale, settings: ReaderSettings): boolean {
    if (scale.system !== undefined && scale.system !== (settings.useImperial === true ? 'imperial' : 'metric')) {
        return false
    }
    return scale.temperature === undefined || scale.temperature === (settings.temperatureUnit ?? 'fahrenheit')
}

/**
 * The scale a value is written in: the largest of the unit's applicable scales that it reaches.
 */
export function scaleFor(value: number, unit: Unit, settings: ReaderSettings): UnitScale {
    const applicable = unit.scales.filter(scale => scaleApplies(scale, settings))
    let selected = applicable[0]
    for (const scale of applicable) {
        if (Math.abs(value) >= (scale.threshold ?? 0)) {
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

function hueFor(emphasis: Emphasis, value: number): Hue | undefined {
    if (emphasis.hue === undefined || typeof emphasis.hue === 'string') {
        return emphasis.hue
    }
    return value > 0 ? emphasis.hue.positive : emphasis.hue.negative
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

export function writeQuantity(value: number, unit: Unit, settings: ReaderSettings = {}): WrittenQuantity {
    const scale = scaleFor(value, unit, settings)
    const emphasis = unit.emphasis ?? {}
    const hue = hueFor(emphasis, value)
    const written = { name: scale.name, attached: scale.attached ?? false, hue }
    if (hue !== undefined && !isFinite(value)) {
        // a quantity written in a party's color has no party, and no color, when it is missing
        return { ...written, number: 'N/A', hue: undefined }
    }
    const labelled = emphasis.signLabels !== undefined
    const scaled = ((labelled ? Math.abs(value) : value) - (scale.offset ?? 0)) * (scale.factor ?? 1) / (scale.divisor ?? 1)
    const label = labelled ? `${value > 0 ? emphasis.signLabels!.positive : emphasis.signLabels!.negative}+` : ''
    const sign = emphasis.explicitSign === true && scaled >= 0 ? '+' : ''
    return { ...written, number: `${label}${sign}${scale.prefix ?? ''}${formatNumber(scaled, scale.format)}` }
}

/**
 * Whether a comparison against a quantity of this unit reads as its opposite, which is the case
 * below zero for a quantity written as a magnitude labelled by its sign.
 */
export function flipsInequality(unit: Unit, value: number): boolean {
    return unit.emphasis?.signLabels !== undefined && value <= 0
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
