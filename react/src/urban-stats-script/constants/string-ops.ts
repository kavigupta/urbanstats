import { bitapAlphabet } from '../../utils/bitap'
import { bitap } from '../../utils/bitap-selector'
import { HumanReadableName } from '../../utils/human-readable-element'
import { hre } from '../../utils/human-readable-template'
import { normalize } from '../../utils/normalize-string'
import { Context } from '../context'
import { createConstantExpression, USSFunctionType, USSRawValue, USSValue } from '../types-values'

const normalizeArg = {
    normalize: { type: { type: 'concrete', value: { type: 'boolean' } }, defaultValue: createConstantExpression(true) },
} satisfies USSFunctionType['namedArgs']

const fuzzyArgs = {
    maxErrors: { type: { type: 'concrete', value: { type: 'number' } }, defaultValue: createConstantExpression(2) },
    ...normalizeArg,
} satisfies USSFunctionType['namedArgs']

function documented(
    name: string,
    argCount: 1 | 2,
    returnType: 'string' | 'boolean',
    fn: (args: USSRawValue[], namedArgs: Record<string, USSRawValue>) => USSRawValue,
    humanReadableName: HumanReadableName,
    longDescription: HumanReadableName,
    namedArgs: USSFunctionType['namedArgs'] = {},
): [string, USSValue] {
    return [name, {
        type: {
            type: 'function',
            posArgs: Array.from({ length: argCount }, () => ({ type: 'concrete', value: { type: 'string' } })),
            namedArgs,
            returnType: { type: 'concrete', value: { type: returnType } },
        },
        value: (ctx: Context, args: USSRawValue[], kwargs: Record<string, USSRawValue>) => fn(args, kwargs),
        documentation: {
            humanReadableName,
            category: 'string',
            longDescription,
        },
    }] satisfies [string, USSValue]
}

/** Constructed on first use, so that a browser needing the polyfill can install it first. */
let segmenter: Intl.Segmenter | undefined

/** Broadcasting analyses a whole vector of names, and a filter usually looks at each twice. */
const graphemeCache = new Map<string, string[]>()

/** The string's graphemes as they are compared, which normalizing can leave empty. */
function comparableGraphemes(value: string, shouldNormalize: boolean): string[] {
    const key = `${shouldNormalize ? 'n' : 'r'}${value}`
    let parts = graphemeCache.get(key)
    if (parts === undefined) {
        segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        parts = Array.from(segmenter.segment(value), segment => shouldNormalize ? normalize(segment.segment) : segment.segment)
        if (graphemeCache.size > 10000) {
            graphemeCache.clear()
        }
        graphemeCache.set(key, parts)
    }
    return parts
}

/** How many graphemes starting at i spell the needle, or undefined where they do not. */
function matchLength(parts: string[], i: number, needle: string): number | undefined {
    let accumulated = ''
    for (let j = i; ; j++) {
        if (accumulated === needle) {
            return j - i
        }
        if (j >= parts.length || !needle.startsWith(accumulated + parts[j])) {
            return undefined
        }
        accumulated += parts[j]
    }
}

/** bitapAlphabet allocates a table per needle, and broadcasting reuses the same needle throughout. */
const needleCache = new Map<string, { alphabet: Uint32Array, length: number }>()

function toBitapNeedle(token: string): { alphabet: Uint32Array, length: number } {
    let needle = needleCache.get(token)
    if (needle === undefined) {
        needle = { alphabet: bitapAlphabet(token), length: token.length }
        if (needleCache.size > 100) {
            needleCache.clear()
        }
        needleCache.set(token, needle)
    }
    return needle
}

/** bitap fills these in, so they only have to be big enough, and they grow to the largest ask. */
let scratch: Uint32Array[] = []

function scratchBuffers(rows: number, width: number): Uint32Array[] {
    if (scratch.length < rows || scratch[0].length < width) {
        const size = Math.max(width, scratch[0]?.length ?? 0)
        scratch = Array.from({ length: Math.max(rows, scratch.length) }, () => new Uint32Array(size))
    }
    return scratch
}

/** Broadcasting calls the function once per element, almost always with the same pattern. */
const regexCache = new Map<string, RegExp>()

function compilePattern(pattern: string): RegExp {
    let regex = regexCache.get(pattern)
    if (regex === undefined) {
        regex = new RegExp(pattern)
        if (regexCache.size > 1000) {
            regexCache.clear()
        }
        regexCache.set(pattern, regex)
    }
    return regex
}

const ignoresCase = hre`By default both sides are normalized the way the site\'s search normalizes a name, so the comparison ignores case, accents and punctuation; pass \`normalize=false\` to compare the strings as written. A match never begins or ends part-way through a grapheme.`

export const stringConstants: [string, USSValue][] = [
    documented('startsWith', 2, 'boolean', (posArgs, namedArgs) => {
        const shouldNormalize = namedArgs.normalize !== false
        const parts = comparableGraphemes(posArgs[0] as string, shouldNormalize)
        const needle = comparableGraphemes(posArgs[1] as string, shouldNormalize).join('')
        return matchLength(parts, 0, needle) !== undefined
    }, 'starts with', hre`Returns true if the first string begins with the second. ${ignoresCase}`, normalizeArg),
    documented('endsWith', 2, 'boolean', (posArgs, namedArgs) => {
        const shouldNormalize = namedArgs.normalize !== false
        const parts = comparableGraphemes(posArgs[0] as string, shouldNormalize)
        const needle = comparableGraphemes(posArgs[1] as string, shouldNormalize).join('')
        for (let i = 0; i <= parts.length; i++) {
            const length = matchLength(parts, i, needle)
            if (length !== undefined && parts.slice(i + length).every(part => part === '')) {
                return true
            }
        }
        return false
    }, 'ends with', hre`Returns true if the first string ends with the second. ${ignoresCase}`, normalizeArg),
    documented('includes', 2, 'boolean', (posArgs, namedArgs) => {
        const shouldNormalize = namedArgs.normalize !== false
        const parts = comparableGraphemes(posArgs[0] as string, shouldNormalize)
        const needle = comparableGraphemes(posArgs[1] as string, shouldNormalize).join('')
        for (let i = 0; i <= parts.length; i++) {
            if (matchLength(parts, i, needle) !== undefined) {
                return true
            }
        }
        return false
    }, 'includes', hre`Returns true if the second string occurs anywhere in the first. ${ignoresCase}`, normalizeArg),
    documented('fuzzyMatch', 2, 'boolean', (posArgs, namedArgs) => {
        const shouldNormalize = namedArgs.normalize !== false
        const value = shouldNormalize ? normalize(posArgs[0] as string) : posArgs[0] as string
        const token = shouldNormalize ? normalize(posArgs[1] as string) : posArgs[1] as string
        const maxErrors = Math.max(Math.trunc(namedArgs.maxErrors as number), 0)
        if (token === '') {
            return true
        }
        if (token.length > 31) {
            throw new Error(`fuzzyMatch can look for at most 31 characters, but was given ${token.length}`)
        }
        const buffers = scratchBuffers(maxErrors + 1, token.length + value.length + 1)
        return bitap(value, toBitapNeedle(token), maxErrors, buffers) <= maxErrors
    }, 'fuzzy match', hre`Returns true if the second string occurs in the first allowing up to \`maxErrors\` single-character insertions, deletions or substitutions — so \`fuzzyMatch(geoName, "pittsburg")\` finds Pittsburgh. The string looked for is limited to 31 characters. ${ignoresCase}`, fuzzyArgs),
    documented('normalizeString', 1, 'string', (posArgs) => {
        return normalize(posArgs[0] as string)
    }, 'normalize', hre`Folds a string the way the site\'s search does, so that a comparison ignores what search ignores: it lowercases, strips accents from letters, removes \`,\`, \`(\`, \`)\`, \`[\` and \`]\`, and turns \`-\` into a space. The comparing functions do this to their arguments already; this is for seeing what they see, or for feeding \`matchesRegex\`.`),
    documented('matchesRegex', 2, 'boolean', (posArgs) => {
        return compilePattern(posArgs[1] as string).test(posArgs[0] as string)
    }, 'matches regex', hre`Returns true if the regular expression given second matches anywhere in the string given first. Unlike the other functions here, which compare literal strings, this one takes a regular expression in the JavaScript flavor: anchor it with \`^\` or \`$\` to test a prefix or a suffix. A backslash must be written twice, as in \`"\\\\d"\`, because a string literal reads a pair of backslashes as one. Neither side is normalized, since normalizing would rewrite the pattern\'s own syntax; call \`normalizeString\` on the string yourself and write the pattern to match the result.`),
]
