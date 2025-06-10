import { calculateRegression, computePearsonR2 } from '../mapper/regression'
import { assert } from '../utils/defensive'

import { Context } from './context'
import { parseNumber } from './lexer'
import { USSFunctionArgType, USSRawValue, USSType, USSValue } from './types-values'

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

const toNumber = {
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

const toString = {
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

export function regressionResultType(numRegressionDependentsMax: number): USSType {
    return {
        type: 'object',
        properties: new Map<string, USSType>([
            ['residuals', { type: 'vector', elementType: { type: 'number' } }] satisfies [string, USSType],
            ...Array.from({ length: numRegressionDependentsMax }, (_, i: number) => [`m${i + 1}`, { type: 'number' }] satisfies [string, USSType]),
            ['b', { type: 'number' }],
            ['r2', { type: 'number' }],
        ]),
    }
}

export function regressionType(numRegressionDependentsMax: number): USSType {
    const requiredVariableType = { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } } } satisfies { type: USSFunctionArgType, defaultValue?: USSRawValue }
    const optionalVariableType = { ...requiredVariableType, defaultValue: null } satisfies { type: USSFunctionArgType, defaultValue?: USSRawValue }
    return {
        type: 'function',
        posArgs: [],
        namedArgs: {
            y: requiredVariableType,
            x1: requiredVariableType,
            ...Array.from({ length: numRegressionDependentsMax - 1 },
                (_, i) => [`x${i + 2}`, optionalVariableType] satisfies [string, { type: USSFunctionArgType, defaultValue?: USSRawValue }],
            ).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
            weight: optionalVariableType,
            noIntercept: { type: { type: 'concrete', value: { type: 'boolean' } }, defaultValue: false } satisfies { type: USSFunctionArgType, defaultValue?: USSRawValue },
        },
        returnType: { type: 'concrete', value: regressionResultType(numRegressionDependentsMax) },
    }
}

function regression(numRegressionDependentsMax: number): USSValue {
    return {
        type: regressionType(numRegressionDependentsMax),
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
            assert(posArgs.length === 0, `Expected no positional arguments for regression, got ${posArgs.length}`)
            const dependent = namedArgs.y as number[]
            const independents = []
            const indices = []
            for (let i = 1; i <= numRegressionDependentsMax; i++) {
                const independent = namedArgs[`x${i}`] as number[] | null
                if (independent !== null) {
                    independents.push(independent)
                    indices.push(i)
                }
            }
            const w = namedArgs.weight as number[] | null

            const { residuals, weights, intercept } = calculateRegression(
                dependent,
                independents,
                w ?? undefined,
                namedArgs.noIntercept,
            )
            assert(weights.length === indices.length, `Expected ${indices.length} weights, got ${weights.length}`)

            const result = new Map<string, USSRawValue>()
            for (let i = 0; i < indices.length; i++) {
                result.set(`m${indices[i]}`, weights[i])
            }
            for (let i = 0; i < numRegressionDependentsMax; i++) {
                if (!result.has(`m${i + 1}`)) {
                    result.set(`m${i + 1}`, NaN)
                }
            }
            result.set('r2', computePearsonR2(dependent, residuals, w ?? undefined))
            result.set('residuals', residuals)
            result.set('b', intercept)

            return result
        },
    }
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
] satisfies [string, USSValue][])
