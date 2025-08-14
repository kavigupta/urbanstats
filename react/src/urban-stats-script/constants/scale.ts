import { USSType, USSValue, createConstantExpression } from '../types-values'

// Functions can't be send over the worker boundary, so instead we must send descriptors
export interface LinearScaleDescriptor { kind: 'linear', min: number, max: number }

export type ScaleDescriptor =
    LinearScaleDescriptor |
    { kind: 'log', linearScale: LinearScaleDescriptor }
export type Scale = (values: number[], min?: number, max?: number, center?: number) => ScaleDescriptor

export interface ScaleInstance {
    forward: (value: number) => number
    inverse: (value: number) => number
}

export const scaleType = {
    type: 'opaque',
    name: 'scale',
} satisfies USSType

export function instantiate(descriptor: ScaleDescriptor): ScaleInstance {
    switch (descriptor.kind) {
        case 'linear':
            const { min, max } = descriptor
            if (min === max) {
                // just arbitrarily map min <=> 0.5
                return {
                    forward: x => 0.5 + x - min,
                    inverse: x => x - 0.5 + min,
                }
            }
            const range = max - min

            return {
                forward: (value: number) => (value - min) / range,
                inverse: (value: number) => value * range + min,
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

    let computedMin = min ?? Math.min(...values)
    let computedMax = max ?? Math.max(...values)

    if (center !== undefined) {
        if (min !== undefined && max !== undefined) {
            if (Math.abs(center - (min + max) / 2) > 1e-10) {
                throw new Error(`Inconsistent parameters: center ${center} does not equal (min + max) / 2 = ${min + max} / 2`)
            }
        }
        else if (min !== undefined) {
            computedMax = 2 * center - min
        }
        else if (max !== undefined) {
            computedMin = 2 * center - max
        }
        else {
            const range = Math.max(computedMax - center, center - computedMin)
            computedMin = center - range
            computedMax = center + range
        }
    }
    return {
        kind: 'linear',
        min: computedMin,
        max: computedMax,
    }
}

const logScale: Scale = (values: number[], min?: number, max?: number, center?: number) => {
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
    documentation: { humanReadableName: 'Linear Scale', isDefault: true },
}

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
    documentation: { humanReadableName: 'Logarithmic Scale' },
}
