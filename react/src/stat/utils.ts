import statistic_name_list from '../data/statistic_name_list'
import statistic_variables_info from '../data/statistic_variables_info'
import { defaultTypeEnvironment } from '../mapper/context'
import { attemptParseAsTopLevel, MapUSS, mapUSSFromString } from '../mapper/settings/map-uss'
import { PageDescriptor } from '../navigation/PageDescriptor'
import { StatName } from '../page_template/statistic-tree'
import { Universe } from '../universe'
import { tableType } from '../urban-stats-script/constants/table'
import { unparse } from '../urban-stats-script/parser'
import { assert } from '../utils/defensive'

import { Statistic, StatSettings } from './types'

export function pageDescriptor({ stat, view }: StatSettings): PageDescriptor & { kind: 'statistic' } {
    return {
        kind: 'statistic',
        article_type: stat.articleType,
        start: view.start,
        amount: view.amount,
        order: view.order,
        highlight: view.highlight,
        universe: stat.universe,
        edit: view.edit,
        sort_column: view.sortColumn,
        ...(stat.type === 'uss' ? { uss: unparse(stat.uss, { simplify: false }) } : { statname: stat.statName }),
    }
}

export function parseStatUSS(uss: string, universe: Universe): MapUSS {
    return attemptParseAsTopLevel(mapUSSFromString(uss), defaultTypeEnvironment(universe), true, [tableType])
}

export function mapUSSFromStat(stat: Statistic): MapUSS {
    return stat.type === 'uss'
        ? stat.uss
        : parseStatUSS(`customNode(""); condition (true); table(columns=[column(values=${varName(stat.statName)})])`, stat.universe)
}

function varName(statname: StatName): string {
    const index = statistic_name_list.indexOf(statname)
    const result = statistic_variables_info.variableNames.find(v => v.index === index)
    assert(result !== undefined, `No variable name found for statistic ${statname}`)
    const multi = statistic_variables_info.multiSourceVariables.find(([, ns]) => (ns.individualVariables as readonly string[]).includes(result.varName))
    if (multi !== undefined) {
        return multi[0]
    }
    return result.varName
}
