import type_ordering_idx from '../data/type_ordering_idx'

// TODO
const historicalCongressionals = Object.keys(type_ordering_idx).filter(
    key => key.startsWith('Congressional District ('),
)
const historicalCongressionalsIdx = historicalCongressionals.map(
    key => type_ordering_idx[key],
)

export function isHistoricalCD(typeOrTypeIndex: number | string): boolean {
    if (typeof typeOrTypeIndex === 'string') {
        return historicalCongressionals.includes(typeOrTypeIndex)
    }
    return historicalCongressionalsIdx.includes(typeOrTypeIndex)
}
