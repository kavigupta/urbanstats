import { assert } from '../utils/defensive'

import { Context } from './context'
import { USSRawValue, USSValue } from './types-values'

type Constants = Map<string, USSValue>

function numericUnaryFunction(
    name: string,
    func: (value: number) => number,
): [string, USSValue] {
    return [
        name,
        {
            type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
            value: (
                ctx: Context,
                posArgs: USSRawValue[],
                namedArgs: Record<string, USSRawValue>,
            ) => {
                assert(posArgs.length === 1, `Expected 1 argument for ${name}, got ${posArgs.length}`)
                assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for ${name}, got ${Object.keys(namedArgs).length}`)
                const arg = posArgs[0]
                assert(typeof arg === 'number', `Expected number argument for ${name}, got ${typeof arg}`)
                return func(arg)
            },

        },
    ]
}

const toNumberRaw = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): number => {
    assert(posArgs.length === 1, `Expected 1 argument for toNumber, got ${posArgs.length}`)
    assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for toNumber, got ${Object.keys(namedArgs).length}`)
    const arg = posArgs[0]
    if (typeof arg === 'number') {
        return arg
    }
    if (typeof arg === 'string') {
        const num = parseFloat(arg)
        assert(!isNaN(num), `Expected a number or a string that can be converted to a number, got ${arg}`)
        return num
    }
    if (typeof arg === 'boolean') {
        return arg ? 1 : 0
    }
    throw new Error(`Expected a number, string, or boolean argument for toNumber, got ${typeof arg}`)
}

const toStringRaw = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): string => {
    assert(posArgs.length === 1, `Expected 1 argument for toString, got ${posArgs.length}`)
    assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for toString, got ${Object.keys(namedArgs).length}`)
    const arg = posArgs[0]
    return String(arg)
}

const toNumber = {
    type: {
        type: 'function',
        posArgs: [{ type: 'anyPrimitive' }],
        namedArgs: {},
        returnType: { type: 'concrete', value: { type: 'number' } },
    },
    value: toNumberRaw,
} satisfies USSValue

const toString = {
    type: {
        type: 'function',
        posArgs: [{ type: 'anyPrimitive' }],
        namedArgs: {},
        returnType: { type: 'concrete', value: { type: 'string' } },
    },
    value: toStringRaw,
} satisfies USSValue

export const defaultConstants: Constants = new Map<string, USSValue>([
    ['true', { type: { type: 'boolean' }, value: true }] satisfies [string, USSValue],
    ['false', { type: { type: 'boolean' }, value: false }] satisfies [string, USSValue],
    ['null', { type: { type: 'null' }, value: null }] satisfies [string, USSValue],
    ['inf', { type: { type: 'number' }, value: Infinity }] satisfies [string, USSValue],
    ['pi', { type: { type: 'number' }, value: Math.PI }] satisfies [string, USSValue],
    ['E', { type: { type: 'number' }, value: Math.E }] satisfies [string, USSValue],
    numericUnaryFunction('abs', Math.abs),
    numericUnaryFunction('sqrt', Math.sqrt),
    numericUnaryFunction('ln', Math.log),
    numericUnaryFunction('log10', Math.log10),
    numericUnaryFunction('log2', Math.log2),
    numericUnaryFunction('sin', Math.sin),
    numericUnaryFunction('cos', Math.cos),
    numericUnaryFunction('tan', Math.tan),
    numericUnaryFunction('asin', Math.asin),
    numericUnaryFunction('acos', Math.acos),
    numericUnaryFunction('atan', Math.atan),
    numericUnaryFunction('ceil', Math.ceil),
    numericUnaryFunction('floor', Math.floor),
    numericUnaryFunction('round', Math.round),
    numericUnaryFunction('exp', Math.exp),
    numericUnaryFunction('sign', Math.sign),
    numericUnaryFunction('nanTo0', value => isNaN(value) ? 0 : value),
    ['toNumber', toNumber],
    ['toString', toString],
] satisfies [string, USSValue][])
