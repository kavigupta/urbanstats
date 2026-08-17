import { HueColors } from '../page_template/color-themes'

import { HumanReadableElement } from './human-readable-name'
import { Rounding, roundToDigits, separateNumber } from './text'

export type Hue = keyof HueColors

// Abstract interpretation of a quantity as a unit.
export type Unit = (
    { kind: 'raw-percentage', partyColor?: Hue }
    | { kind: 'delta-percentage', partyColor?: Hue }
    | { kind: 'lead-percentage', partySystem: 'democratic' | 'left' }
    | { kind: 'temperature-F' }
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
    }
}

function formatNumber(value: number, format: NumberFormat): string {
    switch (format.kind) {
        case 'fixed':
            return separateNumber(value.toFixed(format.places))
        case 'rounded':
            return roundToDigits(value, format)
    }
}

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
        case 'temperature-F':
            return undefined
    }
}

export interface WrittenQuantity {
    /** What the number reads as, a lead including its party and a plus, as in D+4.5 */
    renderedValue: string
    unitName: HumanReadableElement[]
    hue?: Hue
}

/** Writes out a value stored in the given unit, e.g., 0.125 of a vote as `12.50` and `%`. */
export function writeQuantity(value: number, stored: StoredUnit, settings: ReaderSettings = {}): WrittenQuantity {
    if (!isFinite(value)) {
        // a quantity we do not have is not measured in anything, and belongs to no party
        return { renderedValue: missingValue, unitName: [] }
    }
    const { unit } = stored
    const inBaseUnits = value * stored.toBaseUnits
    const representation = representationFor(unit, settings)
    // a lead is written as a size, with the party that holds it in front of the number
    const lead = party(unit, value)
    const magnitude = lead === undefined ? inBaseUnits : Math.abs(inBaseUnits)
    const explicitSign = unit.kind === 'delta-percentage' && magnitude >= 0 ? '+' : ''
    const written = formatNumber(representation.scale(magnitude), representation.format)
    return {
        renderedValue: `${lead === undefined ? '' : `${lead.label}+`}${explicitSign}${written}`,
        unitName: representation.unitName,
        hue: hueFor(unit, value),
    }
}
