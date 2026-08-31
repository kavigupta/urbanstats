import { HumanReadableName } from '../../utils/human-readable-element'
import { hre } from '../../utils/human-readable-template'
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
        return (posArgs[0] as string).startsWith(posArgs[1] as string)
    }, 'starts with', hre`Returns true if the string begins with the given prefix. The comparison is case-sensitive; wrap both sides in \`lower\` to ignore case.`),
    documented('endsWith', ['string', 'string'], 'boolean', (posArgs) => {
        return (posArgs[0] as string).endsWith(posArgs[1] as string)
    }, 'ends with', hre`Returns true if the string ends with the given suffix. The comparison is case-sensitive; wrap both sides in \`lower\` to ignore case.`),
    documented('includes', ['string', 'string'], 'boolean', (posArgs) => {
        return (posArgs[0] as string).includes(posArgs[1] as string)
    }, 'includes', hre`Returns true if the substring occurs anywhere in the string. The comparison is case-sensitive; wrap both sides in \`lower\` to ignore case.`),
    documented('firstIndexOf', ['string', 'string'], 'number', (posArgs) => {
        return (posArgs[0] as string).indexOf(posArgs[1] as string)
    }, 'first index of', 'Returns the position of the first occurrence of the substring, counting from 0, or -1 if it does not occur.'),
    documented('lastIndexOf', ['string', 'string'], 'number', (posArgs) => {
        return (posArgs[0] as string).lastIndexOf(posArgs[1] as string)
    }, 'last index of', 'Returns the position of the last occurrence of the substring, counting from 0, or -1 if it does not occur.'),
    documented('substring', ['string', 'number', 'number'], 'string', (posArgs) => {
        return (posArgs[0] as string).slice(posArgs[1] as number, posArgs[2] as number)
    }, 'substring', 'Returns the part of the string from the start position up to but not including the end position, counting from 0. A negative position counts back from the end of the string, a position beyond either end is clamped to it, and an end at or before the start gives an empty string.'),
    documented('stringLength', ['string'], 'number', (posArgs) => {
        return (posArgs[0] as string).length
    }, 'string length', 'Returns the number of characters in the string.'),
    documented('replace', ['string', 'string', 'string'], 'string', (posArgs) => {
        return (posArgs[0] as string).replaceAll(posArgs[1] as string, posArgs[2] as string)
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
    documented('matchesRegex', ['string', 'string'], 'boolean', (posArgs) => {
        return compilePattern(posArgs[1] as string, '').test(posArgs[0] as string)
    }, 'matches regex', hre`Returns true if the regular expression matches anywhere in the string. Anchor the pattern with \`^\` or \`$\` to test a prefix or a suffix. A backslash must be written twice, as in \`"\\\\d"\`.`),
    documented('replaceRegex', ['string', 'string', 'string'], 'string', (posArgs) => {
        return (posArgs[0] as string).replaceAll(compilePattern(posArgs[1] as string, 'g'), posArgs[2] as string)
    }, 'replace regex', hre`Replaces every match of the regular expression with the replacement, in which \`$1\`, \`$2\`, ... stand for the pattern's capture groups and \`$&\` for the whole match.`),
]
