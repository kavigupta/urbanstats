import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { deconstruct as deconstructInset, Inset } from '../../urban-stats-script/constants/insets'
import { emptyLocation } from '../../urban-stats-script/lexer'
import * as l from '../../urban-stats-script/literal-parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { ArrayEdits, replace, swap } from '../../utils/array-edits'
import { assert } from '../../utils/defensive'
import { loadInsetExpression, loadInsets } from '../context'

import { MapUSS, mapUssParser, validMapperOutputs } from './map-uss'
import { MapSettings } from './utils'

export const neswSchema = l.object({
    north: l.number(),
    east: l.number(),
    south: l.number(),
    west: l.number(),
})

const insetSchema = l.transformExpr(l.deconstruct(l.call({ fn: l.identifier('constructInset'), unnamedArgs: [], namedArgs: {
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

const constructInsetsSchema = l.transformExpr(l.maybeAutoUXNode(l.call({ fn: l.identifier('constructInsets'), namedArgs: {}, unnamedArgs: [l.editableVector(insetSchema)] })), call => call.expr.unnamedArgs[0])

const mapSchema = mapUssParser(l.call({
    fn: l.ignore(),
    unnamedArgs: [],
    namedArgs: {
        insets: l.edit(l.optional(l.deconstruct(constructInsetsSchema))),
    },
}), validMapperOutputs)

export function getInsets(settings: MapSettings, typeEnvironment: TypeEnvironment): Inset[] | undefined {
    if (settings.script.uss.type === 'statements') {
        try {
            const parseResult = mapSchema(settings.script.uss, typeEnvironment).namedArgs.insets
            if (parseResult.currentValue === undefined && settings.universe !== undefined) {
                return loadInsets(settings.universe)
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

export interface InsetEdits {
    insets: ArrayEdits<Inset>
    ast: ArrayEdits<UrbanStatsASTExpression>
}

export function replaceInsets(edits: InsetEdits, [from, to]: [number, number], withArray: Inset[]): InsetEdits {
    return {
        insets: replace(edits.insets, [from, to], withArray),
        ast: replace(edits.ast, [from, to], withArray.map(deconstructInset)),
    }
}

export function swapInsets(edits: InsetEdits, indexA: number, indexB: number): InsetEdits {
    return {
        insets: swap(edits.insets, indexA, indexB),
        ast: swap(edits.ast, indexA, indexB),
    }
}

/** Rescales screen bounds so the insets span the whole canvas in both dimensions. */
export function normalizeInsetScreenBounds(edits: InsetEdits, insets: Inset[]): InsetEdits {
    const scaleAxis = (axis: 0 | 1): (v: number) => number => {
        const values = insets.flatMap(inset => [inset.bottomLeft[axis], inset.topRight[axis]])
        const min = Math.min(...values)
        const max = Math.max(...values)
        return max > min ? v => (v - min) / (max - min) : v => v
    }
    const scaleX = scaleAxis(0)
    const scaleY = scaleAxis(1)

    return insets.reduce((result, inset, i) => {
        const bottomLeft: [number, number] = [scaleX(inset.bottomLeft[0]), scaleY(inset.bottomLeft[1])]
        const topRight: [number, number] = [scaleX(inset.topRight[0]), scaleY(inset.topRight[1])]
        if (bottomLeft[0] === inset.bottomLeft[0] && bottomLeft[1] === inset.bottomLeft[1]
            && topRight[0] === inset.topRight[0] && topRight[1] === inset.topRight[1]) {
            return result
        }
        return replaceInsets(result, [i, i + 1], [{ ...inset, bottomLeft, topRight }])
    }, edits)
}

export function doEditInsets(settings: MapSettings, edits: InsetEdits, typeEnvironment: TypeEnvironment): MapUSS {
    assert(settings.script.uss.type === 'statements', 'Trying to do an inset edit on USS that is not inset editable')
    const mapInsets = mapSchema(settings.script.uss, typeEnvironment).namedArgs.insets
    assert(settings.universe !== undefined, 'Trying to do an inset edit on USS that is not inset editable')

    let currentInsetsAst: UrbanStatsASTExpression
    if (mapInsets.currentValue !== undefined) {
        currentInsetsAst = mapInsets.expr!
    }
    else {
        currentInsetsAst = loadInsetExpression(settings.universe)
    }

    const newConstructInsets = constructInsetsSchema.parse(currentInsetsAst, typeEnvironment).edit(edits.ast) as UrbanStatsASTExpression

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
