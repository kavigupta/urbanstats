import { HueColors } from '../page_template/color-themes'

import { HumanReadableElement } from './human-readable-name'
import { formatToSignificantFigures, Rounding, roundToDigits, separateNumber } from './text'

export type Hue = keyof HueColors

type PartySystem = 'democratic' | 'left'

/**
 * The units everything else is measured in. A value is put in these before it is written out, so
 * that quantities of the same kind are written the same way however they happen to be stored.
 */
export type BaseUnit = 'fatality'

/** A base unit raised to a power, e.g., fatalities, or square meters. */
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

/** What the dimensions of a quantity are called when they are looked up in a table. */
function signatureOf(scales: Dimension[]): string {
    return scales
        .filter(({ power }) => power !== 0)
        .map(({ baseUnit, power }) => `${baseUnit}^${power}`)
        .join(' ')
}

/**
 * How the number is written once a unit has been chosen for it. Separate from the units: what a
 * quantity is measured in does not say how precisely it is worth writing.
 */
const styles: Record<string, NumberFormat | undefined> = {
    '': { kind: 'significantFigures' },
    // things that are counted come in whole numbers
    'fatality^1': { kind: 'fixed', places: 0 },
}

const defaultStyle: NumberFormat = { kind: 'rounded', significantDigits: 3 }

function representationFor(unit: Unit, settings: ReaderSettings): Representation {
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
            // a count is named by the statistic it counts, so it has no name of its own here
            return { unitName: [], scale: value => value, format: styles[signatureOf(unit.scales)] ?? defaultStyle }
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
    const representation = representationFor(unit, settings)
    let party = undefined
    if (unit.kind === 'lead-percentage') {
        party = getParty(unit.partySystem, inBaseUnits)
        inBaseUnits = Math.abs(inBaseUnits)
    }
    const explicitSign = unit.kind === 'delta-percentage' && inBaseUnits >= 0 ? '+' : ''
    const written = formatNumber(representation.scale(inBaseUnits), representation.format)
    return {
        renderedValue: `${party === undefined ? '' : `${party.label}+`}${explicitSign}${written}`,
        unitName: representation.unitName,
        hue: party?.hue ?? hueFor(unit),
    }
}
