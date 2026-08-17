import { HueColors } from '../page_template/color-themes'

import { HumanReadableElement } from './human-readable-name'
import { Rounding, roundToDigits, separateNumber } from './text'

export type Hue = keyof HueColors

/**
 * What kind of quantity a number is. A share of a vote and a lead in one are both fractions, but
 * they are not written the same way, so what a number means is kept apart from how large it is.
 */
export type Unit = (
    { kind: 'raw-percentage', partyColor?: Hue }
    | { kind: 'delta-percentage', partyColor?: Hue }
    | { kind: 'lead-percentage', partySystem: 'democratic' | 'left' }
    | { kind: 'temperature-F' }
)

/**
 * A unit together with what numbers written in it are multiplied by to be in base units. Units are
 * abstract, so how a particular column of numbers is stored belongs here rather than in the unit.
 */
export interface StoredUnit {
    unit: Unit
    toBaseUnits: number
}

export interface ReaderSettings {
    useImperial?: boolean
    temperatureUnit?: string
}

export const missingValue = 'N/A'

/** How the number is written: to a fixed number of decimal places, or to a number of digits. */
type NumberFormat = number | Rounding

/** How a quantity is written: the unit chosen for it, and the style the number is in. */
interface Representation {
    /** What a value in base units reads as in this unit */
    scale: (inBaseUnits: number) => number
    name: HumanReadableElement[]
    format: NumberFormat
}

function atom(value: string): HumanReadableElement[] {
    return [{ type: 'atom', value }]
}

const percent: Representation = { name: atom('%'), scale: value => value * 100, format: 2 }
/** A margin is written as the size of the lead, which is given more digits the closer it is. */
const margin: Representation = { ...percent, format: { significantDigits: 3, minDecimals: 1, maxDecimals: 4 } }

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
                ? { name: atom('°C'), scale: value => (value - 32) * (5 / 9), format: 1 }
                : { name: atom('°F'), scale: value => value, format: 1 }
    }
}

function formatNumber(value: number, format: NumberFormat): string {
    return typeof format === 'number' ? separateNumber(value.toFixed(format)) : roundToDigits(value, format)
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
        case 'temperature-F':
            return undefined
    }
}

/**
 * A quantity written out: the number as it reads, the name of the unit it is written in, and the
 * hue to write it in, for the quantities that are written in a party's color.
 */
export interface WrittenQuantity {
    /** What the number reads as, a lead including its party and a plus, as in D+4.5 */
    number: string
    name: HumanReadableElement[]
    hue?: Hue
}

/** Writes out a value stored in the given unit, e.g., 0.125 of a vote as `12.50` and `%`. */
export function writeQuantity(value: number, stored: StoredUnit, settings: ReaderSettings = {}): WrittenQuantity {
    if (!isFinite(value)) {
        // a quantity we do not have is not measured in anything, and belongs to no party
        return { number: missingValue, name: [] }
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
        number: `${lead === undefined ? '' : `${lead.label}+`}${explicitSign}${written}`,
        name: representation.name,
        hue: hueFor(unit, value),
    }
}
