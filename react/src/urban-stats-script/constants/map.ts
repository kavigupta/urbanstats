import { Basemap } from '../../mapper/settings/utils'
import { Context } from '../context'
import { noLocation } from '../lexer'
import { USSType, USSValue, expressionDefaultValue, rawDefaultValue, USSRawValue, OriginalFunctionArgs } from '../types-values'

import { basemapType } from './basemap'
import { Color } from './color'
import { RampT } from './ramp'
import { Scale, ScaleDescriptor } from './scale'

export interface Outline {
    color: Color
    weight: number
}

export interface CMap {
    geo: string[]
    data: number[]
    scale: ScaleDescriptor
    ramp: RampT
    label: string
    outline: Outline
    basemap: Basemap
}

export const cMapType = {
    type: 'opaque',
    name: 'cMap',
} satisfies USSType

export const outlineType = {
    type: 'opaque',
    name: 'outline',
} satisfies USSType

export const constructOutline = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            color: {
                type: { type: 'concrete', value: { type: 'opaque', name: 'color' } },
                defaultValue: rawDefaultValue({ type: 'opaque', value: { r: 0, g: 0, b: 0 } }),
            },
            weight: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: rawDefaultValue(0.5),
            },
        },
        returnType: { type: 'concrete', value: outlineType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, _originalArgs: OriginalFunctionArgs): USSRawValue => {
        const color = (namedArgs.color as { type: 'opaque', value: Color }).value
        const weight = namedArgs.weight as number
        return { type: 'opaque', value: { color, weight } }
    },
    documentation: { humanReadableName: 'Construct  Outline', isDefault: true },
} satisfies USSValue

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
                defaultValue: expressionDefaultValue({
                    type: 'identifier',
                    name: { node: 'geo', location: noLocation },
                }),
            },
            outline: {
                type: { type: 'concrete', value: outlineType },
                defaultValue: rawDefaultValue({ type: 'opaque', value: { color: { r: 0, g: 0, b: 0 }, weight: 0 } }),
            },
            basemap: {
                type: { type: 'concrete', value: basemapType },
                defaultValue: rawDefaultValue({ type: 'opaque', value: { type: 'osm', disableBasemap: false } }),
            },
        },
        returnType: { type: 'concrete', value: cMapType },
    },
    value: (ctx, posArgs, namedArgs, originalArgs) => {
        const geo = namedArgs.geo as string[]
        const data = namedArgs.data as number[]
        const scale = (namedArgs.scale as { type: 'opaque', value: Scale }).value
        const ramp = (namedArgs.ramp as { type: 'opaque', value: RampT }).value
        const labelPassedIn = namedArgs.label as string | null
        const outline = (namedArgs.outline as { type: 'opaque', value: Outline }).value
        const basemap = (namedArgs.basemap as { type: 'opaque', value: Basemap }).value

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
            value: { geo, data, scale: scaleInstance, ramp, label: label ?? '[Unlabeled Map]', outline, basemap } satisfies CMap,
        }
    },
    documentation: { humanReadableName: 'Choropleth Map', isDefault: true },
}
