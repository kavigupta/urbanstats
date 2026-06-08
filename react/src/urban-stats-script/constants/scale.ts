import { USSType, USSValue, createConstantExpression } from '../types-values'

// Functions can't be send over the worker boundary, so instead we must send descriptors
export interface LinearScaleDescriptor { kind: 'linear', min: number, max: number, center?: number }

export type ScaleDescriptor =
    LinearScaleDescriptor |
    { kind: 'log', linearScale: LinearScaleDescriptor }
export type Scale = (values: number[], min?: number, max?: number, center?: number) => ScaleDescriptor

export interface ScaleInstance {
    forward: (value: number) => number
    inverse: (value: number) => number
}

const scaleType = {
    type: 'opaque',
    name: 'scale',
} satisfies USSType

export function instantiate(descriptor: ScaleDescriptor): ScaleInstance {
    switch (descriptor.kind) {
        case 'linear': {
            const { min, max, center } = descriptor
            if (min === max) {
                // just arbitrarily map min <=> 0.5
                return {
                    forward: x => 0.5 + x - min,
                    inverse: x => x - 0.5 + min,
                }
            }
            const range = max - min
            const forward = (value: number): number => (value - min) / range
            const inverse = (t: number): number => t * range + min

            if (center !== undefined) {
                const centerT = forward(center)
                return {
                    forward: (value: number) => {
                        const t = forward(value)
                        if (t < centerT) {
                            return 0.5 * t / centerT
                        }
                        return 0.5 + 0.5 * (t - centerT) / (1 - centerT)
                    },
                    inverse: (normalized: number) => {
                        let t
                        if (normalized < 0.5) {
                            t = (normalized / 0.5) * centerT
                        }
                        else {
                            t = centerT + ((normalized - 0.5) / 0.5) * (1 - centerT)
                        }
                        return inverse(t)
                    },
                }
            }

            return {
                forward,
                inverse,
            }
        }
        case 'log':
            const { forward, inverse } = instantiate(descriptor.linearScale)
            return {
                forward: (value: number) => forward(Math.log(value)),
                inverse: (value: number) => Math.exp(inverse(value)),
            }
    }
}

const linearScale: Scale = (values: number[], min?: number, max?: number, center?: number) => {
    values = values.filter(value => typeof value === 'number' && !isNaN(value) && isFinite(value))

    if (min !== undefined && max !== undefined && min > max) {
        throw new Error(`Inconsistent parameters: min ${min} must be less than or equal to max ${max}`)
    }

    let computedMin = min ?? Math.min(...values)
    let computedMax = max ?? Math.max(...values)

    if (center !== undefined) {
        if (min !== undefined && max !== undefined) {
            if (center <= min + 1e-10 || center >= max - 1e-10) {
                throw new Error(`Inconsistent parameters: center ${center} must be strictly between min ${min} and max ${max}`)
            }
            computedMin = min
            computedMax = max
        }
        else if (min !== undefined) {
            if (center <= min + 1e-10) {
                throw new Error(`Inconsistent parameters: center ${center} must be strictly greater than min ${min}`)
            }
            computedMin = min
            computedMax = 2 * center - min
        }
        else if (max !== undefined) {
            if (center >= max - 1e-10) {
                throw new Error(`Inconsistent parameters: center ${center} must be strictly less than max ${max}`)
            }
            computedMax = max
            computedMin = 2 * center - max
        }
        else {
            // If only center is provided, make a symmetric range around center
            const range = Math.max(computedMax - center, center - computedMin)
            computedMin = center - range
            computedMax = center + range
        }
    }
    return {
        kind: 'linear',
        min: computedMin,
        max: computedMax,
        center,
    }
}

const logScale: Scale = (values: number[], min?: number, max?: number, center?: number) => {
    // For log scale, ensure min, max, center are all > 0 if provided
    if ((min !== undefined && min <= 0) || (max !== undefined && max <= 0) || (center !== undefined && center <= 0)) {
        throw new Error('Log scale min, max, and center must be > 0')
    }
    const logVals = values.map(Math.log)
    const logMin = min !== undefined ? Math.log(min) : undefined
    const logMax = max !== undefined ? Math.log(max) : undefined
    const logCenter = center !== undefined ? Math.log(center) : undefined
    const linearScaleDescriptor = linearScale(logVals, logMin, logMax, logCenter) as LinearScaleDescriptor
    return {
        kind: 'log',
        linearScale: linearScaleDescriptor,
    }
}

export const linearScaleValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            min: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: createConstantExpression(null),
            },
            center: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: createConstantExpression(null),
            },
            max: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: createConstantExpression(null),
            },
        },
        returnType: { type: 'concrete', value: scaleType },
    },
    value: (ctx, posArgs, namedArgs) => {
        const min = namedArgs.min as number | null | undefined
        const max = namedArgs.max as number | null | undefined
        const center = namedArgs.center as number | null | undefined
        // Return a scale function that closes over these params
        return {
            type: 'opaque',
            opaqueType: 'scale',
            value: (values: number[]) => linearScale(values, min ?? undefined, max ?? undefined, center ?? undefined),
        }
    },
    documentation: {
        humanReadableName: 'Linear Scale',
        category: 'scale',
        isDefault: true,
        longDescription: 'Creates a linear scale that maps numeric values to a range. If min/max are not specified, they are computed from the data. If a center parameter is specified, it creates a piecewise linear scale that maps min to 0, center to 0.5, and max to 1.',
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
} satisfies USSValue

export const logScaleValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            min: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: createConstantExpression(null),
            },
            center: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: createConstantExpression(null),
            },
            max: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: createConstantExpression(null),
            },
        },
        returnType: { type: 'concrete', value: scaleType },
    },
    value: (ctx, posArgs, namedArgs) => {
        const min = namedArgs.min as number | null | undefined
        const max = namedArgs.max as number | null | undefined
        const center = namedArgs.center as number | null | undefined
        // Return a scale function that closes over these params
        return {
            type: 'opaque',
            opaqueType: 'scale',
            value: (values: number[]) => logScale(values, min ?? undefined, max ?? undefined, center ?? undefined),
        }
    },
    documentation: {
        humanReadableName: 'Logarithmic Scale',
        category: 'scale',
        longDescription: 'Creates a logarithmic scale that maps numeric values to a range using log transformation. Useful for data with wide ranges or exponential distributions. If min/max are not specified, they are computed from the data. If a center parameter is specified, it creates a piecewise scale that maps min to 0, center to 0.5, and max to 1 in log space.',
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
} satisfies USSValue
