/**
 * Algorithm for fuzzy string matching and associated utilities.
 *
 * This a modified bitap algorithm that's optimized for matching short strings to short strings.
 * It uses a signature that's based on the count of letters in the needle and haystack to quickly skip combinations that can't match.
 */

export interface Needle {
    alphabet: Uint32Array
    length: number
    signature: number
}

export function toNeedle(token: string): Needle {
    const alphabet = new Uint32Array(65535).fill(0)
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i)
        alphabet[char] = alphabet[char] | (1 << i)
    }
    return { alphabet, length: token.length, signature: toSignature(token) }
}

export interface Haystack {
    haystack: string
    signature: number
}

export function toHaystack(token: string): Haystack {
    return {
        haystack: token,
        signature: toSignature(token),
    }
}

export function toSignature(str: string): number {
    const alphabetStart = 'a'.charCodeAt(0)
    const alphabetEnd = 'z'.charCodeAt(0)
    // 0 < alphabetEnd - alphabetStart < 26   because of javascript integer size
    let result = 0
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i)
        if (charCode >= alphabetStart && charCode <= alphabetEnd) {
            const firstOccurence = (1 << ((charCode - alphabetStart) * 2))
            if ((result & firstOccurence) !== 0) {
                result |= (firstOccurence << 1) // second occurence
            }
            else {
                result |= firstOccurence
            }
        }
    }
    return result
}

export const bitapPerformance = {
    numBitapSignatureChecks: 0,
    numBitapSignatureSkips: 0,
}

/**
 * Finds the minimum number of edits between `haystack` and `needle` (assuming they have the same start position)
 *
 * Returns [0, maxErrors + 1], where maxErrors + 1 means a match was not found with lte maxErrors errors
 *
 * Takes scratch buffers, which must be an array of at least length maxErrors + 1 length, filled with Uint32Arrays of at least (needle.length + maxErrors + 1) length
 *
 */
export function bitap(haystack: Haystack, needle: Needle, maxErrors: number, scratchBuffers: Uint32Array[]): number {
    let bestMatch = maxErrors + 1

    if (maxErrors < 0) {
        return bestMatch
    }

    bitapPerformance.numBitapSignatureChecks++
    if (bitCount(needle.signature ^ (haystack.signature & needle.signature)) > maxErrors) {
        bitapPerformance.numBitapSignatureSkips++
        return bestMatch // The letters in the haystack and needle are too different to possibly match
    }

    for (let errors = 0; errors <= maxErrors; errors++) {
        scratchBuffers[errors].fill(0)
        scratchBuffers[errors][0] = (1 << errors) - 1
    }

    const matchMask = 1 << (needle.length - 1)

    for (let j = 1; j <= (needle.length + maxErrors); j++) {
        let charMatch: number
        if (j - 1 < haystack.haystack.length) {
            charMatch = needle.alphabet[haystack.haystack.charCodeAt(j - 1)]
        }
        else {
            charMatch = 0
        }

        for (let errors = 0; errors <= maxErrors; errors++) {
            if (errors === 0) {
                scratchBuffers[0][j] = ((scratchBuffers[0][j - 1] << 1) | 1) & charMatch
            }
            else {
                scratchBuffers[errors][j] = (((scratchBuffers[errors][j - 1] << 1) | 1) & charMatch) | (((scratchBuffers[errors - 1][j - 1] | scratchBuffers[errors - 1][j]) << 1) | 1) | scratchBuffers[errors - 1][j - 1]
            }

            if ((scratchBuffers[errors][j] & matchMask) !== 0) {
                bestMatch = Math.min(bestMatch, Math.max(Math.abs(j - needle.length), errors))
                maxErrors = Math.min(maxErrors, errors)
                if (bestMatch === 0) {
                    return bestMatch // We've found the best match we possibly can
                }
            }
        }
    }
    return bestMatch
}

export function bitCount(x: number): number {
    return bitCount32(x) + bitCount32(Math.floor(x / 0x1_0000_0000))
}

// https://stackoverflow.com/a/109025
function bitCount32(i: number): number {
    i = i - ((i >> 1) & 0x55555555) // add pairs of bits
    i = (i & 0x33333333) + ((i >> 2) & 0x33333333) // quads
    i = (i + (i >> 4)) & 0x0F0F0F0F // groups of 8
    i *= 0x01010101 // horizontal sum of bytes
    return i >> 24
}
