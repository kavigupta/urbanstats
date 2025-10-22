import type_ordering_idx from '../data/type_ordering_idx'

export interface ShowGeographySettings {
    // eslint-disable-next-line no-restricted-syntax -- matches localStorage keys
    show_historical_cds: boolean
    // eslint-disable-next-line no-restricted-syntax -- matches localStorage keys
    show_person_circles: boolean
}

const historicalCongressionals = Object.keys(type_ordering_idx).filter(
    key => key.startsWith('Congressional District ('),
)
const historicalCongressionalsIdx = historicalCongressionals.map(
    key => type_ordering_idx[key],
)

const populationCircles = Object.entries(type_ordering_idx).filter(([name]) => name.endsWith('Person Circle')).map(([,index]) => index)

function isHistoricalCD(typeOrTypeIndex: number | string): boolean {
    if (typeof typeOrTypeIndex === 'string') {
        return historicalCongressionals.includes(typeOrTypeIndex)
    }
    return historicalCongressionalsIdx.includes(typeOrTypeIndex)
}

function isPopulationCircle(typeOrTypeIndex: number | string): boolean {
    if (typeof typeOrTypeIndex === 'string') {
        return Object.keys(type_ordering_idx).filter(name => name.endsWith('Person Circle')).includes(typeOrTypeIndex)
    }
    return populationCircles.includes(typeOrTypeIndex)
}

export function isAllowedToBeShown(typeOrTypeIndex: number | string, settings: ShowGeographySettings): boolean {
    if (!settings.show_historical_cds && isHistoricalCD(typeOrTypeIndex)) {
        return false
    }
    if (!settings.show_person_circles && isPopulationCircle(typeOrTypeIndex)) {
        return false
    }
    return true
}
