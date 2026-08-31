/**
 * Algorithm for fuzzy string matching and associated utilities.
 *
 * This a modified bitap algorithm that's optimized for matching short strings to short strings.
 * It uses a signature that's based on the count of letters in the needle and haystack to quickly skip combinations that can't match.
 */

import { assert } from './defensive'

export interface Needle {
    alphabet: Uint32Array
    length: number
    signature: number
}

export function bitapAlphabet(token: string): Uint32Array {
    assert(token.length <= 31, `Max bitap token length is 31`)
    const alphabet = new Uint32Array(65535).fill(0)
    for (let i = 0; i < token.length; i++) {
        const char = token.charCodeAt(i)
        alphabet[char] = alphabet[char] | (1 << i)
    }
    return alphabet
}

const encoder = new TextEncoder()

// A needle longer than this doesn't fit in the bitap state word. Cutting bytes rather than
// characters can split a character in half, which only makes a long non-ascii query looser.
const maxNeedleBytes = 31

export function toNeedle(token: string): Needle {
    const bytes = encoder.encode(token).subarray(0, maxNeedleBytes)
    const alphabet = new Uint32Array(256)
    for (let i = 0; i < bytes.length; i++) {
        alphabet[bytes[i]] = alphabet[bytes[i]] | (1 << i)
    }
    return { alphabet, length: bytes.length, signature: toSignature(token) }
}

export interface Haystack {
    bytes: Uint8Array
    start: number
    end: number
    signature: number
}

export function toHaystack(token: string): Haystack {
    const bytes = encoder.encode(token)
    return { bytes, start: 0, end: bytes.length, signature: toSignature(token) }
}

const alphabetStart = 'a'.charCodeAt(0)
const alphabetEnd = 'z'.charCodeAt(0)

// A signature has one bit per letter, plus six spare bits for second occurences. Those go to the
// letters that are most often repeated within a name.
const secondOccurenceBits = new Uint32Array(alphabetEnd - alphabetStart + 1)
for (const [i, letter] of ['a', 'e', 'i', 'o', 'r', 's'].entries()) {
    secondOccurenceBits[letter.charCodeAt(0) - alphabetStart] = 1 << (26 + i)
}

export function toSignature(str: string): number {
    let result = 0
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i)
        if (charCode >= alphabetStart && charCode <= alphabetEnd) {
            const firstOccurence = (1 << (charCode - alphabetStart))
            if ((result & firstOccurence) !== 0) {
                result |= secondOccurenceBits[charCode - alphabetStart]
            }
            else {
                result |= firstOccurence
            }
        }
    }
    return result >>> 0
}

export const bitapPerformance = {
    numBitapSignatureChecks: 0,
    numBitapSignatureSkips: 0,
}

// A run only ever reads the column before the one it writes, so two columns of one word per error
// count are enough. Shared and grown to the largest ask, since only one run happens at a time.
let previousColumn = new Uint32Array(0)
let currentColumn = new Uint32Array(0)

export function bitapColumns(rows: number): [Uint32Array, Uint32Array] {
    if (previousColumn.length < rows) {
        previousColumn = new Uint32Array(rows)
        currentColumn = new Uint32Array(rows)
    }
    return [previousColumn, currentColumn]
}

/**
 * Finds the minimum number of edits between `haystack` and `needle` (assuming they have the same start position)
 *
 * Returns [0, maxErrors + 1], where maxErrors + 1 means a match was not found with lte maxErrors errors
 */
export function bitap(haystack: Haystack, needle: Needle, maxErrors: number): number {
    let bestMatch = maxErrors + 1

    if (maxErrors < 0) {
        return bestMatch
    }

    bitapPerformance.numBitapSignatureChecks++
    if (bitCount(needle.signature ^ (haystack.signature & needle.signature)) > maxErrors) {
        bitapPerformance.numBitapSignatureSkips++
        return bestMatch // The letters in the haystack and needle are too different to possibly match
    }

    let [previous, current] = bitapColumns(maxErrors + 1)
    for (let errors = 0; errors <= maxErrors; errors++) {
        previous[errors] = (1 << errors) - 1
    }

    const matchMask = 1 << (needle.length - 1)
    const haystackLength = haystack.end - haystack.start

    for (let j = 1; j <= (needle.length + maxErrors); j++) {
        let charMatch: number
        if (j - 1 < haystackLength) {
            charMatch = needle.alphabet[haystack.bytes[haystack.start + j - 1]]
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
                bestMatch = Math.min(bestMatch, Math.max(Math.abs(j - needle.length), errors))
                maxErrors = Math.min(maxErrors, errors)
                if (bestMatch === 0) {
                    return bestMatch // We've found the best match we possibly can
                }
            }
        }

        const finished = previous
        previous = current
        current = finished
    }
    return bestMatch
}

// https://stackoverflow.com/a/109025
export function bitCount(i: number): number {
    i = i - ((i >>> 1) & 0x55555555) // add pairs of bits
    i = (i & 0x33333333) + ((i >>> 2) & 0x33333333) // quads
    i = (i + (i >>> 4)) & 0x0F0F0F0F // groups of 8
    return Math.imul(i, 0x01010101) >>> 24 // horizontal sum of bytes
}
