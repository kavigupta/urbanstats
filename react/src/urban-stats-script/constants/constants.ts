import { assert } from '../../utils/defensive'
import { Context } from '../context'
import { renderType, USSRawValue, USSValue } from '../types-values'

import { osmBasemap, noBasemap } from './basemap'
import { hsv, renderColor, rgb, colorConstants } from './color'
import { toNumber, toString } from './convert'
import { constructInsetValue, constructInsetsValue, insetConsts } from './insets'
import { cMap, constructOutline, pMap } from './map'
import { constructRampValue, reverseRampValue, rampConsts, divergingRampValue } from './ramp'
import { regression } from './regr'
import { linearScaleValue, logScaleValue } from './scale'
import { unitConstants } from './units'

type Constants = Map<string, USSValue>

export const defaultConstants: Constants = new Map<string, USSValue>([
    ['true', { type: { type: 'boolean' }, value: true, documentation: { humanReadableName: 'true', category: 'logic', isDefault: true, longDescription: 'Boolean true value representing logical truth.' } }] satisfies [string, USSValue],
    ['false', { type: { type: 'boolean' }, value: false, documentation: { humanReadableName: 'false', category: 'logic', longDescription: 'Boolean false value representing logical falsehood.' } }] satisfies [string, USSValue],
    ['null', { type: { type: 'null' }, value: null, documentation: { humanReadableName: 'null', category: 'logic', isDefault: true, longDescription: 'Represents the absence of a value or an uninitialized variable.' } }] satisfies [string, USSValue],
    ['inf', { type: { type: 'number' }, value: Infinity, documentation: { humanReadableName: '+Infinity', category: 'math', longDescription: 'Positive infinity, a special numeric value representing an unbounded limit.' } }] satisfies [string, USSValue],
    ['pi', { type: { type: 'number' }, value: Math.PI, documentation: { humanReadableName: 'π', category: 'math', longDescription: 'The mathematical constant π (pi), approximately 3.14159, representing the ratio of a circle\'s circumference to its diameter.' } }] satisfies [string, USSValue],
    ['E', { type: { type: 'number' }, value: Math.E, documentation: { humanReadableName: 'e', category: 'math', longDescription: 'The mathematical constant e, approximately 2.71828, representing the base of the natural logarithm.' } }] satisfies [string, USSValue],
    ['NaN', { type: { type: 'number' }, value: NaN, documentation: { humanReadableName: 'NaN', category: 'math', longDescription: 'Not a Number, a special numeric value representing an undefined or unrepresentable numeric result.' } }] satisfies [string, USSValue],
    ...colorConstants,
    ...unitConstants,
    ['abs', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for abs, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for abs, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for abs, got ${typeof arg}`)
            return Math.abs(arg)
        },
        documentation: {
            humanReadableName: 'Absolute Value',
            category: 'math',
            longDescription: 'Returns the absolute value of a number (removes the negative sign).',
        },
    }] satisfies [string, USSValue],
    ['sqrt', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for sqrt, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for sqrt, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for sqrt, got ${typeof arg}`)
            return Math.sqrt(arg)
        },
        documentation: {
            humanReadableName: 'Square Root',
            category: 'math',
            longDescription: 'Returns the square root of a number.',
        },
    }] satisfies [string, USSValue],
    ['ln', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for ln, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for ln, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for ln, got ${typeof arg}`)
            return Math.log(arg)
        },
        documentation: {
            humanReadableName: 'Natural Logarithm',
            category: 'math',
            longDescription: 'Returns the natural logarithm (base e) of a number.',
            documentationTable: 'logarithm-functions',
        },
    }] satisfies [string, USSValue],
    ['log10', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for log10, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for log10, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for log10, got ${typeof arg}`)
            return Math.log10(arg)
        },
        documentation: {
            humanReadableName: 'Base-10 Logarithm',
            category: 'math',
            longDescription: 'Returns the base-10 logarithm of a number.',
            documentationTable: 'logarithm-functions',
        },
    }] satisfies [string, USSValue],
    ['log2', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for log2, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for log2, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for log2, got ${typeof arg}`)
            return Math.log2(arg)
        },
        documentation: {
            humanReadableName: 'Base-2 Logarithm',
            category: 'math',
            longDescription: 'Returns the base-2 logarithm of a number.',
            documentationTable: 'logarithm-functions',
        },
    }] satisfies [string, USSValue],
    ['sin', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for sin, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for sin, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for sin, got ${typeof arg}`)
            return Math.sin(arg)
        },
        documentation: {
            humanReadableName: 'Sine',
            category: 'math',
            longDescription: 'Returns the sine of an angle in radians.',
            documentationTable: 'trigonometric-functions',
        },
    }] satisfies [string, USSValue],
    ['cos', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for cos, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for cos, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for cos, got ${typeof arg}`)
            return Math.cos(arg)
        },
        documentation: {
            humanReadableName: 'Cosine',
            category: 'math',
            longDescription: 'Returns the cosine of an angle in radians.',
            documentationTable: 'trigonometric-functions',
        },
    }] satisfies [string, USSValue],
    ['tan', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for tan, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for tan, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for tan, got ${typeof arg}`)
            return Math.tan(arg)
        },
        documentation: {
            humanReadableName: 'Tangent',
            category: 'math',
            longDescription: 'Returns the tangent of an angle in radians.',
        },
    }] satisfies [string, USSValue],
    ['asin', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for asin, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for asin, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for asin, got ${typeof arg}`)
            return Math.asin(arg)
        },
        documentation: {
            humanReadableName: 'Arcsine',
            category: 'math',
            longDescription: 'Returns the arcsine (inverse sine) of a number in radians.',
        },
    }] satisfies [string, USSValue],
    ['acos', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for acos, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for acos, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for acos, got ${typeof arg}`)
            return Math.acos(arg)
        },
        documentation: {
            humanReadableName: 'Arccosine',
            category: 'math',
            longDescription: 'Returns the arccosine (inverse cosine) of a number in radians.',
            documentationTable: 'trigonometric-functions',
        },
    }] satisfies [string, USSValue],
    ['atan', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for atan, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for atan, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for atan, got ${typeof arg}`)
            return Math.atan(arg)
        },
        documentation: {
            humanReadableName: 'Arctangent',
            category: 'math',
            longDescription: 'Returns the arctangent (inverse tangent) of a number in radians.',
        },
    }] satisfies [string, USSValue],
    ['ceil', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for ceil, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for ceil, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for ceil, got ${typeof arg}`)
            return Math.ceil(arg)
        },
        documentation: {
            humanReadableName: 'Ceiling',
            category: 'math',
            longDescription: 'Rounds a number up to the nearest integer.',
        },
    }] satisfies [string, USSValue],
    ['floor', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for floor, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for floor, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for floor, got ${typeof arg}`)
            return Math.floor(arg)
        },
        documentation: {
            humanReadableName: 'Floor',
            category: 'math',
            longDescription: 'Rounds a number down to the nearest integer.',
        },
    }] satisfies [string, USSValue],
    ['round', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for round, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for round, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for round, got ${typeof arg}`)
            return Math.round(arg)
        },
        documentation: {
            humanReadableName: 'Round',
            category: 'math',
            longDescription: 'Rounds a number to the nearest integer.',
        },
    }] satisfies [string, USSValue],
    ['exp', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for exp, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for exp, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for exp, got ${typeof arg}`)
            return Math.exp(arg)
        },
        documentation: {
            humanReadableName: 'Exponential',
            category: 'math',
            longDescription: 'Returns e raised to the power of the given number.',
        },
    }] satisfies [string, USSValue],
    ['sign', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for sign, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for sign, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for sign, got ${typeof arg}`)
            return Math.sign(arg)
        },
        documentation: {
            humanReadableName: 'Sign',
            category: 'math',
            longDescription: 'Returns the sign of a number: 1 for positive, -1 for negative, 0 for zero.',
        },
    }] satisfies [string, USSValue],
    ['nanTo0', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for nanTo0, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for nanTo0, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for nanTo0, got ${typeof arg}`)
            return isNaN(arg) ? 0 : arg
        },
        documentation: {
            humanReadableName: 'NaN to Zero',
            category: 'math',
            longDescription: 'Converts NaN values to 0, leaving other numbers unchanged.',
        },
    }] satisfies [string, USSValue],
    ['maximum', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }, { type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 2, `Expected 2 arguments for maximum, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for maximum, got ${Object.keys(namedArgs).length}`)
            const [arg1, arg2] = posArgs
            assert(typeof arg1 === 'number' && typeof arg2 === 'number', `Expected two number arguments for maximum, got ${typeof arg1} and ${typeof arg2}`)
            return Math.max(arg1, arg2)
        },
        documentation: {
            humanReadableName: 'Maximum',
            category: 'math',
            longDescription: 'Returns the larger of two numbers.',
        },
    }] satisfies [string, USSValue],
    ['minimum', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }, { type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 2, `Expected 2 arguments for minimum, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for minimum, got ${Object.keys(namedArgs).length}`)
            const [arg1, arg2] = posArgs
            assert(typeof arg1 === 'number' && typeof arg2 === 'number', `Expected two number arguments for minimum, got ${typeof arg1} and ${typeof arg2}`)
            return Math.min(arg1, arg2)
        },
        documentation: {
            humanReadableName: 'Minimum',
            category: 'math',
            longDescription: 'Returns the smaller of two numbers.',
        },
    }] satisfies [string, USSValue],
    ['sum', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for sum, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for sum, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(Array.isArray(arg) && arg.every(item => typeof item === 'number'), `Expected vector of numbers argument for sum, got ${JSON.stringify(arg)}`)
            return (arg).reduce((a, b) => a + b, 0)
        },
        documentation: {
            humanReadableName: 'Sum',
            category: 'math',
            longDescription: 'Returns the sum of all numbers in a vector.',
        },
    }] satisfies [string, USSValue],
    ['mean', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for mean, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for mean, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(Array.isArray(arg) && arg.every(item => typeof item === 'number'), `Expected vector of numbers argument for mean, got ${JSON.stringify(arg)}`)
            const numbers = arg
            return numbers.reduce((a, b) => a + b, 0) / numbers.length
        },
        documentation: {
            humanReadableName: 'Mean',
            category: 'math',
            longDescription: 'Returns the arithmetic mean (average) of all numbers in a vector.',
        },
    }] satisfies [string, USSValue],
    ['min', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for min, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for min, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(Array.isArray(arg) && arg.every(item => typeof item === 'number'), `Expected vector of numbers argument for min, got ${JSON.stringify(arg)}`)
            return Math.min(...(arg))
        },
        documentation: {
            humanReadableName: 'Vector Minimum',
            category: 'math',
            longDescription: 'Returns the smallest number in a vector.',
        },
    }] satisfies [string, USSValue],
    ['max', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for max, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for max, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(Array.isArray(arg) && arg.every(item => typeof item === 'number'), `Expected vector of numbers argument for max, got ${JSON.stringify(arg)}`)
            return Math.max(...(arg))
        },
        documentation: {
            humanReadableName: 'Vector Maximum',
            category: 'math',
            longDescription: 'Returns the largest number in a vector.',
        },
    }] satisfies [string, USSValue],
    ['median', {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for median, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for median, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(Array.isArray(arg) && arg.every(item => typeof item === 'number'), `Expected vector of numbers argument for median, got ${JSON.stringify(arg)}`)
            const values = arg
            if (values.length === 0) {
                return NaN
            }
            const sorted = [...values].sort((a, b) => a - b)
            const mid = Math.floor(sorted.length / 2)
            return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
        },
        documentation: {
            humanReadableName: 'Median',
            category: 'math',
            longDescription: 'Returns the median (middle value) of all numbers in a vector. For even-length vectors, returns the average of the two middle values.',
        },
    }] satisfies [string, USSValue],
    ['toNumber', toNumber],
    ['toString', toString],
    ['regression', regression(10)],
    ['rgb', rgb],
    ['hsv', hsv],
    ['renderColor', renderColor],
    ['constructRamp', constructRampValue],
    ['reverseRamp', reverseRampValue],
    ['divergingRamp', divergingRampValue],
    ...rampConsts,
    ['constructInset', constructInsetValue],
    ['constructInsets', constructInsetsValue],
    ...insetConsts,
    ['linearScale', linearScaleValue],
    ['logScale', logScaleValue],
    ['cMap', cMap],
    ['pMap', pMap],
    ['constructOutline', constructOutline],
    ['osmBasemap', osmBasemap],
    ['noBasemap', noBasemap],
] satisfies [string, USSValue][])

// for debugging
export function constantsByType(): Record<string, string[]> {
    const grouped = new Map<string, string[]>()
    for (const [name, value] of defaultConstants) {
        const key = renderType(value.type)
        if (!grouped.has(key)) {
            grouped.set(key, [])
        }
        grouped.get(key)!.push(name)
    }
    return Object.fromEntries(grouped)
}
