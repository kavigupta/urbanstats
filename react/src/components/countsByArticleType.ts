import { loadProtobuf } from '../load_json'
import { CountsByArticleUniverseAndType, ICountsByArticleType, ICountsByColumnCompressed } from '../utils/protos'

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
