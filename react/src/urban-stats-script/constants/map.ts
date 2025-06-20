import { USSType, USSValue } from '../types-values'

import { RampT } from './ramp'
import { Scale, ScaleDescriptor } from './scale'

export interface CMap {
    geo: string[]
    data: number[]
    scale: ScaleDescriptor
    ramp: RampT
}

export const cMapType = {
    type: 'opaque',
    name: 'cMap',
} satisfies USSType

export const cMap: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            geo: { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'string' } } } },
            data: { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } } },
            scale: { type: { type: 'concrete', value: { type: 'opaque', name: 'scale' } } },
            ramp: { type: { type: 'concrete', value: { type: 'opaque', name: 'ramp' } } },
        },
        returnType: { type: 'concrete', value: cMapType },
    },
    value: (ctx, posArgs, namedArgs) => {
        const geo = namedArgs.geo as string[]
        const data = namedArgs.data as number[]
        const scale = (namedArgs.scale as { type: 'opaque', value: Scale }).value
        const ramp = namedArgs.ramp as RampT

        if (geo.length !== data.length) {
            throw new Error('geo and data must have the same length')
        }

        const scaleInstance = scale(data)

        return {
            type: 'opaque',
            value: { geo, data, scale: scaleInstance, ramp } satisfies CMap,
        }
    },
}
