import { bitapColumns } from './bitap'

/**
 * Finds the minimum number of edits between `haystack` and some `needle` in `haystack`
 *
 * Use `bitapAlphabet` to prepare needly
 *
 * Differs from bitap for search in that it doesn't expect needly to be at the beginning of haystack
 *
 * Returns [0, maxErrors + 1], where maxErrors + 1 means a match was not found with lte maxErrors errors
 */
export function bitap(haystack: string, needle: { alphabet: Uint32Array, length: number }, maxErrors: number): number {
    if (needle.length === 0) {
        return 0
    }

    // Deleting the needle outright already matches, so more errors than it has characters never
    // changes the answer.
    maxErrors = Math.min(maxErrors, needle.length)

    let [previous, current] = bitapColumns(maxErrors + 1)
    for (let errors = 0; errors <= maxErrors; errors++) {
        previous[errors] = (1 << errors) - 1
    }

    const matchMask = 1 << (needle.length - 1)

    search: for (let j = 1; j <= needle.length + haystack.length; j++) {
        let charMatch: number
        if (j - 1 < haystack.length) {
            charMatch = needle.alphabet[haystack.charCodeAt(j - 1)]
        }
        else {
            charMatch = 0
        }

        for (let errors = 0; errors <= maxErrors; errors++) {
            if (errors === 0) {
                current[0] = ((previous[0] << 1) | 1) & charMatch
            }
            else {
                current[errors] = (((previous[errors] << 1) | 1) & charMatch) | (((previous[errors - 1] | current[errors - 1]) << 1) | 1) | previous[errors - 1]
            }

            if ((current[errors] & matchMask) !== 0) {
                maxErrors = errors - 1
                if (errors === 0) {
                    break search
                }
            }
        }

        const finished = previous
        previous = current
        current = finished
    }
    return maxErrors + 1
}
