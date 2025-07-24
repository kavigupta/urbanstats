import { Inset } from '../../components/map'
import insets from '../../data/insets'
import { Context } from '../context'
import { USSRawValue, USSType, USSValue } from '../types-values'

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
    if (!insetList.some(inset => inset.mainMap)) {
        throw new Error('At least one inset must have mainMap=true')
    }
    return {
        type: 'opaque',
        value: insetList,
    }
}

export const constructInsetValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [
            {
                type: 'concrete',
                value: {
                    type: 'object',
                    properties: new Map<string, USSType>([
                        ['screenBounds', boundsType],
                        ['mapBounds', boundsType],
                        ['mainMap', { type: 'boolean' }],
                        ['name', { type: 'string' }],
                    ]),
                },
            },
        ],
        namedArgs: {},
        returnType: { type: 'concrete', value: insetType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const insetObj = posArgs[0] as Map<string, USSRawValue>
        const screenBoundsObj = insetObj.get('screenBounds') as Map<string, USSRawValue>
        const mapBoundsObj = insetObj.get('mapBounds') as Map<string, USSRawValue>
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
            insetObj.get('mainMap') as boolean,
            insetObj.get('name') as string,
        )
    },
    documentation: { humanReadableName: 'Custom Inset' },
}

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
        const insetsList = posArgs[0] as { type: 'opaque', value: Inset }[]
        return constructInsets(insetsList.map(item => item.value))
    },
    documentation: { humanReadableName: 'Custom Insets' },
}

export const insetConsts: [string, USSValue][] = Object.entries(insets).flatMap(([, regionInsets]) =>
    regionInsets.map((inset) => {
        const insetName = inset.name
        const cleanName = insetName.replace(/[\s,().-]/g, '')
        const constantName = `inset${cleanName}`

        return [
            constantName,
            {
                type: insetType,
                value: { type: 'opaque', value: {
                    bottomLeft: [...inset.bottomLeft] as [number, number],
                    topRight: [...inset.topRight] as [number, number],
                    // copy to get rid of readonly
                    coordBox: [...inset.coordBox] as [number, number, number, number],
                    mainMap: inset.mainMap,
                } satisfies Inset } satisfies USSRawValue,
                documentation: { humanReadableName: insetName },
            },
        ] as [string, USSValue]
    }),
)
