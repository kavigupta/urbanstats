import localized_type_names from '../data/localized_type_names'

export function displayType(universe: string, type: string): string {
    return pluralize(localize(universe, type))
}

export function pluralize(type: string): string {
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

export function separateNumber(number: string): string {
    return number.replaceAll(/(?<!^)([0-9]{3})(?=([0-9]{3})*($|\.))/g, '\u202f$1')
}

/**
 * Formats a number to the specified number of significant figures (default 3) without scientific notation.
 */
export function formatToSignificantFigures(value: number, sigFigs: number = 3): string {
    if (value === 0 || !isFinite(value)) {
        return value.toString()
    }

    const magnitude = Math.floor(Math.log10(Math.abs(value)))
    const factor = Math.pow(10, sigFigs - 1 - magnitude)
    const rounded = Math.round(value * factor) / factor

    // Count significant figures needed after decimal point
    if (magnitude >= 0) {
        // For numbers >= 1, we need sigFigs total digits
        const integerPart = Math.floor(Math.abs(rounded))
        const integerDigits = integerPart.toString().length
        const decimalPlaces = Math.max(0, sigFigs - integerDigits)
        return rounded.toFixed(decimalPlaces)
    }
    else {
        // For numbers < 1, we need sigFigs digits after the decimal point
        // The first non-zero digit is at position -magnitude
        const decimalPlaces = -magnitude + sigFigs - 1
        return rounded.toFixed(decimalPlaces)
    }
}
