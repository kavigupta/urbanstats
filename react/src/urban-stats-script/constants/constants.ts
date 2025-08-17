import { Context } from '../context'
import { renderType, USSRawValue, USSValue, DocumentationTable, createConstantExpression } from '../types-values'

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
    documentationTable?: DocumentationTable,
): [string, USSValue] {
    return [name, {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- namedArgs is unused but needed for the function signature
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            return mathFunction(posArgs[0] as number)
        },
        documentation: {
            humanReadableName,
            category: 'math',
            longDescription,
            ...(documentationTable && { documentationTable }),
        },
    }] satisfies [string, USSValue]
}

// Factory function to create two-argument number-to-number functions
function createTwoNumberToNumberFunction(
    name: string,
    mathFunction: (x: number, y: number) => number,
    humanReadableName: string,
    longDescription: string,
): [string, USSValue] {
    return [name, {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'number' } }, { type: 'concrete', value: { type: 'number' } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- namedArgs is unused but needed for the function signature
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            return mathFunction(posArgs[0] as number, posArgs[1] as number)
        },
        documentation: {
            humanReadableName,
            category: 'math',
            longDescription,
        },
    }] satisfies [string, USSValue]
}

function validateWeights(weights: number[], values: number[]): number {
    if (values.length !== weights.length) {
        throw new Error('Values and weights must have the same length')
    }
    if (weights.some(weight => isNaN(weight))) {
        throw new Error('Weights must not contain NaN')
    }
    if (weights.some(weight => weight < 0)) {
        throw new Error('Weights must not contain negative values')
    }
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    if (totalWeight === 0) {
        throw new Error('Total weight cannot be zero')
    }
    return totalWeight
}

function weightedQuantile(values: number[], weights: number[], quantile: number): number {
    const totalWeight = validateWeights(weights, values)
    if (quantile < 0 || quantile > 1) {
        throw new Error('Quantile must be between 0 and 1')
    }
    if (values.length === 0) {
        return NaN
    }
    const sortedPairs = values.map((value, index) => [value, weights[index]])
    sortedPairs.sort((a, b) => a[0] - b[0])
    const targetWeight = quantile * totalWeight
    let cumulativeWeight = 0
    for (let i = 0; i < sortedPairs.length; i++) {
        cumulativeWeight += sortedPairs[i][1]
        if (cumulativeWeight >= targetWeight) {
            if (i === sortedPairs.length - 1 || cumulativeWeight > targetWeight) {
                return sortedPairs[0][0]
            }
            // hit it exactly, which means you'd hit it exactly from the other direction
            return (sortedPairs[i][0] + sortedPairs[i + 1][0]) / 2
        }
    }
    return sortedPairs[sortedPairs.length - 1][0] // fallback
}

// Factory function to create vector-to-number functions
function createVectorToNumberFunction(
    name: string,
    calculationFunction: (values: number[]) => number,
    emptyArrayValue: number,
    humanReadableName: string,
    longDescription: string,
): [string, USSValue] {
    return [name, {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } }], namedArgs: {}, returnType: { type: 'concrete', value: { type: 'number' } } },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- namedArgs is unused but needed for the function signature
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            const values = posArgs[0] as number[]
            if (values.length === 0) {
                return emptyArrayValue
            }
            return calculationFunction(values)
        },
        documentation: {
            humanReadableName,
            category: 'math',
            longDescription,
        },
    }] satisfies [string, USSValue]
}

// Factory function to create weighted vector functions
function createWeightedVectorFunction(
    name: string,
    calculationFunction: (values: number[], weights: number[]) => number,
    humanReadableName: string,
    longDescription: string,
): [string, USSValue] {
    return [name, {
        type: { type: 'function', posArgs: [{ type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } }], namedArgs: { weights: { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } }, defaultValue: createConstantExpression(null) } }, returnType: { type: 'concrete', value: { type: 'number' } } },
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>) => {
            const values = posArgs[0] as number[]
            // Handle empty arrays gracefully
            if (values.length === 0) {
                return NaN
            }
            const weights = namedArgs.weights ? (namedArgs.weights as number[]) : Array.from({ length: values.length }, () => 1)
            return calculationFunction(values, weights)
        },
        documentation: {
            humanReadableName,
            category: 'math',
            longDescription,
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
    createNumberToNumberFunction('ln', Math.log, 'Natural Logarithm', 'Returns the natural logarithm (base e) of a number.', 'logarithm-functions'),
    createNumberToNumberFunction('log10', Math.log10, 'Base-10 Logarithm', 'Returns the base-10 logarithm of a number.', 'logarithm-functions'),
    createNumberToNumberFunction('log2', Math.log2, 'Base-2 Logarithm', 'Returns the base-2 logarithm of a number.', 'logarithm-functions'),
    createNumberToNumberFunction('sin', Math.sin, 'Sine', 'Returns the sine of an angle in radians.', 'trigonometric-functions'),
    createNumberToNumberFunction('cos', Math.cos, 'Cosine', 'Returns the cosine of an angle in radians.', 'trigonometric-functions'),
    createNumberToNumberFunction('tan', Math.tan, 'Tangent', 'Returns the tangent of an angle in radians.'),
    createNumberToNumberFunction('asin', Math.asin, 'Arcsine', 'Returns the arcsine (inverse sine) of a number in radians.'),
    createNumberToNumberFunction('acos', Math.acos, 'Arccosine', 'Returns the arccosine (inverse cosine) of a number in radians.', 'trigonometric-functions'),
    createNumberToNumberFunction('atan', Math.atan, 'Arctangent', 'Returns the arctangent (inverse tangent) of a number in radians.'),
    createNumberToNumberFunction('ceil', Math.ceil, 'Ceiling', 'Rounds a number up to the nearest integer.'),
    createNumberToNumberFunction('floor', Math.floor, 'Floor', 'Rounds a number down to the nearest integer.'),
    createNumberToNumberFunction('round', Math.round, 'Round', 'Rounds a number to the nearest integer.'),
    createNumberToNumberFunction('exp', Math.exp, 'Exponential', 'Returns e raised to the power of the given number.'),
    createNumberToNumberFunction('sign', Math.sign, 'Sign', 'Returns the sign of a number: 1 for positive, -1 for negative, 0 for zero.'),
    createNumberToNumberFunction('nanTo0', (x: number) => isNaN(x) ? 0 : x, 'NaN to Zero', 'Converts NaN values to 0, leaving other numbers unchanged.'),
    createTwoNumberToNumberFunction('maximum', Math.max, 'Maximum', 'Returns the larger of two numbers.'),
    createTwoNumberToNumberFunction('minimum', Math.min, 'Minimum', 'Returns the smaller of two numbers.'),
    createVectorToNumberFunction('sum', values => values.reduce((a, b) => a + b, 0), 0, 'Sum', 'Returns the sum of all numbers in a vector.'),
    createVectorToNumberFunction('min', values => Math.min(...values), Infinity, 'Vector Minimum', 'Returns the smallest number in a vector.'),
    createVectorToNumberFunction('max', values => Math.max(...values), -Infinity, 'Vector Maximum', 'Returns the largest number in a vector.'),
    createWeightedVectorFunction('mean', (values, weights) => {
        const totalWeight = validateWeights(weights, values)
        return values.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight
    }, 'Mean', 'Returns the arithmetic mean (average) of all numbers in a vector. If weights are provided as a named argument, returns the weighted mean.'),
    createWeightedVectorFunction('median', (values, weights) => {
        return weightedQuantile(values, weights, 0.5)
    }, 'Median', 'Returns the median (middle value) of all numbers in a vector. For even-length vectors, returns the average of the two middle values. If weights are provided as a named argument, returns the weighted median.'),
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
