/**
 * Finds the minimum number of edits between `haystack` and some `needle` in `haystack`
 *
 * Use `bitapAlphabet` to prepare needly
 *
 * Differs from bitap for search in that it doesn't expect needly to be at the beginning of haystack
 *
 * Returns [0, maxErrors + 1], where maxErrors + 1 means a match was not found with lte maxErrors errors
 *
 * Takes scratch buffers, which must be an array of at least length maxErrors + 1 length, filled with Uint32Arrays of at least (needle.length + haystack.length + 1) length
 */
export function bitap(haystack: string, needle: { alphabet: Uint32Array, length: number }, maxErrors: number, sb: Uint32Array[]): number {
    for (let errors = 0; errors <= maxErrors; errors++) {
        sb[errors].fill(0)
        sb[errors][0] = (1 << errors) - 1
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
                sb[0][j] = ((sb[0][j - 1] << 1) | 1) & charMatch
            }
            else {
                sb[errors][j] = (((sb[errors][j - 1] << 1) | 1) & charMatch) | (((sb[errors - 1][j - 1] | sb[errors - 1][j]) << 1) | 1) | sb[errors - 1][j - 1]
            }

            if ((sb[errors][j] & matchMask) !== 0) {
                maxErrors = errors - 1
                if (errors === 0) {
                    break search
                }
            }
        }
    }
    return maxErrors + 1
}
