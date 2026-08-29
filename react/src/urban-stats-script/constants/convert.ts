import { assert } from '../../utils/defensive'
import { Context } from '../context'
import { parseNumber } from '../lexer'
import { USSPrimitiveRawValue, USSRawValue, USSValue } from '../types-values'

export const toString = {
    type: {
        type: 'function',
        posArgs: [{ type: 'anyPrimitive' }],
        namedArgs: {},
        returnType: { type: 'concrete', value: { type: 'string' } },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): string => {
        assert(posArgs.length === 1, `Expected 1 argument for toString, got ${posArgs.length}`)
        assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for toString, got ${Object.keys(namedArgs).length}`)
        const arg = posArgs[0] as USSPrimitiveRawValue
        return String(arg)
    },
    documentation: {
        humanReadableName: 'Anything to string',
        category: 'basic',
        longDescription: 'Converts any primitive value (number, boolean, string, null) to its string representation.',
    },
} satisfies USSValue

/** What toNumber makes of a primitive, or undefined where it makes nothing. */
function asNumber(value: USSPrimitiveRawValue): number | undefined {
    if (typeof value === 'number') return value
    if (typeof value === 'string') return parseNumber(value)
    if (typeof value === 'boolean') return value ? 1 : 0
    return undefined
}

export const toNumber = {
    type: {
        type: 'function',
        posArgs: [{ type: 'anyPrimitive' }],
        namedArgs: {},
        returnType: { type: 'concrete', value: { type: 'number' } },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): number => {
        assert(posArgs.length === 1, `Expected 1 argument for toNumber, got ${posArgs.length}`)
        assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for toNumber, got ${Object.keys(namedArgs).length}`)
        const arg = posArgs[0]
        const num = asNumber(arg as USSPrimitiveRawValue)
        assert(num !== undefined, `Expected a number, a string that can be converted to one, or a boolean, got ${typeof arg === 'string' ? arg : typeof arg}`)
        return num
    },
    documentation: {
        humanReadableName: 'Anything to Number',
        category: 'basic',
        longDescription: 'Converts any primitive value to a number. Strings are parsed as numbers, booleans become 0 or 1, and numbers are returned as-is.',
    },
} satisfies USSValue
