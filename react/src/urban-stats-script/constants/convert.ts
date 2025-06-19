import { assert } from '../../utils/defensive'
import { Context } from '../context'
import { parseNumber } from '../lexer'
import { USSRawValue, USSValue } from '../types-values'

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
        const arg = posArgs[0]
        return String(arg)
    },
} satisfies USSValue

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
        if (typeof arg === 'number') {
            return arg
        }
        if (typeof arg === 'string') {
            const num = parseNumber(arg)
            assert(num !== undefined, `Expected a number or a string that can be converted to a number, got ${arg}`)
            return num
        }
        if (typeof arg === 'boolean') {
            return arg ? 1 : 0
        }
        throw new Error(`Expected a number, string, or boolean argument for toNumber, got ${typeof arg}`)
    },
} satisfies USSValue
