import { MapUSS, mapUssParser } from '../mapper/settings/map-uss'
import { tableType } from '../urban-stats-script/constants/table'
import * as l from '../urban-stats-script/literal-parser'
import { TypeEnvironment } from '../urban-stats-script/types-values'

import { Statistic, StatSetter, View } from './types'
import { mapUSSFromStat } from './utils'

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

export function makeColumnDeleteHandler(
    stat: Statistic,
    set: StatSetter,
    typeEnvironment: TypeEnvironment,
    view: View,
): ((colIndex: number) => void) | undefined {
    if (stat.type !== 'uss') {
        return undefined
    }
    let parseResult
    try {
        parseResult = tableColumnsParser(mapUSSFromStat(stat), typeEnvironment)
    }
    catch (err) {
        if (err instanceof l.LiteralParseError) {
            return undefined
        }
        throw err
    }
    if (parseResult.namedArgs.columns.currentValue.length < 2) {
        return undefined
    }
    return (colIndex: number): void => {
        const newUss = parseResult.namedArgs.columns.edit(
            elements => elements.filter((_, i) => i !== colIndex),
        )
        const newSortColumn = view.sortColumn > colIndex
            ? view.sortColumn - 1
            : view.sortColumn === colIndex
                ? 0
                : view.sortColumn
        set({
            stat: { ...stat, uss: newUss as MapUSS },
            view: { ...view, sortColumn: newSortColumn },
        }, { undoable: true })
    }
}
