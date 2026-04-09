import { arrayMove } from '@dnd-kit/sortable'

import { MapUSS, mapUssParser } from '../mapper/settings/map-uss'
import { tableType } from '../urban-stats-script/constants/table'
import * as l from '../urban-stats-script/literal-parser'
import { TypeEnvironment } from '../urban-stats-script/types-values'

import { Statistic, StatSetter } from './types'

const tableColumnsParser = mapUssParser(
    l.call({
        fn: l.identifier('table'),
        unnamedArgs: [],
        namedArgs: {
            columns: l.editableVector(l.passthrough()),
        },
    }),
    [tableType],
)

export function makeColumnReorderHandler(
    stat: Statistic,
    set: StatSetter,
    typeEnvironment: TypeEnvironment,
): ((from: number, to: number) => void) | undefined {
    if (stat.type !== 'uss') {
        return undefined
    }
    try {
        tableColumnsParser(stat.uss, typeEnvironment)
    }
    catch (err) {
        if (err instanceof l.LiteralParseError) {
            return undefined
        }
        throw err
    }
    return (from: number, to: number): void => {
        const newUss = tableColumnsParser(stat.uss, typeEnvironment).namedArgs.columns.edit(
            elements => arrayMove(elements, from, to),
        )
        set({ stat: { ...stat, uss: newUss as MapUSS } }, { undoable: true })
    }
}
