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

/**
 * The exponent of each base dimension, e.g., a density is { person: 1, length: -2 }.
 * Dimensionless is {}.
 */
export type Dimensions = Record<string, number>

/**
 * The unit a quantity is measured in: its dimensions, and the multiplier that converts a
 * stored value into base units (person, meter, second, dollar, gram, fatality, degree
 * fahrenheit). E.g., a density is stored per square kilometer, so its multiplier is 1e-6.
 */
export interface Unit {
    dimensions: Dimensions
    multiplier: number
    /**
     * Set for quantities that are displayed as something other than a scaled number, such as
     * percentages and election margins. Only preserved by operations that keep the quantity the
     * same kind of thing, i.e., addition and subtraction.
     */
    presentation?: PresentationUnitType
}

const presentationUnitTypes = [
    'percentage',
    'percentageChange',
    'democraticMargin',
    'leftMargin',
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
    'temperature',
] as const satisfies readonly UnitType[]

export type PresentationUnitType = typeof presentationUnitTypes[number]

function presentationOf(unitType: UnitType): PresentationUnitType | undefined {
    return (presentationUnitTypes as readonly UnitType[]).includes(unitType) ? unitType as PresentationUnitType : undefined
}

const secondsPerYear = 365.25 * 24 * 60 * 60
const meterPerMile = 1609.34
const meterPerFoot = 1 / 3.28084
const squareMeterPerSquareMile = meterPerMile * meterPerMile
const squareMeterPerAcre = squareMeterPerSquareMile / 640

const dimensionsAndMultiplier: Record<UnitType, { dimensions: Dimensions, multiplier: number }> = {
    percentage: { dimensions: {}, multiplier: 1 },
    percentageChange: { dimensions: {}, multiplier: 1 },
    democraticMargin: { dimensions: {}, multiplier: 1 },
    leftMargin: { dimensions: {}, multiplier: 1 },
    partyPctBlue: { dimensions: {}, multiplier: 1 },
    partyPctRed: { dimensions: {}, multiplier: 1 },
    partyPctOrange: { dimensions: {}, multiplier: 1 },
    partyPctTeal: { dimensions: {}, multiplier: 1 },
    partyPctGreen: { dimensions: {}, multiplier: 1 },
    partyPctPurple: { dimensions: {}, multiplier: 1 },
    partyChangeBlue: { dimensions: {}, multiplier: 1 },
    partyChangeRed: { dimensions: {}, multiplier: 1 },
    partyChangeOrange: { dimensions: {}, multiplier: 1 },
    partyChangeTeal: { dimensions: {}, multiplier: 1 },
    partyChangeGreen: { dimensions: {}, multiplier: 1 },
    partyChangePurple: { dimensions: {}, multiplier: 1 },
    number: { dimensions: {}, multiplier: 1 },
    population: { dimensions: { person: 1 }, multiplier: 1 },
    fatalities: { dimensions: { fatality: 1 }, multiplier: 1 },
    fatalitiesPerCapita: { dimensions: { fatality: 1, person: -1 }, multiplier: 1 },
    density: { dimensions: { person: 1, length: -2 }, multiplier: 1e-6 },
    area: { dimensions: { length: 2 }, multiplier: 1e6 },
    distanceInKm: { dimensions: { length: 1 }, multiplier: 1e3 },
    distanceInM: { dimensions: { length: 1 }, multiplier: 1 },
    // temperature is affine rather than scalable, so it is only ever displayed via its presentation
    temperature: { dimensions: { temperature: 1 }, multiplier: 1 },
    time: { dimensions: { time: 1 }, multiplier: 60 * 60 },
    minutes: { dimensions: { time: 1 }, multiplier: 60 },
    distancePerYear: { dimensions: { length: 1, time: -1 }, multiplier: 1 / secondsPerYear },
    contaminantLevel: { dimensions: { mass: 1, length: -3 }, multiplier: 1e-6 },
    usd: { dimensions: { money: 1 }, multiplier: 1 },
}

export function unitTypeToUnit(unitType: UnitType): Unit {
    const presentation = presentationOf(unitType)
    const { dimensions, multiplier } = dimensionsAndMultiplier[unitType]
    return presentation === undefined ? { dimensions, multiplier } : { dimensions, multiplier, presentation }
}

export function renderDimensions(dimensions: Dimensions): string {
    return Object.entries(dimensions)
        .filter(([, exponent]) => exponent !== 0)
        .sort(([a], [b]) => a < b ? -1 : 1)
        .map(([base, exponent]) => `${base}^${exponent}`)
        .join(' ')
}

/**
 * A unit a quantity can be displayed in. `multiplier` is its size in base units, so a value in
 * base units is divided by it to get the displayed number.
 */
interface DisplayUnit {
    multiplier: number
    name: HumanReadableName
    /** Rendered immediately before the number, e.g., a dollar sign */
    prefix?: string
    /** Whether non-negative values are rendered with a leading plus sign */
    signed?: boolean
    /**
     * Whether this is a magnitude prefix on the unit below it, such as thousands, rather than a
     * unit in its own right.
     */
    tier?: boolean
    /** Whether groups of three digits are separated. Defaults to true. */
    separators?: boolean
    /** Whether the name is written directly after the number, rather than after a space */
    attached?: boolean
    /**
     * Decimal places: a fixed count, 'sigFigs' for 3 significant figures, 'precision' for 3
     * significant figures of a number that is at least 1, 'hoursMinutes' for a duration written
     * as h:mm, or a number of significant digits before the decimal point counts against the
     * places shown.
     */
    decimals: number | 'sigFigs' | 'precision' | 'hoursMinutes' | { significantDigits: number }
    /**
     * The smallest value (in base units) displayed in this unit. Defaults to just below the
     * multiplier, i.e., the unit is used once the displayed number reaches 1.
     */
    threshold?: number
    system?: 'metric' | 'imperial'
}

/**
 * Abbreviations for large numbers, which each unit below either uses or writes out in full.
 */
function magnitudeTiers(prefix: string | undefined, thousandsThreshold: number): DisplayUnit[] {
    return [
        { multiplier: 1e3, name: 'k', prefix, decimals: 'precision', threshold: thousandsThreshold, tier: true, attached: true },
        { multiplier: 1e6, name: 'm', prefix, decimals: 'precision', threshold: 999.5e3, tier: true, attached: true },
        { multiplier: 1e9, name: 'B', prefix, decimals: 'precision', threshold: 999.5e6, tier: true, attached: true },
    ]
}

/**
 * The units each kind of quantity can be displayed in, smallest first. The largest one the value
 * reaches is the one used, so 600 minutes is displayed as 10 hours.
 */
const displayUnits: Record<string, DisplayUnit[] | undefined> = {
    '': [{ multiplier: 1, name: '', decimals: 'sigFigs', separators: false }],
    'person^1': [{ multiplier: 1, name: '', decimals: 0 }, ...magnitudeTiers(undefined, 1e4)],
    'money^1': [{ multiplier: 1, name: '', prefix: '$', decimals: 0 }, ...magnitudeTiers('$', 1e3)],
    'length^1': [
        { multiplier: 1, name: 'm', decimals: 0, system: 'metric' },
        { multiplier: 1e3, name: 'km', decimals: 2, system: 'metric' },
        { multiplier: meterPerFoot, name: 'ft', decimals: 0, system: 'imperial' },
        { multiplier: meterPerMile, name: 'mi', decimals: 2, system: 'imperial' },
    ],
    'length^2': [
        { multiplier: 1, name: hre`m^{2}`, decimals: { significantDigits: 3 }, system: 'metric' },
        { multiplier: 1e6, name: hre`km^{2}`, decimals: { significantDigits: 3 }, threshold: 1e4, system: 'metric' },
        { multiplier: squareMeterPerAcre, name: 'acres', decimals: { significantDigits: 3 }, system: 'imperial' },
        { multiplier: squareMeterPerSquareMile, name: hre`mi^{2}`, decimals: { significantDigits: 3 }, system: 'imperial' },
    ],
    'length^-2 person^1': [
        { multiplier: 1e-6, name: hre`/\u00a0km^{2}`, decimals: { significantDigits: 2 }, attached: true, system: 'metric' },
        { multiplier: 1 / squareMeterPerSquareMile, name: hre`/\u00a0mi^{2}`, decimals: { significantDigits: 2 }, attached: true, system: 'imperial' },
    ],
    // durations are written as h:mm, dropping the hours when there are none
    'time^1': [{ multiplier: 60 * 60, name: '', decimals: 'hoursMinutes' }],
    'length^1 time^-1': [
        { multiplier: 0.01 / secondsPerYear, name: 'cm/yr', decimals: 1, separators: false, system: 'metric' },
        { multiplier: 0.0254 / secondsPerYear, name: 'in/yr', decimals: 1, separators: false, system: 'imperial' },
    ],
    'length^-3 mass^1': [{ multiplier: 1e-6, name: hre`\u03bcg/m^{3}`, decimals: 2, separators: false }],
    'fatality^1': [{ multiplier: 1, name: '', decimals: 0 }],
    'fatality^1 person^-1': [{ multiplier: 1e-5, name: '/100k', decimals: 2, separators: false, attached: true }],
}

/**
 * Quantities that are displayed in the unit they are stored in, rather than in whichever unit
 * fits their magnitude: an elevation stays in meters, and a distance stays in kilometers, however
 * large or small it is. Keyed by dimensions and stored multiplier.
 */
const displayUnitsForStoredUnit: Record<string, DisplayUnit[] | undefined> = {
    'length^1@1': [
        { multiplier: 1, name: 'm', decimals: 0, system: 'metric' },
        { multiplier: meterPerFoot, name: 'ft', decimals: 0, system: 'imperial' },
    ],
    'length^1@1000': [
        { multiplier: 1e3, name: 'km', decimals: 2, separators: false, system: 'metric' },
        { multiplier: meterPerMile, name: 'mi', decimals: 2, separators: false, system: 'imperial' },
    ],
}

const percentDisplay: DisplayUnit[] = [{ multiplier: 0.01, name: '%', decimals: 2, separators: false, attached: true }]
const percentChangeDisplay: DisplayUnit[] = [{ multiplier: 0.01, name: '%', decimals: 2, separators: false, signed: true, attached: true }]

/**
 * How each specially displayed quantity is rendered as a number. The ones that are rendered with
 * party colors are overridden by the components that can render them.
 */
const presentationDisplayUnits: Record<PresentationUnitType, DisplayUnit[]> = {
    percentage: percentDisplay,
    democraticMargin: percentDisplay,
    leftMargin: percentDisplay,
    partyPctBlue: percentDisplay,
    partyPctRed: percentDisplay,
    partyPctOrange: percentDisplay,
    partyPctTeal: percentDisplay,
    partyPctGreen: percentDisplay,
    partyPctPurple: percentDisplay,
    percentageChange: percentChangeDisplay,
    partyChangeBlue: percentChangeDisplay,
    partyChangeRed: percentChangeDisplay,
    partyChangeOrange: percentChangeDisplay,
    partyChangeTeal: percentChangeDisplay,
    partyChangeGreen: percentChangeDisplay,
    partyChangePurple: percentChangeDisplay,
    temperature: [{ multiplier: 1, name: '°F', decimals: 1 }],
}

/**
 * The base units themselves, used to name a quantity whose dimensions have no display units.
 */
const baseUnitNames: Record<string, string> = {
    person: 'person',
    length: 'm',
    time: 's',
    money: '$',
    mass: 'g',
    fatality: 'fatalities',
    temperature: '°F',
}

function nameOfDimensions(dimensions: Dimensions): HumanReadableName {
    return Object.entries(dimensions)
        .sort(([a, aExponent], [b, bExponent]) => aExponent !== bExponent ? bExponent - aExponent : (a < b ? -1 : 1))
        .flatMap(([base, exponent], index): HumanReadableElement[] => [
            ...index === 0 ? [] : [{ type: 'atom', value: '·' } satisfies HumanReadableElement],
            { type: 'atom', value: baseUnitNames[base] ?? base },
            ...exponent === 1 ? [] : [{ type: 'superscript', value: [{ type: 'atom', value: exponent.toString() }] } satisfies HumanReadableElement],
        ])
}

// separateNumber groups digits from the left, so it needs the integer part on its own
function separateDigits(value: string): string {
    const sign = value.startsWith('-') ? '-' : ''
    const [integerPart, ...rest] = value.slice(sign.length).split('.')
    return sign + [separateNumber(integerPart), ...rest].join('.')
}

// e.g., with 3 significant digits, 123.4 has no decimal places and 1.234 has two
function decimalPlacesFor(value: number, significantDigits: number): number {
    const digitsBeforePoint = Math.max(0, Math.ceil(Math.log10(Math.abs(value))))
    return Math.max(0, significantDigits - digitsBeforePoint)
}

function formatQuantity(value: number, displayUnit: { decimals: DisplayUnit['decimals'], separators?: boolean }): string {
    if (!isFinite(value)) {
        return value.toString()
    }
    const decimals = displayUnit.decimals
    let formatted: string
    if (decimals === 'sigFigs') {
        formatted = formatToSignificantFigures(value, 3)
    }
    else if (decimals === 'precision') {
        formatted = value.toPrecision(3)
    }
    else if (decimals === 'hoursMinutes') {
        const sign = value < 0 ? '-' : ''
        const totalMinutes = Math.round(Math.abs(value) * 60)
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        return hours > 0 ? `${sign}${hours}:${minutes.toString().padStart(2, '0')}` : `${sign}${minutes}`
    }
    else if (typeof decimals === 'object') {
        formatted = value.toFixed(decimalPlacesFor(value, decimals.significantDigits))
    }
    else {
        formatted = value.toFixed(decimals)
    }
    return displayUnit.separators === false ? formatted : separateDigits(formatted)
}

function candidateDisplayUnits(unit: Unit, useImperial: boolean): DisplayUnit[] {
    const candidates = unit.presentation !== undefined
        ? presentationDisplayUnits[unit.presentation]
        : displayUnitsForStoredUnit[`${renderDimensions(unit.dimensions)}@${unit.multiplier}`]
        ?? displayUnits[renderDimensions(unit.dimensions)]
        ?? []
    return candidates.filter(candidate => candidate.system !== (useImperial ? 'metric' : 'imperial'))
}

function prefixOf(displayUnit: DisplayUnit, value: number): string {
    const prefix = displayUnit.prefix ?? ''
    return displayUnit.signed === true && value >= 0 ? `+${prefix}` : prefix
}

function selectDisplayUnit(valueInBaseUnits: number, candidates: DisplayUnit[]): DisplayUnit | undefined {
    let selected: DisplayUnit | undefined = candidates[0]
    for (const candidate of candidates) {
        // 0.9995 rather than 1 so that a value that rounds up to the next unit is displayed in it
        if (Math.abs(valueInBaseUnits) >= (candidate.threshold ?? candidate.multiplier * 0.9995)) {
            selected = candidate
        }
    }
    return selected
}

/**
 * The unit a value is displayed in: the largest of its unit's display units that it reaches, so
 * a value of 600 in minutes is displayed in hours. `scale` is what the stored value is multiplied
 * by to get the displayed number. Quantities with no display units are displayed in base units,
 * e.g., person·m^2.
 */
export function displayUnitFor(value: number, unit: Unit, useImperial: boolean): { scale: number, name: HumanReadableName, prefix: string, attached: boolean } {
    const displayUnit = selectDisplayUnit(value * unit.multiplier, candidateDisplayUnits(unit, useImperial))
    if (displayUnit === undefined) {
        return { scale: unit.multiplier, name: nameOfDimensions(unit.dimensions), prefix: '', attached: false }
    }
    return {
        scale: unit.multiplier / displayUnit.multiplier,
        name: displayUnit.name,
        prefix: prefixOf(displayUnit, value),
        attached: displayUnit.attached ?? false,
    }
}

export function displayQuantity(value: number, unit: Unit, useImperial: boolean): { value: string, unit: HumanReadableName } {
    const displayUnit = selectDisplayUnit(value * unit.multiplier, candidateDisplayUnits(unit, useImperial))
    if (displayUnit === undefined) {
        return {
            value: formatQuantity(value * unit.multiplier, { decimals: 'sigFigs' }),
            unit: nameOfDimensions(unit.dimensions),
        }
    }
    // divided rather than scaled by the reciprocal, which rounds differently at tier boundaries
    const displayed = value * unit.multiplier / displayUnit.multiplier
    return { value: `${prefixOf(displayUnit, value)}${formatQuantity(displayed, displayUnit)}`, unit: displayUnit.name }
}

/**
 * A unit name as it is written after a number, e.g., " hours" but "%".
 */
export function unitSuffix(name: string, attached: boolean): string {
    return name === '' || attached ? name : ` ${name}`
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
