import convert from 'color-convert'

import { Insets } from '../../components/map'
import { Basemap } from '../../mapper/settings/utils'
import { assert } from '../../utils/defensive'
import { UnitType } from '../../utils/unit'
import { Context } from '../context'
import { noLocation } from '../location'
import { parseNoErrorAsExpression } from '../parser'
import { USSType, USSValue, createConstantExpression, USSRawValue, OriginalFunctionArgs, NamedFunctionArgumentWithDocumentation } from '../types-values'

import { basemapType, outlineType } from './basemap'
import { rgbColorExpression } from './color'
import { Color } from './color-utils'
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

export interface CMapRGB {
    geo: string[]
    dataR: number[]
    dataG: number[]
    dataB: number[]
    label: string
    basemap: Basemap
    insets: Insets
    unit?: UnitType
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

export const cMapRGBType = {
    type: 'opaque',
    name: 'cMapRGB',
} satisfies USSType

export type ColorSpace = 'sRGB' | 'OKRGB'

export const colorSpaceType = {
    type: 'opaque',
    name: 'colorSpace',
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
        category: 'map',
        isDefault: true,
        namedArgs: {
            color: 'Border Color',
            weight: 'Border Width',
        },
        longDescription: 'Creates an outline specification for map features with customizable color and weight (border width).',
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
        unit: {
            type: { type: 'concrete', value: { type: 'opaque', name: 'Unit' } },
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
            defaultValue: { type: 'call', fn: { type: 'identifier', name: { node: 'osmBasemap', location: noLocation } }, args: [], entireLoc: noLocation },
        },
        insets: {
            type: { type: 'concrete', value: insetsType },
            defaultValue: {
                type: 'identifier',
                name: { node: 'defaultInsets', location: noLocation },
            },
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
        category: 'map',
        isDefault: true,
        namedArgs: {
            ...namedArgDocumentation,
            outline: 'Outline',
        },
        longDescription: 'Creates a choropleth map that displays data using color-coded geographic regions. Each region is colored according to its data value using the specified scale and color ramp.',
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
} satisfies USSValue

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
        category: 'map',
        isDefault: true,
        namedArgs: {
            ...namedArgDocumentation,
            maxRadius: 'Max Radius',
            relativeArea: 'Relative Area',
        },
        longDescription: 'Creates a point map that displays data using circles at geographic locations. This is like a choropleth map, but instead of coloring regions, it colors points centered on the geographic locations. The relativeArea parameter can be used to specify the area of the points, which is used to determine the radius of the points. If not specified, the areas are all equal.',
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
} satisfies USSValue

export const cMapRGB: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            dataR: { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } } },
            dataG: { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } } },
            dataB: { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } } },
            label: {
                type: { type: 'concrete', value: { type: 'string' } },
            },
            unit: {
                type: { type: 'concrete', value: { type: 'opaque', name: 'Unit' } },
                defaultValue: createConstantExpression(null),
            },
            geo: {
                type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'opaque', name: 'geoFeatureHandle' } } },
                defaultValue: {
                    type: 'identifier',
                    name: { node: 'geo', location: noLocation },
                },
                documentation: {
                    hide: true,
                },
            },
            outline: {
                type: { type: 'concrete', value: outlineType },
                defaultValue: parseNoErrorAsExpression('constructOutline(color=colorBlack, weight=0)', ''),
            },
            colorSpace: {
                type: { type: 'concrete', value: colorSpaceType },
                defaultValue: { type: 'identifier', name: { node: 'sRGB', location: noLocation } },
            },
            hueRotation: {
                type: { type: 'concrete', value: { type: 'number' } },
                defaultValue: parseNoErrorAsExpression('0', ''),
            },
            basemap: {
                type: { type: 'concrete', value: basemapType },
                defaultValue: { type: 'call', fn: { type: 'identifier', name: { node: 'osmBasemap', location: noLocation } }, args: [], entireLoc: noLocation },
            },
            insets: {
                type: { type: 'concrete', value: insetsType },
                defaultValue: {
                    type: 'identifier',
                    name: { node: 'defaultInsets', location: noLocation },
                },
            },
        },
        returnType: { type: 'concrete', value: cMapRGBType },
    },
    value: (ctx, posArgs, namedArgs) => {
        const clipValues = (values: number[]): number[] => values.map(v => Math.max(0, Math.min(1, v)))

        const colorSpace = (namedArgs.colorSpace as { type: 'opaque', opaqueType: 'colorSpace', value: ColorSpace }).value
        const hueRotation = namedArgs.hueRotation as number

        const [dataR, dataG, dataB] = reproject(
            clipValues(namedArgs.dataR as number[]),
            clipValues(namedArgs.dataG as number[]),
            clipValues(namedArgs.dataB as number[]),
            colorSpace,
            hueRotation,
        )

        const outline = (namedArgs.outline as { type: 'opaque', opaqueType: 'outline', value: Outline }).value

        const geoRaw = namedArgs.geo as USSRawValue[]
        const geo: string[] = geoRaw.map((g) => {
            const geoHandle = g as { type: 'opaque', opaqueType: string, value: string }
            assert(geoHandle.opaqueType === 'geoFeatureHandle', 'Expected geoFeatureHandle opaque value')
            return geoHandle.value
        })
        const label = namedArgs.label as string
        const basemap = (namedArgs.basemap as { type: 'opaque', opaqueType: 'basemap', value: Basemap }).value
        const insets = (namedArgs.insets as { type: 'opaque', opaqueType: 'insets', value: Insets }).value
        const unitArg = namedArgs.unit as { type: 'opaque', opaqueType: 'unit', value: { unit: string } } | null
        const unit = unitArg ? (unitArg.value.unit as UnitType) : undefined

        if (geo.length !== dataR.length || geo.length !== dataG.length || geo.length !== dataB.length) {
            throw new Error(`geo, dataR, dataG, and dataB must have the same length: ${geo.length}, ${dataR.length}, ${dataG.length}, ${dataB.length}`)
        }
        return {
            type: 'opaque',
            opaqueType: 'cMapRGB',
            value: { geo, dataR, dataG, dataB, label, basemap, insets, unit, outline } satisfies CMapRGB,
        }
    },
    documentation: {
        humanReadableName: 'RGB Choropleth Map',
        category: 'map',
        isDefault: true,
        namedArgs: {
            dataR: 'Red Data (0-1)',
            dataG: 'Green Data (0-1)',
            dataB: 'Blue Data (0-1)',
            label: 'Label',
            geo: 'Geography',
            outline: 'Outline',
            colorSpace: 'Color Space',
            hueRotation: 'Hue Rotation (degrees)',
            basemap: 'Basemap',
            insets: 'Insets',
            unit: 'Unit',
        },
        longDescription: 'Creates a choropleth map that displays data using RGB color values. Each region is colored according to its red, green, and blue data values, allowing for more complex color representations than traditional single-value choropleth maps. The colorSpace parameter allows you to choose between sRGB and OKRGB color spaces (use the sRGB or OKRGB constants), and hueRotation allows you to rotate the hue of all colors by a specified number of degrees.',
        selectorRendering: { kind: 'subtitleLongDescription' },
    },
} satisfies USSValue

function projectBackOKLCH(h: number, s: number, l: number): [number, number, number] {
    const oklchToRGB: (l2: number, a2: number, b2: number) => [number, number, number] = (convert as unknown as { oklch: { rgb: (l2: number, a2: number, b2: number) => [number, number, number] } }).oklch.rgb
    return oklchToRGB(l, s * 0.32, (h + 30) % 360)
}

function projectBackSRGB(h: number, s: number, l: number): [number, number, number] {
    return convert.hsl.rgb(h, s, l)
}

const projections = {
    sRGB: projectBackSRGB,
    OKRGB: projectBackOKLCH,
}

function reprojectSingleChannel(r: number, g: number, b: number, projectionType: ColorSpace, hueOffset: number): [number, number, number] {
    const [h, s, l] = convert.rgb.hsl(r * 255, g * 255, b * 255)
    const [r2, g2, b2] = projections[projectionType]((h + hueOffset) % 360, s, l)
    return [r2 / 255, g2 / 255, b2 / 255]
}

function reproject(dataR: number[], dataG: number[], dataB: number[], projectionType: ColorSpace, hueOffset: number): [number[], number[], number[]] {
    const elements = dataR.map((r, i) => reprojectSingleChannel(r, dataG[i], dataB[i], projectionType, hueOffset))
    return [elements.map(element => element[0]), elements.map(element => element[1]), elements.map(element => element[2])]
}
