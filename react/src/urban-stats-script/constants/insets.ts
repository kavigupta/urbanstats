import { round } from 'mathjs'

import insets from '../../data/insets'
import { assert } from '../../utils/defensive'
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

export type SplitDirection = 'horizontal' | 'vertical'

export interface SplitCell {
    insets: InsetNode[]
    proportion: number
}

export interface SplitInset {
    bottomLeft: [number, number]
    topRight: [number, number]
    direction: SplitDirection
    children: SplitCell[]
}

// Screen bounds of the insets in a split's cell are relative to the cell
export type InsetNode = Inset | SplitInset

export function isSplit(node: InsetNode): node is SplitInset {
    return 'children' in node
}

// [west, south, east, north] in screen space
export type Frame = [number, number, number, number]

function within(outer: Frame, bottomLeft: [number, number], topRight: [number, number]): Frame {
    const width = outer[2] - outer[0]
    const height = outer[3] - outer[1]
    return [outer[0] + bottomLeft[0] * width, outer[1] + bottomLeft[1] * height, outer[0] + topRight[0] * width, outer[1] + topRight[1] * height]
}

export function relativeTo(outer: Frame, frame: Frame): Frame {
    const width = outer[2] - outer[0]
    const height = outer[3] - outer[1]
    return [(frame[0] - outer[0]) / width, (frame[1] - outer[1]) / height, (frame[2] - outer[0]) / width, (frame[3] - outer[1]) / height]
}

function splitCells(frame: Frame, split: SplitInset): Frame[] {
    const total = split.children.reduce((sum, { proportion }) => sum + proportion, 0)
    let start = 0
    return split.children.map(({ proportion }) => {
        const end = start + proportion / total
        const cell: Frame = split.direction === 'horizontal'
            ? [frame[0] + start * (frame[2] - frame[0]), frame[1], frame[0] + end * (frame[2] - frame[0]), frame[3]]
            : [frame[0], frame[3] - end * (frame[3] - frame[1]), frame[2], frame[3] - start * (frame[3] - frame[1])]
        start = end
        return cell
    })
}

export interface SharedEdges { left: boolean, right: boolean, top: boolean, bottom: boolean }

/*
 * A path alternates between an index into a list of insets and the index of a cell in the split found there,
 * so a path to an inset has odd length and a path to a list (`listPath`) has even length.
 * `cell` is the frame of the containing list, which is the whole canvas at the top level.
 */
export type LaidOutInset = Inset & { path: number[], sharedEdges: SharedEdges, cell: Frame }
export interface LaidOutSplit { path: number[], split: SplitInset, frame: Frame, cells: Frame[], cell: Frame }

export function layoutInsets(nodes: InsetNode[]): { leaves: LaidOutInset[], splits: LaidOutSplit[] } {
    const leaves: LaidOutInset[] = []
    const splits: LaidOutSplit[] = []
    const visitList = (list: InsetNode[], listPath: number[], cell: Frame, shared: SharedEdges): void => {
        list.forEach((node, i) => {
            const path = [...listPath, i]
            const frame = within(cell, node.bottomLeft, node.topRight)
            const nodeShared = {
                left: shared.left && node.bottomLeft[0] === 0,
                bottom: shared.bottom && node.bottomLeft[1] === 0,
                right: shared.right && node.topRight[0] === 1,
                top: shared.top && node.topRight[1] === 1,
            }
            if (!isSplit(node)) {
                leaves.push({ ...node, bottomLeft: [frame[0], frame[1]], topRight: [frame[2], frame[3]], path, sharedEdges: nodeShared, cell })
                return
            }
            const cells = splitCells(frame, node)
            splits.push({ path, split: node, frame, cells, cell })
            node.children.forEach(({ insets: cellInsets }, j) => {
                const first = j === 0
                const last = j === node.children.length - 1
                visitList(cellInsets, [...path, j], cells[j], node.direction === 'horizontal'
                    ? { ...nodeShared, left: nodeShared.left || !first, right: nodeShared.right || !last }
                    : { ...nodeShared, top: nodeShared.top || !first, bottom: nodeShared.bottom || !last })
            })
        })
    }
    visitList(nodes, [], [0, 0, 1, 1], { left: false, right: false, top: false, bottom: false })
    return { leaves, splits }
}

/** Replaces a split left with one cell with that cell's contents */
function collapseSplit(split: SplitInset): InsetNode[] {
    if (split.children.length === 0) {
        return []
    }
    if (split.children.length === 1) {
        const frame: Frame = [...split.bottomLeft, ...split.topRight]
        return split.children[0].insets.map((node) => {
            const moved = within(frame, node.bottomLeft, node.topRight)
            return { ...node, bottomLeft: [moved[0], moved[1]], topRight: [moved[2], moved[3]] }
        })
    }
    return [split]
}

/** Replaces the list at `listPath` with `f` of it */
export function mapList(list: InsetNode[], listPath: number[], f: (list: InsetNode[]) => InsetNode[]): InsetNode[] {
    if (listPath.length === 0) {
        return f(list)
    }
    const [i, c, ...rest] = listPath
    const split = list[i]
    assert(isSplit(split), 'Path descends into a leaf inset')
    const edited = mapList(split.children[c].insets, rest, f)
    const children = edited.length === 0
        ? split.children.filter((_, k) => k !== c)
        : split.children.map((cell, k) => k === c ? { ...cell, insets: edited } : cell)
    return [...list.slice(0, i), ...collapseSplit({ ...split, children }), ...list.slice(i + 1)]
}

export function mapNode(list: InsetNode[], path: number[], f: (node: InsetNode) => InsetNode[]): InsetNode[] {
    const i = path[path.length - 1]
    return mapList(list, path.slice(0, -1), l => [...l.slice(0, i), ...f(l[i]), ...l.slice(i + 1)])
}

export function listAt(list: InsetNode[], listPath: number[]): InsetNode[] {
    if (listPath.length === 0) {
        return list
    }
    const [i, c, ...rest] = listPath
    const split = list[i]
    assert(isSplit(split), 'Path descends into a leaf inset')
    return listAt(split.children[c].insets, rest)
}

/** Removes leaves, dropping cells this empties and collapsing splits left with one cell */
export function pruneInsets(nodes: InsetNode[], keep: (leaf: Inset) => boolean): InsetNode[] {
    return nodes.flatMap((node) => {
        if (!isSplit(node)) {
            return keep(node) ? [node] : []
        }
        const children = node.children
            .map(cell => ({ ...cell, insets: pruneInsets(cell.insets, keep) }))
            .filter((cell, k) => cell.insets.length > 0 || node.children[k].insets.length === 0)
        return collapseSplit({ ...node, children })
    })
}

const insetType = {
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

function constructInset(
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

function constructInsets(insetList: InsetNode[]): USSRawValue {
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
        const insetsList = posArgs[0] as { type: 'opaque', opaqueType: 'inset', value: InsetNode }[]
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

const splitDirectionType = {
    type: 'opaque',
    name: 'splitDirection',
} satisfies USSType

export const splitDirectionIdentifierToValue = {
    splitHorizontal: 'horizontal',
    splitVertical: 'vertical',
} as const

const splitDirectionValueToIdentifier = {
    horizontal: 'splitHorizontal',
    vertical: 'splitVertical',
} as const

export const splitDirectionConsts: [string, USSValue][] = Object.entries(splitDirectionIdentifierToValue).map(([identifier, direction]) => [identifier, {
    type: splitDirectionType,
    value: { type: 'opaque', opaqueType: 'splitDirection', value: direction },
    documentation: {
        humanReadableName: direction === 'horizontal' ? 'Split Horizontally' : 'Split Vertically',
        category: 'inset',
        longDescription: direction === 'horizontal'
            ? 'Lays out the insets of a split side by side, from left to right.'
            : 'Lays out the insets of a split one above another, from top to bottom.',
        selectorRendering: { kind: 'subtitleLongDescription' },
        isDefault: direction === 'horizontal',
    },
} satisfies USSValue])

export const constructSplitInsetValue: USSValue = {
    type: {
        type: 'function',
        posArgs: [
            {
                type: 'concrete',
                value: {
                    type: 'vector',
                    elementType: {
                        type: 'object',
                        properties: new Map<string, USSType>([
                            ['insets', { type: 'vector', elementType: insetType }],
                            ['proportion', { type: 'number' }],
                        ]),
                    },
                },
            },
        ],
        namedArgs: {
            direction: { type: { type: 'concrete', value: splitDirectionType } },
            screenBounds: { type: { type: 'concrete', value: boundsType } },
        },
        returnType: { type: 'concrete', value: insetType },
    },
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
        const children = (posArgs[0] as Map<string, USSRawValue>[]).map(child => ({
            insets: (child.get('insets') as { type: 'opaque', opaqueType: 'inset', value: InsetNode }[]).map(({ value }) => value),
            proportion: child.get('proportion') as number,
        }))
        if (children.length === 0) {
            throw new Error('constructSplitInset requires at least one cell')
        }
        if (children.some(({ proportion }) => !(proportion > 0))) {
            throw new Error('constructSplitInset proportions must be positive')
        }
        const screenBounds = namedArgs.screenBounds as Map<string, number>
        return {
            type: 'opaque',
            opaqueType: 'inset',
            value: {
                bottomLeft: [screenBounds.get('west')!, screenBounds.get('south')!],
                topRight: [screenBounds.get('east')!, screenBounds.get('north')!],
                direction: (namedArgs.direction as { type: 'opaque', opaqueType: 'splitDirection', value: SplitDirection }).value,
                children,
            } satisfies SplitInset,
        }
    },
    documentation: {
        humanReadableName: 'Split Inset',
        category: 'inset',
        longDescription: 'Divides the screen bounds into cells sized by their relative proportions, each holding a list of insets. The screen bounds of the insets in a cell are relative to the cell, so (0, 0) to (1, 1) fills it, and they scale with it.',
        selectorRendering: { kind: 'subtitleLongDescription' },
        customConstructor: true,
    },
} satisfies USSValue

function computeInsetConstantName(name: string): string {
    name = name.replace(/[\s,().-]/g, '')
    name = name.replaceAll('+', 'Plus')
    name = `inset${name}`
    return name
}

function deconstructString(inset: typeof insets[keyof typeof insets][number] | InsetNode): string {
    const screenBounds = `screenBounds={ north: ${round(inset.topRight[1], 3)}, east: ${round(inset.topRight[0], 3)}, south: ${round(inset.bottomLeft[1], 3)}, west: ${round(inset.bottomLeft[0], 3)} }`
    if ('children' in inset) {
        const children = inset.children.map(({ insets: cell, proportion }) => `{ insets: [${cell.map(deconstructString).join(', ')}], proportion: ${round(proportion, 3)} }`)
        return `constructSplitInset([${children.join(', ')}], direction=${splitDirectionValueToIdentifier[inset.direction]}, ${screenBounds})`
    }
    return `constructInset(${screenBounds}, mapBounds={ north: ${round(inset.coordBox[3], 3)}, east: ${round(inset.coordBox[2], 3)}, south: ${round(inset.coordBox[1], 3)}, west: ${round(inset.coordBox[0], 3)} }, mainMap=${inset.mainMap}, name="${inset.name}")`
}

export function deconstruct(inset: typeof insets[keyof typeof insets][number] | InsetNode): UrbanStatsASTExpression {
    return parseNoErrorAsExpression(deconstructString(inset), '')
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
