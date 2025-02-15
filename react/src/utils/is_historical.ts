import type_ordering_idx from '../data/type_ordering_idx'

const historicalCongressional = 'Historical Congressional District'

export function isHistoricalCD(typeOrTypeIndex: number | string): boolean {
    if (typeof typeOrTypeIndex === 'string') {
        return typeOrTypeIndex === historicalCongressional
    }
    return type_ordering_idx[historicalCongressional] === typeOrTypeIndex
}
