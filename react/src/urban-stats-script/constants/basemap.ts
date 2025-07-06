import { Context } from '../context'
import { USSType, USSValue, rawDefaultValue, USSRawValue, OriginalFunctionArgs } from '../types-values'

export const basemapType = {
    type: 'opaque',
    name: 'basemap',
} satisfies USSType

export const osmBasemap: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            noLabels: {
                type: { type: 'concrete', value: { type: 'boolean' } },
                defaultValue: rawDefaultValue(false),
            },
        },
        returnType: { type: 'concrete', value: basemapType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, _originalArgs: OriginalFunctionArgs): USSRawValue => {
        const noLabels = namedArgs.noLabels as boolean
        return { type: 'opaque', value: { type: 'osm', noLabels } }
    },
    documentation: { humanReadableName: 'OSM Basemap', isDefault: true },
} satisfies USSValue

export const noBasemap: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {},
        returnType: { type: 'concrete', value: basemapType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, _originalArgs: OriginalFunctionArgs): USSRawValue => {
        return { type: 'opaque', value: { type: 'none' } }
    },
    documentation: { humanReadableName: 'No Basemap', isDefault: true },
} satisfies USSValue
