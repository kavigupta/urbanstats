import stats from '../data/statistic_list'
import { loadProtobuf } from '../load_json'
import { CountsByArticleUniverseAndType, ICountsByArticleType, ICountsByColumnCompressed } from '../utils/protos'

import { StatCol } from './load-article'

export type CountsByUT = Record<string, Record<string, [number, number][]>>

let countsByArticleType: Promise<CountsByUT> | null = null

export async function getCountsByArticleType(): Promise<CountsByUT> {
    if (countsByArticleType === null) {
        countsByArticleType = getCountsByArticleTypeDirect()
    }
    return countsByArticleType
}

async function getCountsByArticleTypeDirect(): Promise<CountsByUT> {
    const countsByUT: CountsByArticleUniverseAndType = await loadProtobuf(
        '/counts.gz', 'CountsByArticleUniverseAndType',
    )
    return Object.fromEntries(countsByUT.universe.map((universe, uIdx) => {
        const countsByT: ICountsByArticleType = countsByUT.countsByType[uIdx]
        const countsByType = Object.fromEntries(
            countsByT.articleType!.map((typ, tIdx) => {
                const counts: ICountsByColumnCompressed = countsByT.counts![tIdx]
                return [
                    typ,
                    counts.count!.map(
                        (x, i) => [x, counts.countRepeat![i]] satisfies [number, number],
                    ),
                ]
            }),
        )
        return [universe, countsByType]
    }))
}

export function articleTypes(counts: CountsByUT, universe: string): string[] {
    if (!(universe in counts)) {
        return []
    }
    return Object.keys(counts[universe]).filter(k => k !== 'overall')
}

export function forTypeByIndex(counts: CountsByUT, universe: string, statIdx: number, typ: string): number {
    if (!(universe in counts)) {
        return 0
    }
    if (!(typ in counts[universe])) {
        return 0
    }
    const countsByType = counts[universe][typ]

    return lookupInCompressedSequence(countsByType, statIdx)
}

export function forType(counts: CountsByUT, universe: string, statcol: StatCol, typ: string): number {
    const idx = stats.indexOf(statcol) // Works because `require` is global
    return forTypeByIndex(counts, universe, idx, typ)
}

function lookupInCompressedSequence(seq: [number, number][], idx: number): number {
    // translation of sharding.py::lookup_in_compressed_sequence
    for (const [value, length] of seq) {
        if (idx < length) {
            return value
        }
        idx -= length
    }
    throw new Error('Index out of bounds')
}
