import { USSType, USSValue } from '../types-values'

export interface ScaleInstance {
    forward: (value: number) => number
    inverse: (value: number) => number
}
export type Scale = (values: number[]) => ScaleInstance

export const scaleType = {
    type: 'opaque',
    name: 'scale',
} satisfies USSType

const linearScale: Scale = (values: number[]) => {
    values = values.filter(value => typeof value === 'number' && !isNaN(value))
    const min = Math.min(...values)
    const max = Math.max(...values)
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
}

const logScale: Scale = (values: number[]) => {
    const logVals = values.map(Math.log)
    const { forward, inverse } = linearScale(logVals)
    return {
        forward: (value: number) => forward(Math.log(value)),
        inverse: (value: number) => Math.exp(inverse(value)),
    }
}

export const linearScaleValue: USSValue = {
    type: scaleType,
    value: {
        type: 'opaque',
        value: linearScale,
    },
}

export const logScaleValue: USSValue = {
    type: scaleType,
    value: {
        type: 'opaque',
        value: logScale,
    },
}
