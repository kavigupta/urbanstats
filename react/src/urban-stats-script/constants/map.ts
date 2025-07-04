import { noLocation } from '../lexer'
import { USSType, USSValue, rawDefaultValue } from '../types-values'

import { RampT } from './ramp'
import { Scale, ScaleDescriptor } from './scale'

export interface CMap {
    geo: string[]
    data: number[]
    scale: ScaleDescriptor
    ramp: RampT
    label: string
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
            data: { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } } },
            scale: { type: { type: 'concrete', value: { type: 'opaque', name: 'scale' } } },
            ramp: { type: { type: 'concrete', value: { type: 'opaque', name: 'ramp' } } },
            label: {
                type: { type: 'concrete', value: { type: 'string' } },
                defaultValue: rawDefaultValue(null),
            },
            geo: {
                type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'string' } } },
                defaultValue: { type: 'expression', expr: {
                    type: 'identifier',
                    name: { node: 'geo', location: noLocation },
                } },
            },
        },
        returnType: { type: 'concrete', value: cMapType },
    },
    value: (ctx, posArgs, namedArgs, originalArgs) => {
        console.log('named arguments', namedArgs)
        const geo = namedArgs.geo as string[]
        const data = namedArgs.data as number[]
        const scale = (namedArgs.scale as { type: 'opaque', value: Scale }).value
        const ramp = (namedArgs.ramp as { type: 'opaque', value: RampT }).value
        const labelPassedIn = namedArgs.label as string | null

        if (geo.length !== data.length) {
            throw new Error(`geo and data must have the same length: ${geo.length} and ${data.length}`)
        }

        const scaleInstance = scale(data)

        const label = labelPassedIn ?? originalArgs.namedArgs.data.documentation?.humanReadableName

        if (label === undefined) {
            ctx.effect({ type: 'warning', message: 'Label could not be derived for choropleth map, please pass label="<your label here>" to cMap(...)' })
        }

        return {
            type: 'opaque',
            value: { geo, data, scale: scaleInstance, ramp, label: label ?? '[Unlabeled Map]' } satisfies CMap,
        }
    },
    documentation: { humanReadableName: 'Choropleth Map' },
}
