import localized_type_names from '../data/localized_type_names'

export function displayType(universe: string, type: string): string {
    return pluralize(localize(universe, type))
}

export function pluralize(type: string): string {
    // If the type ends with a parenthetical, pluralize the part before the parenthetical
    let parenthesisMatch
    if ((parenthesisMatch = /^(.+) (\(.+\))$/.exec(type)) !== null) {
        return `${pluralize(parenthesisMatch[1])} ${parenthesisMatch[2]}`
    }

    if (type.endsWith('y')) {
        return `${type.slice(0, -1)}ies`
    }
    return `${type}s`
}

function localize(universe: string, type: string): string {
    for (const [universeSuffix, types] of localized_type_names) {
        if (universe.endsWith(universeSuffix)) {
            if (type in types) {
                return types[type]
            }
        }
    }
    return type
}

/**
 * Separates the digits of a written number into groups of three, e.g., 1 234.5. Only the digits
 * before the point are grouped, and a sign is left where it is.
 */
export function separateNumber(number: string): string {
    const sign = number.startsWith('-') ? '-' : ''
    const [integerPart, ...rest] = number.slice(sign.length).split('.')
    const grouped = integerPart.replaceAll(/(?<!^)([0-9]{3})(?=([0-9]{3})*$)/g, '\u202f$1')
    return [sign + grouped, ...rest].join('.')
}

/** How closely a number is rounded. */
export interface Rounding {
    significantDigits: number
    // decimals after the decimal point
    minDecimals?: number
    maxDecimals?: number
}

function decimalPlaces(value: number, { significantDigits, minDecimals, maxDecimals }: Rounding): number {
    const most = maxDecimals ?? significantDigits
    if (value === 0 || !isFinite(value)) {
        // nothing is known about how large it is, so it is written to as many places as any
        return most
    }
    return Math.min(Math.max(significantDigits - Math.ceil(Math.log10(Math.abs(value))), minDecimals ?? 0), most)
}

export function roundToDigits(value: number, rounding: Rounding): string {
    return separateNumber(value.toFixed(decimalPlaces(value, rounding)))
}

// add in the B/m/k suffixes.
export function abbreviate(value: number): { number: string, suffix: string } {
    for (const [threshold, divisor, suffix] of [[999.5e6, 1e9, 'B'], [999.5e3, 1e6, 'm'], [1e4, 1e3, 'k']] as const) {
        if (Math.abs(value) >= threshold) {
            return { number: (value / divisor).toPrecision(3), suffix }
        }
    }
    return { number: separateNumber(value.toFixed(0)), suffix: '' }
}

// NOT scientific notation, but still use sig figs.
export function formatToSignificantFigures(value: number, sigFigs: number = 3): string {
    if (value === 0 || !isFinite(value)) {
        return value.toString()
    }

    const factor = Math.pow(10, sigFigs - 1 - Math.floor(Math.log10(Math.abs(value))))
    const rounded = Math.round(value * factor) / factor

    // taken from the rounded value, since rounding can carry into another digit, as 0.9995 does
    const magnitude = Math.floor(Math.log10(Math.abs(rounded)))

    // Count significant figures needed after decimal point
    if (magnitude >= 0) {
        // For numbers >= 1, we need sigFigs total digits
        const integerPart = Math.floor(Math.abs(rounded))
        const integerDigits = integerPart.toString().length
        const places = Math.max(0, sigFigs - integerDigits)
        return rounded.toFixed(places)
    }
    else {
        // For numbers < 1, we need sigFigs digits after the decimal point
        // The first non-zero digit is at position -magnitude
        const places = -magnitude + sigFigs - 1
        return rounded.toFixed(places)
    }
}
