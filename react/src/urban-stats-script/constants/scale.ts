import { USSType, USSValue } from '../types-values'

// Functions can't be send over the worker boundary, so instead we must send descriptors
export interface LinearScaleDescriptor { kind: 'linear', min: number, max: number }

export type ScaleDescriptor =
    LinearScaleDescriptor |
    { kind: 'log', linearScale: LinearScaleDescriptor }
export type Scale = (values: number[]) => ScaleDescriptor

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

const linearScale: Scale = (values: number[]) => {
    values = values.filter(value => typeof value === 'number' && !isNaN(value))
    const min = Math.min(...values)
    const max = Math.max(...values)

    return {
        kind: 'linear',
        min,
        max,
    }
}

const logScale: Scale = (values: number[]) => {
    const logVals = values.map(Math.log)
    const linearScaleDescriptor = linearScale(logVals) as LinearScaleDescriptor
    return {
        kind: 'log',
        linearScale: linearScaleDescriptor,
    }
}

export const linearScaleValue: USSValue = {
    type: scaleType,
    value: {
        type: 'opaque',
        value: linearScale,
    },
    documentation: { humanReadableName: 'Linear Scale' },
}

export const logScaleValue: USSValue = {
    type: scaleType,
    value: {
        type: 'opaque',
        value: logScale,
    },
    documentation: { humanReadableName: 'Logarithmic Scale' },
}
