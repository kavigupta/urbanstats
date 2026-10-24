import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { deconstruct as deconstructInset, Inset, InsetNode, isSplit, layoutInsets, listAt, mapList, mapNode, SplitCell, SplitDirection, splitDirectionIdentifierToValue, SplitInset } from '../../urban-stats-script/constants/insets'
import { emptyLocation } from '../../urban-stats-script/lexer'
import * as l from '../../urban-stats-script/literal-parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { fitCoordBox } from '../../utils/coordinates'
import { assert } from '../../utils/defensive'
import { loadInsetExpression, loadInsets } from '../context'

import { MapUSS, mapUssParser, validMapperOutputs } from './map-uss'
import { MapSettings, universesOf } from './utils'

export const neswSchema = l.object({
    north: l.number(),
    east: l.number(),
    south: l.number(),
    west: l.number(),
})

const leafSchema = l.transformExpr(l.deconstruct(l.call({ fn: l.identifier('constructInset'), unnamedArgs: [], namedArgs: {
    mainMap: l.boolean(),
    name: l.string(),
    screenBounds: neswSchema,
    mapBounds: neswSchema,
} })),
({ namedArgs: { screenBounds, mapBounds, mainMap, name } }) => ({
    bottomLeft: [screenBounds.west, screenBounds.south],
    topRight: [screenBounds.east, screenBounds.north],
    coordBox: [mapBounds.west, mapBounds.south, mapBounds.east, mapBounds.north],
    mainMap,
    name,
} satisfies Inset))

const splitSchema: l.LiteralExprParser<SplitInset> = l.transformExpr(l.deconstruct(l.call({ fn: l.identifier('constructSplitInset'), unnamedArgs: [l.vector(l.object({
    insets: l.vector({ parse: (...args) => insetSchema.parse(...args) }),
    proportion: l.number(),
}))], namedArgs: {
    direction: l.transformExpr(l.union(Object.keys(splitDirectionIdentifierToValue).map(l.identifier)), identifier => splitDirectionIdentifierToValue[identifier]),
    screenBounds: neswSchema,
} })),
({ unnamedArgs: [children], namedArgs: { direction, screenBounds } }) => ({
    bottomLeft: [screenBounds.west, screenBounds.south],
    topRight: [screenBounds.east, screenBounds.north],
    direction,
    children,
} satisfies SplitInset))

const insetSchema: l.LiteralExprParser<InsetNode> = l.union<InsetNode>([leafSchema, splitSchema])

const constructInsetsSchema = l.transformExpr(l.maybeAutoUXNode(l.call({ fn: l.identifier('constructInsets'), namedArgs: {}, unnamedArgs: [l.editableVector(insetSchema)] })), call => call.expr.unnamedArgs[0])

const mapSchema = mapUssParser(l.call({
    fn: l.ignore(),
    unnamedArgs: [],
    namedArgs: {
        insets: l.edit(l.optional(l.deconstruct(constructInsetsSchema))),
    },
}), validMapperOutputs)

export function getInsets(settings: MapSettings, typeEnvironment: TypeEnvironment): InsetNode[] | undefined {
    if (settings.script.uss.type === 'statements') {
        try {
            const parseResult = mapSchema(settings.script.uss, typeEnvironment).namedArgs.insets
            if (parseResult.currentValue === undefined && settings.geographies.length > 0) {
                return loadInsets(universesOf(settings.geographies))
            }
            return parseResult.currentValue?.currentValue
        }
        catch (err) {
            if (err instanceof l.LiteralParseError) {
                return undefined
            }
            else {
                throw err
            }
        }
    }
    return undefined
}

/** Splits a main map's whole list of insets, or another inset by itself */
export function splitInsets(insets: InsetNode[], path: number[], direction: SplitDirection): InsetNode[] {
    const listPath = path.slice(0, -1)
    const list = listAt(insets, listPath)
    const leaf = list[path[path.length - 1]]
    assert(!isSplit(leaf), 'Splitting a split')

    const splitPath = listPath.slice(0, -1)
    const cellIndex = listPath[listPath.length - 1]
    const parent = listPath.length > 0 ? listAt(insets, splitPath.slice(0, -1))[splitPath[splitPath.length - 1]] : undefined
    if (parent !== undefined && isSplit(parent) && parent.direction === direction && (leaf.mainMap || list.length === 1)) {
        return mapNode(insets, splitPath, () => {
            return [{ ...parent, children: [...parent.children.slice(0, cellIndex + 1), parent.children[cellIndex], ...parent.children.slice(cellIndex + 1)] }]
        })
    }

    const cell = (cellInsets: InsetNode[]): SplitCell => ({ insets: cellInsets, proportion: 1 })
    if (leaf.mainMap) {
        return mapList(insets, listPath, () => [{ bottomLeft: [0, 0], topRight: [1, 1], direction, children: [cell(list), cell(list)] }])
    }
    const copy: Inset = { ...leaf, bottomLeft: [0, 0], topRight: [1, 1] }
    return mapNode(insets, path, () => [{ bottomLeft: leaf.bottomLeft, topRight: leaf.topRight, direction, children: [cell([copy]), cell([copy])] }])
}

/** Deleting a main map in a split deletes its cell */
export function deleteInsets(insets: InsetNode[], path: number[]): InsetNode[] {
    const leaf = listAt(insets, path.slice(0, -1))[path[path.length - 1]]
    if (!isSplit(leaf) && leaf.mainMap && path.length > 1) {
        return mapList(insets, path.slice(0, -1), () => [])
    }
    return mapNode(insets, path, () => [])
}

/**
 * Saves the map bounds each edited inset shows on a canvas of the given aspect ratio, so that
 * `computeAspectRatioForInsets` gives the same canvas after a frame is resized without panning.
 */
export function fitInsetMapBounds(insets: InsetNode[], original: InsetNode[], canvasAspectRatio: number): InsetNode[] {
    const unedited = new Set(original)
    return layoutInsets(insets).leaves.reduce((result, leaf) => {
        const aspectRatio = (leaf.topRight[0] - leaf.bottomLeft[0]) * canvasAspectRatio / (leaf.topRight[1] - leaf.bottomLeft[1])
        const coordBox = fitCoordBox(leaf.coordBox, aspectRatio)
        if (unedited.has(insets[leaf.path[0]]) || coordBox === leaf.coordBox) {
            return result
        }
        return mapNode(result, leaf.path, node => [{ ...node, coordBox }])
    }, insets)
}

/** Rescales screen bounds so the insets span the whole canvas in both dimensions. */
export function normalizeInsetScreenBounds(insets: InsetNode[]): InsetNode[] {
    const scaleAxis = (axis: 0 | 1): (v: number) => number => {
        const values = insets.flatMap(inset => [inset.bottomLeft[axis], inset.topRight[axis]])
        const min = Math.min(...values)
        const max = Math.max(...values)
        return max > min ? v => (v - min) / (max - min) : v => v
    }
    const scaleX = scaleAxis(0)
    const scaleY = scaleAxis(1)

    return insets.map((inset) => {
        const bottomLeft: [number, number] = [scaleX(inset.bottomLeft[0]), scaleY(inset.bottomLeft[1])]
        const topRight: [number, number] = [scaleX(inset.topRight[0]), scaleY(inset.topRight[1])]
        if (bottomLeft[0] === inset.bottomLeft[0] && bottomLeft[1] === inset.bottomLeft[1]
            && topRight[0] === inset.topRight[0] && topRight[1] === inset.topRight[1]) {
            return inset
        }
        return { ...inset, bottomLeft, topRight }
    })
}

/** `original` is what `getInsets` parsed from these settings, so it lines up with their expressions */
export function doEditInsets(settings: MapSettings, original: InsetNode[], edited: InsetNode[], typeEnvironment: TypeEnvironment): MapUSS {
    assert(settings.script.uss.type === 'statements', 'Trying to do an inset edit on USS that is not inset editable')
    const mapInsets = mapSchema(settings.script.uss, typeEnvironment).namedArgs.insets
    assert(settings.geographies.length > 0, 'Trying to do an inset edit on USS that is not inset editable')

    let currentInsetsAst: UrbanStatsASTExpression
    if (mapInsets.currentValue !== undefined) {
        currentInsetsAst = mapInsets.expr!
    }
    else {
        currentInsetsAst = loadInsetExpression(universesOf(settings.geographies))
    }

    // Insets that edits left untouched keep their expressions, so constants aren't written out
    const newConstructInsets = constructInsetsSchema.parse(currentInsetsAst, typeEnvironment).edit(ast => edited.map((inset) => {
        const i = original.indexOf(inset)
        return i === -1 ? deconstructInset(inset) : ast[i]
    })) as UrbanStatsASTExpression

    const result = mapInsets.edit(newConstructInsets.type === 'autoUXNode'
        ? newConstructInsets
        : {
                type: 'autoUXNode',
                expr: newConstructInsets,
                metadata: {
                    collapsed: mapInsets.expr === undefined,
                },
                entireLoc: emptyLocation(''),
            })

    return result as MapUSS
}
