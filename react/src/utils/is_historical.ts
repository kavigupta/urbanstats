import type_ordering_idx from '../data/type_ordering_idx'

const historicalCongressionals = ['Historical Congressional District']

const historicalCongressionalsIdx = historicalCongressionals.map(
    key => type_ordering_idx[key],
)

export function isHistoricalCD(typeOrTypeIndex: number | string): boolean {
    if (typeof typeOrTypeIndex === 'string') {
        return historicalCongressionals.includes(typeOrTypeIndex)
    }
    return historicalCongressionalsIdx.includes(typeOrTypeIndex)
}
