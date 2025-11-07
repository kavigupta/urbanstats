import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { deconstruct as deconstructInset, Inset } from '../../urban-stats-script/constants/insets'
import * as l from '../../urban-stats-script/literal-parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { loadInsets, loadInsetExpression } from '../../urban-stats-script/worker'
import { ArrayEdits, replace, swap } from '../../utils/array-edits'
import { assert } from '../../utils/defensive'

import { idOutput, MapUSS, validMapperOutputs } from './TopLevelEditor'
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

const constructInsetsSchema = l.transformExpr(l.call({ fn: l.identifier('constructInsets'), namedArgs: {}, unnamedArgs: [l.editableVector(insetSchema)] }), call => call.unnamedArgs[0])

const mapInsetsSchema = l.transformStmt(l.statements([
    l.ignore(),
    l.condition({
        condition: l.ignore(),
        rest: [
            l.expression(l.reparse(idOutput, validMapperOutputs,
                l.call({
                    fn: l.ignore(),
                    unnamedArgs: [],
                    namedArgs: {
                        insets: l.edit(l.optional(l.deconstruct(constructInsetsSchema))),
                    },
                }))),
        ],
    }),
]), (uss) => {
    const insetArg = uss[1].rest[0].namedArgs.insets
    const literalInsets = insetArg.currentValue ?? null
    return {
        ...insetArg,
        currentValue: literalInsets,
    }
})

export function getInsets(settings: MapSettings, typeEnvironment: TypeEnvironment): Inset[] | undefined {
    if (settings.script.uss.type === 'statements') {
        const parseResult = mapInsetsSchema.parse(settings.script.uss, typeEnvironment)
        if (parseResult === undefined) {
            return undefined
        }
        if (parseResult.currentValue !== null) {
            return parseResult.currentValue.currentValue
        }
        if (settings.universe !== undefined) {
            return loadInsets(settings.universe)
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

export function doEditInsets(settings: MapSettings, edits: InsetEdits, typeEnvironment: TypeEnvironment): MapUSS {
    assert(settings.script.uss.type === 'statements', 'Trying to do an inset edit on USS that is not inset editable')
    const mapInsets = mapInsetsSchema.parse(settings.script.uss, typeEnvironment)
    assert(mapInsets !== undefined && (mapInsets.currentValue !== null || settings.universe !== undefined), 'Trying to do an inset edit on USS that is not inset editable')

    let currentInsetsAst: UrbanStatsASTExpression
    if (mapInsets.currentValue !== null) {
        currentInsetsAst = mapInsets.expr!
    }
    else {
        currentInsetsAst = loadInsetExpression(settings.universe!)
    }

    const newConstructInsets = constructInsetsSchema.parse(currentInsetsAst, typeEnvironment)!.edit(edits.ast) as UrbanStatsASTExpression

    const result = mapInsets.edit(newConstructInsets)
    return result as MapUSS
}
