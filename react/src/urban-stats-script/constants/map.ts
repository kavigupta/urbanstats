import { Insets } from '../../components/map'
import { Basemap } from '../../mapper/settings/utils'
import { assert } from '../../utils/defensive'
import { UnitType } from '../../utils/unit'
import { Context } from '../context'
import { noLocation } from '../lexer'
import { parseNoErrorAsExpression } from '../parser'
import { USSType, USSValue, createConstantExpression, USSRawValue, OriginalFunctionArgs, NamedFunctionArgumentWithDocumentation } from '../types-values'

import { basemapType, outlineType } from './basemap'
import { Color, rgbColorExpression } from './color'
import { insetsType } from './insets'
import { RampT } from './ramp'
import { Scale, ScaleDescriptor } from './scale'

export interface Outline {
    color: Color
    weight: number
}

interface CommonMap {
    geo: string[]
    data: number[]
    scale: ScaleDescriptor
    ramp: RampT
    label: string
    basemap: Basemap
    insets: Insets
    unit?: UnitType
}

export interface CMap extends CommonMap {
    outline: Outline
}

export interface PMap extends CommonMap {
    maxRadius: number
    relativeArea: number[]
}

export const cMapType = {
    type: 'opaque',
    name: 'cMap',
} satisfies USSType

export const pMapType = {
    type: 'opaque',
    name: 'pMap',
} satisfies USSType

export const constructOutline = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            color: {
                type: { type: 'concrete', value: { type: 'opaque', name: 'color' } },
                defaultValue: parseNoErrorAsExpression(rgbColorExpression({ r: 0, g: 0, b: 0, a: 255 }), ''),
            },
            weight: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: parseNoErrorAsExpression('0.5', ''),
            },
        },
        returnType: { type: 'concrete', value: outlineType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, _originalArgs: OriginalFunctionArgs): USSRawValue => {
        const color = (namedArgs.color as { type: 'opaque', opaqueType: 'color', value: Color }).value
        const weight = namedArgs.weight as number
        return { type: 'opaque', opaqueType: 'outline', value: { color, weight } }
    },
    documentation: {
        humanReadableName: 'Outline',
        isDefault: true,
        namedArgs: {
            color: 'Border Color',
            weight: 'Border Width',
        },
    },
} satisfies USSValue

function mapConstructorArguments(
    isPmap: boolean,
    intermediateArgs: Record<string, NamedFunctionArgumentWithDocumentation>,
): Record<string, NamedFunctionArgumentWithDocumentation> {
    return {
        data: { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } } },
        scale: { type: { type: 'concrete', value: { type: 'opaque', name: 'scale' } } },
        ramp: { type: { type: 'concrete', value: { type: 'opaque', name: 'ramp' } } },
        label: {
            type: { type: 'concrete', value: { type: 'string' } },
            defaultValue: createConstantExpression(null),
        },
        geo: {
            type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'opaque', name: isPmap ? 'geoCentroidHandle' : 'geoFeatureHandle' } } },
            defaultValue: {
                type: 'identifier',
                name: { node: isPmap ? 'geoCentroid' : 'geo', location: noLocation },
            },
            documentation: {
                hide: true,
            },
        },
        ...intermediateArgs,
        basemap: {
            type: { type: 'concrete', value: basemapType },
            defaultValue: { type: 'function', fn: { type: 'identifier', name: { node: 'osmBasemap', location: noLocation } }, args: [], entireLoc: noLocation },
        },
        insets: {
            type: { type: 'concrete', value: insetsType },
            defaultValue: {
                type: 'identifier',
                name: { node: 'defaultInsets', location: noLocation },
            },
        },
        unit: {
            type: { type: 'concrete', value: { type: 'opaque', name: 'Unit' } },
            defaultValue: createConstantExpression(null),
        },
    } satisfies Record<string, NamedFunctionArgumentWithDocumentation>
}

function computeCommonMap(
    isPmap: boolean,
    namedArgs: Record<string, USSRawValue>,
    originalArgs: OriginalFunctionArgs,
    ctx: Context,
): CommonMap {
    const geoRaw = namedArgs.geo as USSRawValue[]
    const geo: string[] = geoRaw.map((g) => {
        const geoHandle = g as { type: 'opaque', opaqueType: string, value: string }
        assert(geoHandle.opaqueType === (isPmap ? 'geoCentroidHandle' : 'geoFeatureHandle'), `Expected ${isPmap ? 'geoCentroidHandle' : 'geoFeatureHandle'} opaque value`)
        return geoHandle.value
    })
    const data = namedArgs.data as number[]
    const scale = (namedArgs.scale as { type: 'opaque', opaqueType: 'scale', value: Scale }).value
    const ramp = (namedArgs.ramp as { type: 'opaque', opaqueType: 'ramp', value: RampT }).value
    const labelPassedIn = namedArgs.label as string | null
    const basemap = (namedArgs.basemap as { type: 'opaque', opaqueType: 'basemap', value: Basemap }).value
    const insets = (namedArgs.insets as { type: 'opaque', opaqueType: 'insets', value: Insets }).value
    const unitArg = namedArgs.unit as { type: 'opaque', opaqueType: 'unit', value: { unit: string } } | null
    const unit = unitArg ? (unitArg.value.unit as UnitType) : undefined

    if (geo.length !== data.length) {
        throw new Error(`geo and data must have the same length: ${geo.length} and ${data.length}`)
    }

    const scaleInstance = scale(data)

    const label = labelPassedIn ?? originalArgs.namedArgs.data.documentation?.humanReadableName

    if (label === undefined) {
        ctx.effect({
            type: 'warning',
            message: `Label could not be derived for map, please pass label="<your label here>" to ${isPmap ? 'pMap' : 'cMap'}(...)`,
            location: noLocation,
        })
    }

    return { geo, data, scale: scaleInstance, ramp, label: label ?? '[Unlabeled Map]', basemap, insets, unit }
}

const namedArgDocumentation = {
    data: 'Data',
    scale: 'Scale',
    ramp: 'Ramp',
    label: 'Label',
    geo: 'Geography',
    basemap: 'Basemap',
    insets: 'Insets',
    unit: 'Unit',
}

export const cMap: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: mapConstructorArguments(false, {
            outline: {
                type: { type: 'concrete', value: outlineType },
                defaultValue: parseNoErrorAsExpression('constructOutline(color=colorBlack, weight=0)', ''),
            },
        }),
        returnType: { type: 'concrete', value: cMapType },
    },
    value: (ctx, posArgs, namedArgs, originalArgs) => {
        const outline = (namedArgs.outline as { type: 'opaque', opaqueType: 'outline', value: Outline }).value
        const commonMap = computeCommonMap(false, namedArgs, originalArgs, ctx)
        return {
            type: 'opaque',
            opaqueType: 'cMap',
            value: { ...commonMap, outline } satisfies CMap,
        }
    },
    documentation: {
        humanReadableName: 'Choropleth Map',
        isDefault: true,
        namedArgs: {
            ...namedArgDocumentation,
            outline: 'Outline',
        },
    },
}

export const pMap: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: mapConstructorArguments(true, {
            maxRadius: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: parseNoErrorAsExpression('10', ''),
            },
            relativeArea: {
                type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } },
                defaultValue: createConstantExpression(null),
            },
        }),
        returnType: { type: 'concrete', value: pMapType },
    },
    value: (ctx, posArgs, namedArgs, originalArgs) => {
        const maxRadius = namedArgs.maxRadius as number
        const relativeArea = namedArgs.relativeArea as number[] | null

        const commonMap = computeCommonMap(true, namedArgs, originalArgs, ctx)

        const amount = commonMap.data.length

        // Handle relativeArea: fill with 1s if not present, normalize to max 1
        let normalizedRelativeArea: number[]
        if (relativeArea === null) {
            // If relativeArea is null, fill with 1s
            normalizedRelativeArea = Array.from({ length: amount }, () => 1)
        }
        else if (relativeArea.length !== amount) {
            throw new Error(`relativeArea must have the same length as geo: ${relativeArea.length} and ${amount}`)
        }
        else {
            // Replace negative values with 0
            const sanitizedRelativeArea = relativeArea.map(area => Math.max(0, area))
            // Normalize relativeArea so max value is 1
            const maxRelativeArea = Math.max(...sanitizedRelativeArea)
            if (maxRelativeArea > 0) {
                normalizedRelativeArea = sanitizedRelativeArea.map((area: number) => area / maxRelativeArea)
            }
            else {
                normalizedRelativeArea = Array.from({ length: amount }, () => 1)
            }
        }

        return {
            type: 'opaque',
            opaqueType: 'pMap',
            value: { ...commonMap, maxRadius, relativeArea: normalizedRelativeArea } satisfies PMap,
        }
    },
    documentation: {
        humanReadableName: 'Point Map',
        isDefault: true,
        namedArgs: {
            ...namedArgDocumentation,
            maxRadius: 'Max Radius',
            relativeArea: 'Relative Area',
        },
    },
}
