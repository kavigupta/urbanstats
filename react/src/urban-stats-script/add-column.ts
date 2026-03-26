import { MapUSS, mapUssParser } from '../mapper/settings/map-uss'

import { UrbanStatsASTExpression } from './ast'
import { tableType } from './constants/table'
import * as l from './literal-parser'
import { noLocation } from './location'
import { TypeEnvironment } from './types-values'

const parser = mapUssParser(l.call({
    fn: l.identifier('table'),
    unnamedArgs: [],
    namedArgs: {
        columns: l.editableVector(l.ignore()),
    },
}), [tableType])

export function addColumn(uss: MapUSS, typeEnvironment: TypeEnvironment): ((stat: string) => MapUSS) | undefined {
    try {
        const parsed = parser(uss, typeEnvironment)
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
