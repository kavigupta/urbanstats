import { LineStyle } from '../../mapper/settings/utils'
import { Context } from '../context'
import { parseNoErrorAsExpression } from '../parser'
import { USSType, USSValue, createConstantExpression, USSRawValue, OriginalFunctionArgs } from '../types-values'

import { Color, toRgb, doRender } from './color-utils'
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
                defaultValue: createConstantExpression(false),
            },
            subnationalOutlines: {
                type: { type: 'concrete', value: outlineType },
                defaultValue: parseNoErrorAsExpression('constructOutline(color=colorBlack, weight=1)', ''),
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
        category: 'map',
        isDefault: true,
        namedArgs: {
            noLabels: 'Disable Basemap Labels',
            subnationalOutlines: 'Subnational Outlines',
        },
        longDescription: 'Creates an OpenStreetMap basemap with customizable label visibility and subnational boundary outlines. Provides geographic context for data visualization.',
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
} satisfies USSValue

export const noBasemap: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            backgroundColor: {
                type: { type: 'concrete', value: { type: 'opaque', name: 'color' } },
                defaultValue: parseNoErrorAsExpression('rgb(1, 1, 1, a=1)', ''),
            },
            textColor: {
                type: { type: 'concrete', value: { type: 'opaque', name: 'color' } },
                defaultValue: createConstantExpression(null),
            },

        },
        returnType: { type: 'concrete', value: basemapType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, _originalArgs: OriginalFunctionArgs): USSRawValue => {
        const backgroundColor = namedArgs.backgroundColor as { type: 'opaque', value: Color }
        const textColorProvided = namedArgs.textColor as { type: 'opaque', value: Color } | null
        const textColor = textColorProvided?.value ?? invert(backgroundColor.value)
        return { type: 'opaque', opaqueType: 'basemap', value: { type: 'none', backgroundColor: doRender(backgroundColor.value), textColor: doRender(textColor) } }
    },
    documentation: {
        humanReadableName: 'No Basemap',
        category: 'map',
        isDefault: true,
        longDescription: 'Creates a basemap with no background map, showing only the data visualization on a customizable background color (transparent by default).',
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
} satisfies USSValue

function invert(color: Color): Color {
    const { r, g, b } = toRgb(color)

    return {
        r: 1 - r,
        g: 1 - g,
        b: 1 - b,
        a: 1,
    }
}
