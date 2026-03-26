import { idOutput, MapUSS } from '../mapper/settings/map-uss'

import { UrbanStatsASTExpression } from './ast'
import { tableType } from './constants/table'
import * as l from './literal-parser'
import { noLocation } from './location'
import { TypeEnvironment } from './types-values'

const tableCallSchema = l.call({
    fn: l.identifier('table'),
    unnamedArgs: [],
    namedArgs: {
        columns: l.editableVector(l.ignore()),
    },
})

const statementsSchema = l.lastExpression(l.reparse(idOutput, [tableType], tableCallSchema))

const customNodeSchema = l.reparse(idOutput, [tableType], l.customNode(l.lastExpression(tableCallSchema)))

export function addColumn(uss: MapUSS, typeEnvironment: TypeEnvironment): ((stat: string) => MapUSS) | undefined {
    try {
        const parsed = uss.type === 'statements' ? statementsSchema.parse(uss, typeEnvironment) : customNodeSchema.parse(uss, typeEnvironment)
        return (stat) => {
            const newColumn: UrbanStatsASTExpression = {
                type: 'call',
                fn: {
                    type: 'identifier',
                    name: { node: 'column', location: noLocation },
                },
                args: [{ type: 'named', name: { node: 'values', location: noLocation }, value: {
                    type: 'identifier',
                    name: { node: stat, location: noLocation },
                } }],
                entireLoc: noLocation,
            }
            return parsed.namedArgs.columns.edit(c => [...c, newColumn]) as MapUSS
        }
    }
    catch (e) {
        if (e instanceof l.LiteralParseError) {
            return undefined
        }
        throw e
    }
}
