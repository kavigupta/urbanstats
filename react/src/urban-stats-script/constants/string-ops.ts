import { HumanReadableName } from '../../utils/human-readable-element'
import { hre } from '../../utils/human-readable-template'
import { normalize } from '../../utils/normalize-string'
import { Context } from '../context'
import { USSRawValue, USSValue } from '../types-values'

function documented(
    name: string,
    argTypes: ('string' | 'number')[],
    returnType: 'string' | 'number' | 'boolean',
    fn: (args: USSRawValue[]) => USSRawValue,
    humanReadableName: HumanReadableName,
    longDescription: HumanReadableName,
): [string, USSValue] {
    return [name, {
        type: {
            type: 'function',
            posArgs: argTypes.map(type => ({ type: 'concrete', value: { type } })),
            namedArgs: {},
            returnType: { type: 'concrete', value: { type: returnType } },
        },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for the function signature
        value: (ctx: Context, args: USSRawValue[], namedArgs: Record<string, USSRawValue>) => fn(args),
        documentation: {
            humanReadableName,
            category: 'string',
            longDescription,
        },
    }] satisfies [string, USSValue]
}

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** Code-unit offsets where each grapheme begins, ending with the string's length. */
function graphemeStarts(value: string): number[] {
    const starts: number[] = []
    for (const { index } of segmenter.segment(value)) {
        starts.push(index)
    }
    starts.push(value.length)
    return starts
}

/** A match counts only where it begins and ends on a grapheme boundary. */
function graphemeIndexOf(value: string, needle: string, last: boolean): number {
    const starts = graphemeStarts(value)
    if (needle === '') {
        return last ? starts.length - 1 : 0
    }
    const boundaries = new Set(starts)
    let found = -1
    for (let i = 0; i < starts.length - 1; i++) {
        if (value.startsWith(needle, starts[i]) && boundaries.has(starts[i] + needle.length)) {
            if (!last) {
                return i
            }
            found = i
        }
    }
    return found
}

function graphemeIndex(position: number, count: number): number {
    const index = Math.trunc(position)
    if (Number.isNaN(index)) {
        return 0
    }
    return Math.min(Math.max(index < 0 ? count + index : index, 0), count)
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

export const stringConstants: [string, USSValue][] = [
    documented('startsWith', ['string', 'string'], 'boolean', (posArgs) => {
        const value = posArgs[0] as string
        const prefix = posArgs[1] as string
        return value.startsWith(prefix) && new Set(graphemeStarts(value)).has(prefix.length)
    }, 'starts with', hre`Returns true if the string begins with the given prefix. The comparison is case-sensitive; wrap both sides in \`lower\` to ignore case.`),
    documented('endsWith', ['string', 'string'], 'boolean', (posArgs) => {
        const value = posArgs[0] as string
        const suffix = posArgs[1] as string
        return value.endsWith(suffix) && new Set(graphemeStarts(value)).has(value.length - suffix.length)
    }, 'ends with', hre`Returns true if the string ends with the given suffix. The comparison is case-sensitive; wrap both sides in \`lower\` to ignore case.`),
    documented('includes', ['string', 'string'], 'boolean', (posArgs) => {
        const value = posArgs[0] as string
        const needle = posArgs[1] as string
        return value.includes(needle) && graphemeIndexOf(value, needle, false) >= 0
    }, 'includes', hre`Returns true if the substring occurs anywhere in the string. The comparison is case-sensitive; wrap both sides in \`lower\` to ignore case.`),
    documented('firstIndexOf', ['string', 'string'], 'number', (posArgs) => {
        return graphemeIndexOf(posArgs[0] as string, posArgs[1] as string, false)
    }, 'first index of', 'Returns the position of the first occurrence of the substring, counting graphemes from 0, or -1 if it does not occur. A match that would begin or end part-way through a grapheme does not count.'),
    documented('lastIndexOf', ['string', 'string'], 'number', (posArgs) => {
        return graphemeIndexOf(posArgs[0] as string, posArgs[1] as string, true)
    }, 'last index of', 'Returns the position of the last occurrence of the substring, counting graphemes from 0, or -1 if it does not occur. A match that would begin or end part-way through a grapheme does not count.'),
    documented('substring', ['string', 'number', 'number'], 'string', (posArgs) => {
        const value = posArgs[0] as string
        const starts = graphemeStarts(value)
        const count = starts.length - 1
        const from = graphemeIndex(posArgs[1] as number, count)
        const to = graphemeIndex(posArgs[2] as number, count)
        return to <= from ? '' : value.slice(starts[from], starts[to])
    }, 'substring', 'Returns the part of the string from the start position up to but not including the end position, counting graphemes from 0. A negative position counts back from the end of the string, a position beyond either end is clamped to it, and an end at or before the start gives an empty string.'),
    documented('stringLength', ['string'], 'number', (posArgs) => {
        return graphemeStarts(posArgs[0] as string).length - 1
    }, 'string length', 'Returns the number of graphemes in the string, so an emoji built out of several code points counts once.'),
    documented('replace', ['string', 'string', 'string'], 'string', (posArgs) => {
        // replaceAll reads $& and friends in the replacement even when searching for a literal
        const replacement = (posArgs[2] as string).replaceAll('$', '$$$$')
        return (posArgs[0] as string).replaceAll(posArgs[1] as string, replacement)
    }, 'replace', 'Replaces every occurrence of the target with the replacement, leaving the string alone if the target does not occur. Both are literal strings.'),
    documented('trim', ['string'], 'string', (posArgs) => {
        return (posArgs[0] as string).trim()
    }, 'trim', 'Removes whitespace from both ends of the string.'),
    documented('lower', ['string'], 'string', (posArgs) => {
        return (posArgs[0] as string).toLowerCase()
    }, 'lowercase', 'Converts the string to lowercase. Applying it to both sides of a comparison or a predicate makes that test case-insensitive.'),
    documented('upper', ['string'], 'string', (posArgs) => {
        return (posArgs[0] as string).toUpperCase()
    }, 'uppercase', 'Converts the string to uppercase.'),
    documented('normalizeString', ['string'], 'string', (posArgs) => {
        return normalize(posArgs[0] as string)
    }, 'normalize', hre`Folds a string the way the site\'s search does, so that a comparison ignores what search ignores: it lowercases, strips accents from letters, removes \`,\`, \`(\`, \`)\`, \`[\` and \`]\`, and turns \`-\` into a space.`),
    documented('matchesRegex', ['string', 'string'], 'boolean', (posArgs) => {
        return compilePattern(posArgs[1] as string, '').test(posArgs[0] as string)
    }, 'matches regex', hre`Returns true if the regular expression matches anywhere in the string. Anchor the pattern with \`^\` or \`$\` to test a prefix or a suffix. A backslash must be written twice, as in \`"\\\\d"\`.`),
    documented('replaceRegex', ['string', 'string', 'string'], 'string', (posArgs) => {
        return (posArgs[0] as string).replaceAll(compilePattern(posArgs[1] as string, 'g'), posArgs[2] as string)
    }, 'replace regex', hre`Replaces every match of the regular expression with the replacement, in which \`$1\`, \`$2\`, ... stand for the pattern's capture groups and \`$&\` for the whole match.`),
]
