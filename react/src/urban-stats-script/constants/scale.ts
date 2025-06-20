import { USSType, USSValue } from '../types-values'

// Functions can't be send over the worker boundary, so instead we must send descriptors
export type ScaleDescriptor =
    { kind: 'linear', min: number, max: number } |
    { kind: 'log', min: number, max: number }
export type Scale = (values: number[]) => ScaleDescriptor

export interface ScaleInstance {
    forward: (value: number) => number
    inverse: (value: number) => number
}

export const scaleType = {
    type: 'opaque',
    name: 'scale',
} satisfies USSType

export function instantiate({ kind, min, max }: ScaleDescriptor): ScaleInstance {
    switch (kind) {
        case 'linear':
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
            const { forward, inverse } = instantiate({ kind: 'linear', min, max })
            return {
                forward: (value: number) => forward(Math.log(value)),
                inverse: (value: number) => Math.exp(inverse(value)),
            }
    }
}

const linearScale: Scale = (values: number[]) => {
    values = values.filter(value => typeof value === 'number' && !isNaN(value) && isFinite(value))
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
    const { min, max } = linearScale(logVals)
    return {
        kind: 'log',
        min,
        max,
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
