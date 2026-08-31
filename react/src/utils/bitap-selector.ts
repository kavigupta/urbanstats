/**
 * Grown to the largest ask and reused: a caller runs one needle over many haystacks, and each row
 * is zeroed before use anyway.
 */
let buffers: Uint32Array[] = []

function scratch(rows: number, width: number): Uint32Array[] {
    if (buffers.length < rows || buffers[0].length < width) {
        const size = Math.max(width, buffers[0]?.length ?? 0)
        buffers = Array.from({ length: Math.max(rows, buffers.length) }, () => new Uint32Array(size))
    }
    return buffers
}

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
    const sb = scratch(maxErrors + 1, needle.length + haystack.length + 1)

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
