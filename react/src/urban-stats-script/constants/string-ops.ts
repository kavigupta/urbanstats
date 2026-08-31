import { HumanReadableName } from '../../utils/human-readable-element'
import { hre } from '../../utils/human-readable-template'
import { normalize } from '../../utils/normalize-string'
import { Context } from '../context'
import { createConstantExpression, USSRawValue, USSValue } from '../types-values'

function documented(
    name: string,
    argCount: 1 | 2,
    returnType: 'string' | 'boolean',
    fn: (args: USSRawValue[], shouldNormalize: boolean) => USSRawValue,
    humanReadableName: HumanReadableName,
    longDescription: HumanReadableName,
    normalizeArgument: 'normalize' | 'none' = 'none',
): [string, USSValue] {
    return [name, {
        type: {
            type: 'function',
            posArgs: Array.from({ length: argCount }, () => ({ type: 'concrete', value: { type: 'string' } })),
            namedArgs: normalizeArgument === 'none'
                ? {}
                : { normalize: { type: { type: 'concrete', value: { type: 'boolean' } }, defaultValue: createConstantExpression(true) } },
            returnType: { type: 'concrete', value: { type: returnType } },
        },
        value: (ctx: Context, args: USSRawValue[], namedArgs: Record<string, USSRawValue>) => fn(args, namedArgs.normalize !== false),
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
    documented('startsWith', 2, 'boolean', (posArgs, shouldNormalize) => {
        const parts = comparableGraphemes(posArgs[0] as string, shouldNormalize)
        const needle = comparableGraphemes(posArgs[1] as string, shouldNormalize).join('')
        return matchLength(parts, 0, needle) !== undefined
    }, 'starts with', hre`Returns true if the first string begins with the second. ${ignoresCase}`, 'normalize'),
    documented('endsWith', 2, 'boolean', (posArgs, shouldNormalize) => {
        const parts = comparableGraphemes(posArgs[0] as string, shouldNormalize)
        const needle = comparableGraphemes(posArgs[1] as string, shouldNormalize).join('')
        for (let i = 0; i <= parts.length; i++) {
            const length = matchLength(parts, i, needle)
            if (length !== undefined && parts.slice(i + length).every(part => part === '')) {
                return true
            }
        }
        return false
    }, 'ends with', hre`Returns true if the first string ends with the second. ${ignoresCase}`, 'normalize'),
    documented('includes', 2, 'boolean', (posArgs, shouldNormalize) => {
        const parts = comparableGraphemes(posArgs[0] as string, shouldNormalize)
        const needle = comparableGraphemes(posArgs[1] as string, shouldNormalize).join('')
        for (let i = 0; i <= parts.length; i++) {
            if (matchLength(parts, i, needle) !== undefined) {
                return true
            }
        }
        return false
    }, 'includes', hre`Returns true if the second string occurs anywhere in the first. ${ignoresCase}`, 'normalize'),
    documented('normalizeString', 1, 'string', (posArgs) => {
        return normalize(posArgs[0] as string)
    }, 'normalize', hre`Folds a string the way the site\'s search does, so that a comparison ignores what search ignores: it lowercases, strips accents from letters, removes \`,\`, \`(\`, \`)\`, \`[\` and \`]\`, and turns \`-\` into a space. The comparing functions do this to their arguments already; this is for seeing what they see, or for feeding \`matchesRegex\`.`),
    documented('matchesRegex', 2, 'boolean', (posArgs) => {
        return compilePattern(posArgs[1] as string).test(posArgs[0] as string)
    }, 'matches regex', hre`Returns true if the regular expression given second matches anywhere in the string given first. Unlike the other functions here, which compare literal strings, this one takes a regular expression in the JavaScript flavor: anchor it with \`^\` or \`$\` to test a prefix or a suffix. A backslash must be written twice, as in \`"\\\\d"\`, because a string literal reads a pair of backslashes as one. Neither side is normalized, since normalizing would rewrite the pattern\'s own syntax; call \`normalizeString\` on the string yourself and write the pattern to match the result.`),
]
