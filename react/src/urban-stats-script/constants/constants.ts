import { assert } from '../../utils/defensive'
import { Context } from '../context'
import { renderType, USSRawValue, USSValue, ConstantCategory, DocumentationTable } from '../types-values'

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

// Factory function to create number-to-number functions
function createNumberToNumberFunction(
    name: string,
    mathFunction: (x: number) => number,
    humanReadableName: string,
    longDescription: string,
    category: ConstantCategory = 'math',
    documentationTable?: DocumentationTable,
): [string, USSValue] {
    return [name, {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            assert(posArgs.length === 1, `Expected 1 argument for ${name}, got ${posArgs.length}`)
            assert(Object.keys(namedArgs).length === 0, `Expected no named arguments for ${name}, got ${Object.keys(namedArgs).length}`)
            const arg = posArgs[0]
            assert(typeof arg === 'number', `Expected number argument for ${name}, got ${typeof arg}`)
            return mathFunction(arg)
        },
        documentation: {
            humanReadableName,
            category,
            longDescription,
            ...(documentationTable && { documentationTable }),
        },
    }] satisfies [string, USSValue]
}

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
    createNumberToNumberFunction('abs', Math.abs, 'Absolute Value', 'Returns the absolute value of a number (removes the negative sign).'),
    createNumberToNumberFunction('sqrt', Math.sqrt, 'Square Root', 'Returns the square root of a number.'),
    createNumberToNumberFunction('ln', Math.log, 'Natural Logarithm', 'Returns the natural logarithm (base e) of a number.', 'math', 'logarithm-functions'),
    createNumberToNumberFunction('log10', Math.log10, 'Base-10 Logarithm', 'Returns the base-10 logarithm of a number.', 'math', 'logarithm-functions'),
    createNumberToNumberFunction('log2', Math.log2, 'Base-2 Logarithm', 'Returns the base-2 logarithm of a number.', 'math', 'logarithm-functions'),
    createNumberToNumberFunction('sin', Math.sin, 'Sine', 'Returns the sine of an angle in radians.', 'math', 'trigonometric-functions'),
    createNumberToNumberFunction('cos', Math.cos, 'Cosine', 'Returns the cosine of an angle in radians.', 'math', 'trigonometric-functions'),
    createNumberToNumberFunction('tan', Math.tan, 'Tangent', 'Returns the tangent of an angle in radians.'),
    createNumberToNumberFunction('asin', Math.asin, 'Arcsine', 'Returns the arcsine (inverse sine) of a number in radians.'),
    createNumberToNumberFunction('acos', Math.acos, 'Arccosine', 'Returns the arccosine (inverse cosine) of a number in radians.', 'math', 'trigonometric-functions'),
    createNumberToNumberFunction('atan', Math.atan, 'Arctangent', 'Returns the arctangent (inverse tangent) of a number in radians.'),
    createNumberToNumberFunction('ceil', Math.ceil, 'Ceiling', 'Rounds a number up to the nearest integer.'),
    createNumberToNumberFunction('floor', Math.floor, 'Floor', 'Rounds a number down to the nearest integer.'),
    createNumberToNumberFunction('round', Math.round, 'Round', 'Rounds a number to the nearest integer.'),
    createNumberToNumberFunction('exp', Math.exp, 'Exponential', 'Returns e raised to the power of the given number.'),
    createNumberToNumberFunction('sign', Math.sign, 'Sign', 'Returns the sign of a number: 1 for positive, -1 for negative, 0 for zero.'),
    createNumberToNumberFunction('nanTo0', (x: number) => isNaN(x) ? 0 : x, 'NaN to Zero', 'Converts NaN values to 0, leaving other numbers unchanged.'),
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
