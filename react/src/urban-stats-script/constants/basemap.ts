import { LineStyle } from '../../mapper/settings'
import { Context } from '../context'
import { USSType, USSValue, rawDefaultValue, USSRawValue, OriginalFunctionArgs } from '../types-values'

import { doRender } from './color'
import { Outline } from './map'

export const outlineType = {
    type: 'opaque',
    name: 'outline',
} satisfies USSType

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
            subnationalOutlines: {
                type: { type: 'concrete', value: outlineType },
                defaultValue: rawDefaultValue({ type: 'opaque', opaqueType: 'outline', value: { color: { r: 0, g: 0, b: 0 }, weight: 1 } satisfies Outline }),
            },
        },
        returnType: { type: 'concrete', value: basemapType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, _originalArgs: OriginalFunctionArgs): USSRawValue => {
        const noLabels = namedArgs.noLabels as boolean
        const subnationalOutlines = namedArgs.subnationalOutlines as { type: 'opaque', opaqueType: 'outline', value: Outline }
        return {
            type: 'opaque', opaqueType: 'basemap', value: {
                type: 'osm', noLabels, subnationalOutlines: {
                    color: doRender(subnationalOutlines.value.color),
                    weight: subnationalOutlines.value.weight,
                } satisfies LineStyle,
            },
        }
    },
    documentation: {
        humanReadableName: 'OSM Basemap',
        isDefault: true,
        namedArgs: {
            noLabels: 'Disable Basemap Labels',
            subnationalOutlines: 'Subnational Outlines',
        },
    },
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
        return { type: 'opaque', opaqueType: 'basemap', value: { type: 'none' } }
    },
    documentation: { humanReadableName: 'No Basemap', isDefault: true },
} satisfies USSValue
