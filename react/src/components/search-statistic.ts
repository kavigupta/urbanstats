import used_geographies from '../data/mapper/used_geographies'
import statistic_name_list from '../data/statistic_name_list'
import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { DefaultMap } from '../utils/DefaultMap'
import { DefaultUniverseTable } from '../utils/protos'
import { NormalizeProto } from '../utils/types'

import { forTypeByIndex, getCountsByArticleType } from './countsByArticleType'

interface StatisticPage {
    statisticIndex: number
    typeIndex: number
    universeIndex: number
}

export async function statsAllUniverses(): Promise<() => Generator<StatisticPage>> {
    const [defaultUniverseTable, counts] = await Promise.all([
        loadProtobuf('/default_universe_by_stat_geo.gz', 'DefaultUniverseTable').then(p => p as NormalizeProto<DefaultUniverseTable>),
        getCountsByArticleType(),
    ])

    return function* () {
        const exceptionalTypeStats = new DefaultMap<number, Set<number>>(() => new Set())
        for (const { typeIdx, statIdx, universeIdx } of defaultUniverseTable.exceptions) {
            exceptionalTypeStats.get(typeIdx).add(statIdx)
            yield {
                statisticIndex: statIdx,
                typeIndex: typeIdx,
                universeIndex: universeIdx,
            }
        }

        for (const geography of used_geographies) {
            const typeIndex = type_ordering_idx[geography]
            for (let statisticIndex = 0; statisticIndex < statistic_name_list.length; statisticIndex++) {
                if (
                    !exceptionalTypeStats.get(typeIndex).has(statisticIndex)
                    && forTypeByIndex(counts, universes_ordered[defaultUniverseTable.mostCommonUniverseIdx], statisticIndex, geography) > 0
                ) {
                    yield {
                        statisticIndex,
                        typeIndex,
                        universeIndex: defaultUniverseTable.mostCommonUniverseIdx,
                    }
                }
            }
        }
    }
}
