import { Inset } from '../../components/map'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { deconstruct } from '../../urban-stats-script/constants/insets'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { loadInsetExpression } from '../../urban-stats-script/worker'
import { assert } from '../../utils/defensive'

import * as l from './../../urban-stats-script/literal-parser'
import { idOutput, MapUSS, validMapperOutputs } from './TopLevelEditor'
import { MapSettings } from './utils'

const neswSchema = l.object({
    north: l.number(),
    east: l.number(),
    south: l.number(),
    west: l.number(),
})

const insetSchema = l.transformExpr(l.deconstruct(l.call({ unnamedArgs: [], namedArgs: {
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

const constructInsetsSchema = l.transformExpr(l.call({ namedArgs: {}, unnamedArgs: [l.vector(l.edit(insetSchema))] }), call => call.unnamedArgs[0])

const mapInsetsSchema = l.transformStmt(l.statements([
    l.ignore(),
    l.condition({
        condition: l.ignore(),
        rest: [
            l.expression(l.reparse(idOutput, validMapperOutputs,
                l.call({
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

export function canEditInsets(settings: MapSettings, typeEnvironment: TypeEnvironment): boolean {
    if (settings.script.uss.type === 'statements') {
        const parseResult = mapInsetsSchema.parse(settings.script.uss, typeEnvironment)
        if (parseResult === undefined) {
            return false
        }
        return parseResult.currentValue !== null || settings.universe !== undefined
    }
    return false
}

export type InsetEdits = ReadonlyMap<number, Partial<Inset>>

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

    for (const [index, partialInset] of edits) {
        const insets = constructInsetsSchema.parse(currentInsetsAst, typeEnvironment)!
        currentInsetsAst = insets[index].edit(deconstruct({ ...insets[index].currentValue, ...partialInset })) as UrbanStatsASTExpression
    }

    return mapInsets.edit(currentInsetsAst) as MapUSS
}
