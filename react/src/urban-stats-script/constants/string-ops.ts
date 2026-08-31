import { HumanReadableName } from '../../utils/human-readable-element'
import { hre } from '../../utils/human-readable-template'
import { normalize } from '../../utils/normalize-string'
import { Context } from '../context'
import { createConstantExpression, USSRawValue, USSValue } from '../types-values'

function documented(
    name: string,
    argTypes: ('string' | 'number')[],
    returnType: 'string' | 'number' | 'boolean',
    fn: (args: USSRawValue[], shouldNormalize: boolean) => USSRawValue,
    humanReadableName: HumanReadableName,
    longDescription: HumanReadableName,
    normalizeArgument: 'normalize' | 'none' = 'none',
): [string, USSValue] {
    return [name, {
        type: {
            type: 'function',
            posArgs: argTypes.map(type => ({ type: 'concrete', value: { type } })),
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

interface Analysis {
    /** The string's graphemes. */
    raw: string[]
    /** Each grapheme as it is compared, which normalizing can leave empty. */
    comparable: string[]
}

/** Broadcasting analyses a whole vector of names, and a filter usually looks at each twice. */
const analysisCache = new Map<string, Analysis>()

function analyze(value: string, shouldNormalize: boolean): Analysis {
    const key = `${shouldNormalize ? 'n' : 'r'}${value}`
    let analysis = analysisCache.get(key)
    if (analysis === undefined) {
        segmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        const raw = Array.from(segmenter.segment(value), segment => segment.segment)
        analysis = { raw, comparable: shouldNormalize ? raw.map(grapheme => normalize(grapheme)) : raw }
        if (analysisCache.size > 10000) {
            analysisCache.clear()
        }
        analysisCache.set(key, analysis)
    }
    return analysis
}

function comparableText(value: string, shouldNormalize: boolean): string {
    return analyze(value, shouldNormalize).comparable.join('')
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

function findGrapheme(parts: string[], needle: string, last: boolean): number {
    if (needle === '') {
        return last ? parts.length : 0
    }
    let found = -1
    for (let i = 0; i < parts.length; i++) {
        // starting on a grapheme that normalized away would report the punctuation's position
        if (parts[i] === '') {
            continue
        }
        if (matchLength(parts, i, needle) !== undefined) {
            if (!last) {
                return i
            }
            found = i
        }
    }
    return found
}

/** Broadcasting calls the function once per element, almost always with the same pattern. */
const regexCache = new Map<string, RegExp>()

function compilePattern(pattern: string, flags: string): RegExp {
    const key = `${flags} ${pattern}`
    let regex = regexCache.get(key)
    if (regex === undefined) {
        regex = new RegExp(pattern, flags)
        if (regexCache.size > 1000) {
            regexCache.clear()
        }
        regexCache.set(key, regex)
    }
    return regex
}

function graphemeIndex(position: number, count: number): number {
    const index = Math.trunc(position)
    if (Number.isNaN(index)) {
        return 0
    }
    return Math.min(Math.max(index < 0 ? count + index : index, 0), count)
}

const ignoresCase = hre`By default both sides are normalized the way the site\'s search normalizes a name, so the comparison ignores case, accents and punctuation; pass \`normalize=false\` to compare the strings as written.`

export const stringConstants: [string, USSValue][] = [
    documented('startsWith', ['string', 'string'], 'boolean', (posArgs, shouldNormalize) => {
        const parts = analyze(posArgs[0] as string, shouldNormalize).comparable
        return matchLength(parts, 0, comparableText(posArgs[1] as string, shouldNormalize)) !== undefined
    }, 'starts with', hre`Returns true if the string begins with the given prefix. ${ignoresCase}`, 'normalize'),
    documented('endsWith', ['string', 'string'], 'boolean', (posArgs, shouldNormalize) => {
        const parts = analyze(posArgs[0] as string, shouldNormalize).comparable
        const needle = comparableText(posArgs[1] as string, shouldNormalize)
        for (let i = 0; i <= parts.length; i++) {
            const length = matchLength(parts, i, needle)
            if (length !== undefined && parts.slice(i + length).every(part => part === '')) {
                return true
            }
        }
        return false
    }, 'ends with', hre`Returns true if the string ends with the given suffix. ${ignoresCase}`, 'normalize'),
    documented('includes', ['string', 'string'], 'boolean', (posArgs, shouldNormalize) => {
        const parts = analyze(posArgs[0] as string, shouldNormalize).comparable
        return findGrapheme(parts, comparableText(posArgs[1] as string, shouldNormalize), false) >= 0
    }, 'includes', hre`Returns true if the substring occurs anywhere in the string. ${ignoresCase}`, 'normalize'),
    documented('firstIndexOf', ['string', 'string'], 'number', (posArgs, shouldNormalize) => {
        const parts = analyze(posArgs[0] as string, shouldNormalize).comparable
        return findGrapheme(parts, comparableText(posArgs[1] as string, shouldNormalize), false)
    }, 'first index of', hre`Returns the position of the first occurrence of the substring, counting graphemes of the string as written from 0, or -1 if it does not occur. ${ignoresCase}`, 'normalize'),
    documented('lastIndexOf', ['string', 'string'], 'number', (posArgs, shouldNormalize) => {
        const parts = analyze(posArgs[0] as string, shouldNormalize).comparable
        return findGrapheme(parts, comparableText(posArgs[1] as string, shouldNormalize), true)
    }, 'last index of', hre`Returns the position of the last occurrence of the substring, counting graphemes of the string as written from 0, or -1 if it does not occur. ${ignoresCase}`, 'normalize'),
    documented('substring', ['string', 'number', 'number'], 'string', (posArgs) => {
        const raw = analyze(posArgs[0] as string, false).raw
        const from = graphemeIndex(posArgs[1] as number, raw.length)
        const to = graphemeIndex(posArgs[2] as number, raw.length)
        return to <= from ? '' : raw.slice(from, to).join('')
    }, 'substring', 'Returns the part of the string from the start position up to but not including the end position, counting graphemes from 0. A negative position counts back from the end of the string, a position beyond either end is clamped to it, and an end at or before the start gives an empty string.'),
    documented('stringLength', ['string'], 'number', (posArgs) => {
        return analyze(posArgs[0] as string, false).raw.length
    }, 'string length', 'Returns the number of graphemes in the string, so an emoji built out of several code points counts once.'),
    documented('replace', ['string', 'string', 'string'], 'string', (posArgs, shouldNormalize) => {
        const { raw, comparable } = analyze(posArgs[0] as string, shouldNormalize)
        const target = comparableText(posArgs[1] as string, shouldNormalize)
        const replacement = posArgs[2] as string
        if (target === '') {
            return posArgs[0]
        }
        let result = ''
        let i = 0
        while (i < raw.length) {
            const length = comparable[i] === '' ? undefined : matchLength(comparable, i, target)
            if (length === undefined || length === 0) {
                result += raw[i]
                i++
            }
            else {
                result += replacement
                i += length
            }
        }
        return result
    }, 'replace', hre`Replaces every occurrence of the target with the replacement, leaving the string alone if the target does not occur. Both are literal strings, and what is not replaced keeps the characters it was written with. ${ignoresCase}`, 'normalize'),
    documented('trim', ['string'], 'string', (posArgs) => {
        return (posArgs[0] as string).trim()
    }, 'trim', 'Removes whitespace from both ends of the string.'),
    documented('lower', ['string'], 'string', (posArgs) => {
        return (posArgs[0] as string).toLowerCase()
    }, 'lowercase', 'Converts the string to lowercase.'),
    documented('upper', ['string'], 'string', (posArgs) => {
        return (posArgs[0] as string).toUpperCase()
    }, 'uppercase', 'Converts the string to uppercase.'),
    documented('normalizeString', ['string'], 'string', (posArgs) => {
        return normalize(posArgs[0] as string)
    }, 'normalize', hre`Folds a string the way the site\'s search does, so that a comparison ignores what search ignores: it lowercases, strips accents from letters, removes \`,\`, \`(\`, \`)\`, \`[\` and \`]\`, and turns \`-\` into a space. The comparing functions do this to their arguments already.`),
    documented('matchesRegex', ['string', 'string'], 'boolean', (posArgs) => {
        return compilePattern(posArgs[1] as string, '').test(posArgs[0] as string)
    }, 'matches regex', hre`Returns true if the regular expression matches anywhere in the string. Anchor the pattern with \`^\` or \`$\` to test a prefix or a suffix. A backslash must be written twice, as in \`"\\\\d"\`. Neither side is normalized, since normalizing would rewrite the pattern\'s own syntax; call \`normalizeString\` on the string yourself and write the pattern to match the result.`),
    documented('replaceRegex', ['string', 'string', 'string'], 'string', (posArgs) => {
        return (posArgs[0] as string).replaceAll(compilePattern(posArgs[1] as string, 'g'), posArgs[2] as string)
    }, 'replace regex', hre`Replaces every match of the regular expression with the replacement, in which \`$1\`, \`$2\`, ... stand for the pattern\'s capture groups and \`$&\` for the whole match. Neither side is normalized, for the same reason as \`matchesRegex\`.`),
]
