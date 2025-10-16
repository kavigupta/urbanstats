import type_ordering_idx from '../data/type_ordering_idx'

const historicalCongressionals = Object.keys(type_ordering_idx).filter(
    key => key.startsWith('Congressional District ('),
)
const historicalCongressionalsIdx = historicalCongressionals.map(
    key => type_ordering_idx[key],
)

const populationCircles = Object.entries(type_ordering_idx).filter(([name]) => name.endsWith('Person Circle')).map(([,index]) => index)

export function isHistoricalCD(typeOrTypeIndex: number | string): boolean {
    if (typeof typeOrTypeIndex === 'string') {
        return historicalCongressionals.includes(typeOrTypeIndex)
    }
    return historicalCongressionalsIdx.includes(typeOrTypeIndex)
}

export function isPopulationCircle(typeOrTypeIndex: number | string): boolean {
    if (typeof typeOrTypeIndex === 'string') {
        return Object.keys(type_ordering_idx).filter(name => name.endsWith('Person Circle')).includes(typeOrTypeIndex)
    }
    return populationCircles.includes(typeOrTypeIndex)
}
