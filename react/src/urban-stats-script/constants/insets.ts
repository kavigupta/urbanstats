import { round } from 'mathjs'

import insets from '../../data/insets'
import { UrbanStatsASTExpression } from '../ast'
import { Context } from '../context'
import { parseNoErrorAsExpression } from '../parser'
import { USSRawValue, USSType, USSValue } from '../types-values'

export interface Inset {
    bottomLeft: [number, number]
    topRight: [number, number]
    coordBox: [number, number, number, number]
    mainMap: boolean
    name?: string
}

export const insetType = {
    type: 'opaque',
    name: 'inset',
} satisfies USSType

export const insetsType = {
    type: 'opaque',
    name: 'insets',
} satisfies USSType

export const boundsType = {
    type: 'object',
    properties: new Map([
        ['west', { type: 'number' }],
        ['east', { type: 'number' }],
        ['north', { type: 'number' }],
        ['south', { type: 'number' }],
    ]),
} satisfies USSType

export function constructInset(
    screenBounds: { west: number, east: number, north: number, south: number },
    mapBounds: { west: number, east: number, north: number, south: number },
    mainMap: boolean,
    name?: string,
): USSRawValue {
    return {
        type: 'opaque',
        opaqueType: 'inset',
        value: {
            bottomLeft: [screenBounds.west, screenBounds.south],
            topRight: [screenBounds.east, screenBounds.north],
            coordBox: [mapBounds.west, mapBounds.south, mapBounds.east, mapBounds.north],
            mainMap,
            name,
        } satisfies Inset & { name?: string },
    }
}

export function constructInsets(insetList: Inset[]): USSRawValue {
    return {
        type: 'opaque',
        opaqueType: 'insets',
        value: insetList,
    }
}

export const constructInsetValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            screenBounds: { type: { type: 'concrete', value: boundsType } },
            mapBounds: { type: { type: 'concrete', value: boundsType } },
            mainMap: { type: { type: 'concrete', value: { type: 'boolean' } } },
            name: { type: { type: 'concrete', value: { type: 'string' } } },
        },
        returnType: { type: 'concrete', value: insetType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const screenBoundsObj = namedArgs.screenBounds as Map<string, USSRawValue>
        const mapBoundsObj = namedArgs.mapBounds as Map<string, USSRawValue>
        const mainMap = namedArgs.mainMap as boolean
        const name = namedArgs.name as string
        return constructInset(
            {
                west: screenBoundsObj.get('west') as number,
                east: screenBoundsObj.get('east') as number,
                north: screenBoundsObj.get('north') as number,
                south: screenBoundsObj.get('south') as number,
            },
            {
                west: mapBoundsObj.get('west') as number,
                east: mapBoundsObj.get('east') as number,
                north: mapBoundsObj.get('north') as number,
                south: mapBoundsObj.get('south') as number,
            },
            mainMap,
            name,
        )
    },
    documentation: {
        humanReadableName: 'Custom Inset',
        category: 'inset',
        longDescription: 'Creates a custom map inset with specified screen bounds (bounding box of the inset on the screen, where bottom left corner has (0, 0) and top right corner has (1, 1)), map bounds (bounding box of the inset on the map, in longitude and latitude), and whether it is the main map (the interactive map).',
        selectorRendering: { kind: 'subtitleLongDescription' },
        customConstructor: true,
    },
} satisfies USSValue

export const constructInsetsValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [
            {
                type: 'concrete',
                value: {
                    type: 'vector',
                    elementType: insetType,
                },
            },
        ],
        namedArgs: {},
        returnType: { type: 'concrete', value: insetsType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const insetsList = posArgs[0] as { type: 'opaque', opaqueType: 'inset', value: Inset }[]
        return constructInsets(insetsList.map(item => item.value))
    },
    documentation: {
        humanReadableName: 'Custom Insets',
        category: 'inset',
        isDefault: true,
        longDescription: 'Creates a collection of map insets.',
        customConstructor: true,
    },
} satisfies USSValue

function computeInsetConstantName(name: string): string {
    name = name.replace(/[\s,().-]/g, '')
    name = name.replaceAll('+', 'Plus')
    name = `inset${name}`
    return name
}

export function deconstruct(inset: typeof insets[keyof typeof insets][number] | Inset): UrbanStatsASTExpression {
    const uss = `constructInset(screenBounds={ north: ${round(inset.topRight[1], 3)}, east: ${round(inset.topRight[0], 3)}, south: ${round(inset.bottomLeft[1], 3)}, west: ${round(inset.bottomLeft[0], 3)} }, mapBounds={ north: ${round(inset.coordBox[3], 3)}, east: ${round(inset.coordBox[2], 3)}, south: ${round(inset.coordBox[1], 3)}, west: ${round(inset.coordBox[0], 3)} }, mainMap=${inset.mainMap}, name="${inset.name}")`
    return parseNoErrorAsExpression(uss, '')
}

export const insetConsts: [string, USSValue][] = Object.entries(insets).flatMap(([, regionInsets]) =>
    regionInsets.map((inset) => {
        const insetName = inset.name
        const constantName = computeInsetConstantName(insetName)

        return [
            constantName,
            {
                type: insetType,
                value: {
                    type: 'opaque',
                    opaqueType: 'inset',
                    value: {
                        bottomLeft: [...inset.bottomLeft] as [number, number],
                        topRight: [...inset.topRight] as [number, number],
                        // copy to get rid of readonly
                        coordBox: [...inset.coordBox] as [number, number, number, number],
                        mainMap: inset.mainMap,
                        name: inset.name,
                    } satisfies Inset,
                },
                documentation: {
                    humanReadableName: insetName,
                    category: 'inset',
                    equivalentExpressions: [deconstruct(inset)],
                    longDescription: `Predefined map inset for the region "${insetName}".`,
                    documentationTable: 'predefined-insets',
                },
            } satisfies USSValue,
        ] as [string, USSValue]
    }),
)

export const insetNameToConstantName = new Map<string, string>(
    Object.entries(insets).flatMap(([, regionInsets]) =>
        regionInsets.map((inset) => {
            const insetName = inset.name
            return [insetName, computeInsetConstantName(insetName)]
        }),
    ),
)
