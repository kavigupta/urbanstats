import used_geographies from '../data/mapper/used_geographies'
import statistic_name_list from '../data/statistic_name_list'
import type_ordering_idx from '../data/type_ordering_idx'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { typesInOrder } from '../navigation/links'
import { buildSearchIndex, NormalizedSearchIndex } from '../search'
import { Universe } from '../universe'
import { DefaultMap } from '../utils/DefaultMap'
import { DefaultUniverseTable } from '../utils/protos'
import { NormalizeProto } from '../utils/types'

import { forTypeByIndex, getCountsByArticleType } from './countsByArticleType'

interface StatisticPage {
    statisticIndex: number
    typeIndex: number
    universeIndex: number
}

export type AllUniverses = 'allUniverses'

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

async function statsOneUniverse(universe: Universe): Promise<() => Generator<StatisticPage>> {
    const counts = await getCountsByArticleType()
    const universeIndex = universes_ordered.indexOf(universe)
    return function* () {
        for (const geography of used_geographies) {
            for (let statisticIndex = 0; statisticIndex < statistic_name_list.length; statisticIndex++) {
                if (forTypeByIndex(counts, universe, statisticIndex, geography) === 0) {
                    // No articles for this stat in this universe
                    continue
                }
                yield {
                    statisticIndex,
                    typeIndex: type_ordering_idx[geography],
                    universeIndex,
                }
            }
        }
    }
}

function buildStatsSearchIndex(statsEntries: Generator<StatisticPage>): NormalizedSearchIndex {
    return buildSearchIndex(Array.from(statsEntries).map((stat) => {
        const longname = `${statistic_name_list[stat.statisticIndex]} by ${typesInOrder[stat.typeIndex]}`
        return {
            type: 'statistic',
            priority: 0,
            longname,
            ...stat,
        }
    }))
}

export async function createStatsIndex(universe: Universe | AllUniverses): Promise<NormalizedSearchIndex> {
    const stats = universe === 'allUniverses' ? await statsAllUniverses() : await statsOneUniverse(universe)
    return buildStatsSearchIndex(stats())
}
