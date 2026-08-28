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

/** The digits of a number in scientific notation and then as many zeros, every float that large being a whole one. */
function expanded(scientific: string): string {
    const [mantissa, exponent] = scientific.split('e')
    const digits = mantissa.replace(/[-.]/g, '')
    return `${mantissa.startsWith('-') ? '-' : ''}${digits}${'0'.repeat(Number(exponent) - digits.length + 1)}`
}

/** toFixed gives up past 1e21 and writes scientific notation, which no quantity here is written in. */
function toPlainFixed(value: number, places: number): string {
    return Math.abs(value) < 1e21 ? value.toFixed(places) : expanded(value.toExponential())
}

function roundToDigits(value: number, rounding: Rounding): string {
    return separateNumber(toPlainFixed(value, decimalPlaces(value, rounding)))
}

/** How a number is written: to a fixed number of decimal places, or to a number of digits. */
export type NumberFormat = (
    { kind: 'fixed', places: number }
    | ({ kind: 'rounded' } & Rounding)
    | { kind: 'significantFigures' }
    | { kind: 'hoursMinutes' }
)

/** A number of minutes as hours and minutes, or as minutes alone where there are no hours. */
export function hoursAndMinutes(inMinutes: number): { written: string, unit: 'h' | 'min' } {
    const totalMinutes = Math.round(Math.abs(inMinutes))
    const sign = inMinutes < 0 && totalMinutes > 0 ? '-' : ''
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    return hours === 0
        ? { written: `${sign}${minutes}`, unit: 'min' }
        : { written: `${sign}${hours}:${minutes.toString().padStart(2, '0')}`, unit: 'h' }
}

export function trimTrailingZeros(value: string): string {
    if (!value.includes('.')) return value
    return value.replace(/\.?0+$/g, '')
}

export function formatNumber(value: number, format: NumberFormat): string {
    switch (format.kind) {
        case 'fixed':
            return separateNumber(toPlainFixed(value, format.places))
        case 'rounded':
            return roundToDigits(value, format)
        case 'significantFigures':
            return separateNumber(formatToSignificantFigures(value, 3))
        case 'hoursMinutes':
            return hoursAndMinutes(value).written
    }
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
    // by size, so that a half goes the same way whichever side of zero it falls
    const rounded = Math.sign(value) * Math.round(Math.abs(value) * factor) / factor

    // taken from the rounded value, since rounding can carry into another digit, as 0.9995 does
    const magnitude = Math.floor(Math.log10(Math.abs(rounded)))

    // Count significant figures needed after decimal point
    if (magnitude >= 0) {
        // For numbers >= 1, we need sigFigs total digits
        const integerPart = Math.floor(Math.abs(rounded))
        const integerDigits = integerPart.toString().length
        const places = Math.max(0, sigFigs - integerDigits)
        // past 1e21 the figures asked for are all there is to write, the rest being zeros
        return Math.abs(rounded) < 1e21 ? rounded.toFixed(places) : expanded(rounded.toExponential(sigFigs - 1))
    }
    else {
        // For numbers < 1, we need sigFigs digits after the decimal point
        // The first non-zero digit is at position -magnitude
        const places = -magnitude + sigFigs - 1
        return toPlainFixed(rounded, places)
    }
}
