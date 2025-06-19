import { assert } from '../../utils/defensive'
import { Context } from '../context'
import { USSRawValue, USSValue } from '../types-values'

import { hsv, renderColor, rgb } from './color'
import { toNumber, toString } from './convert'
import { regression } from './regr'

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
    ['regression', regression(10)],
    ['rgb', rgb],
    ['hsv', hsv],
    ['renderColor', renderColor],
] satisfies [string, USSValue][])
