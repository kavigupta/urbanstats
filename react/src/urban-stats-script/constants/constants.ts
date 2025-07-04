import { assert } from '../../utils/defensive'
import { Context } from '../context'
import { USSRawValue, USSValue } from '../types-values'

import { hsv, renderColor, rgb } from './color'
import { toNumber, toString } from './convert'
import { cMap } from './map'
import { constructRampValue, reverseRampValue, rampConsts } from './ramp'
import { regression } from './regr'
import { linearScaleValue, logScaleValue } from './scale'

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
            documentation: { humanReadableName: name },
        },
    ]
}

function numericBinaryFunction(
    name: string,
    func: (a: number, b: number) => number,
): [string, USSValue] {
    return [
        name,
        {
            type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }, { type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
            value: (
                ctx: Context,
                posArgs: USSRawValue[],
                namedArgs: Record<string, USSRawValue>,
            ) => {
                assert(posArgs.length === 2, `Expected 2 arguments for ${name}, got ${posArgs.length}`)
                assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for ${name}, got ${Object.keys(namedArgs).length}`)
                const [arg1, arg2] = posArgs
                assert(typeof arg1 === 'number' && typeof arg2 === 'number', `Expected two number arguments for ${name}, got ${typeof arg1} and ${typeof arg2}`)
                return func(arg1, arg2)
            },
            documentation: { humanReadableName: name },
        },
    ]
}

function numericAggregationFunction(
    name: string,
    func: (values: number[]) => number,
): [string, USSValue] {
    return [
        name,
        {
            type: {
                type: 'function',
                posArgs: [{ type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } }],
                namedArgs: {},
                returnType: { type: 'concrete', value: { type: 'number' } },
            },
            value: (
                ctx: Context,
                posArgs: USSRawValue[],
                namedArgs: Record<string, USSRawValue>,
            ) => {
                assert(posArgs.length === 1, `Expected 1 argument for ${name}, got ${posArgs.length}`)
                assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for ${name}, got ${Object.keys(namedArgs).length}`)
                const arg = posArgs[0]
                assert(Array.isArray(arg) && arg.every(item => typeof item === 'number'), `Expected vector of numbers argument for ${name}, got ${JSON.stringify(arg)}`)
                return func(arg)
            },
            documentation: { humanReadableName: name },
        },
    ]
}

export const defaultConstants: Constants = new Map<string, USSValue>([
    ['true', { type: { type: 'boolean' }, value: true, documentation: { humanReadableName: 'true' } }] satisfies [string, USSValue],
    ['false', { type: { type: 'boolean' }, value: false, documentation: { humanReadableName: 'false' } }] satisfies [string, USSValue],
    ['null', { type: { type: 'null' }, value: null, documentation: { humanReadableName: 'null' } }] satisfies [string, USSValue],
    ['inf', { type: { type: 'number' }, value: Infinity, documentation: { humanReadableName: '+Infinity' } }] satisfies [string, USSValue],
    ['pi', { type: { type: 'number' }, value: Math.PI, documentation: { humanReadableName: 'π' } }] satisfies [string, USSValue],
    ['E', { type: { type: 'number' }, value: Math.E, documentation: { humanReadableName: 'e' } }] satisfies [string, USSValue],
    ['NaN', { type: { type: 'number' }, value: NaN, documentation: { humanReadableName: 'NaN' } }] satisfies [string, USSValue],
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
    numericBinaryFunction('maximum', (a, b) => Math.max(a, b)),
    numericBinaryFunction('minimum', (a, b) => Math.min(a, b)),
    numericAggregationFunction('sum', values => values.reduce((a, b) => a + b, 0)),
    numericAggregationFunction('mean', values => values.reduce((a, b) => a + b, 0) / values.length),
    numericAggregationFunction('min', values => Math.min(...values)),
    numericAggregationFunction('max', values => Math.max(...values)),
    numericAggregationFunction('median', (values) => {
        if (values.length === 0) {
            return NaN
        }
        const sorted = [...values].sort((a, b) => a - b)
        const mid = Math.floor(sorted.length / 2)
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    }),
    ['toNumber', toNumber],
    ['toString', toString],
    ['regression', regression(10)],
    ['rgb', rgb],
    ['hsv', hsv],
    ['renderColor', renderColor],
    ['constructRamp', constructRampValue],
    ['reverseRamp', reverseRampValue],
    ...rampConsts,
    ['linearScale', linearScaleValue],
    ['logScale', logScaleValue],
    ['cMap', cMap],
] satisfies [string, USSValue][])
