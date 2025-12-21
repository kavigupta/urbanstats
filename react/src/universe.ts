import React, { useContext } from 'react'
import { z } from 'zod'

import universes_default from './data/universes_default'
import universes_ordered from './data/universes_ordered'

export type Universe = (typeof universes_ordered)[number]

export function useUniverseContext(): UniverseContext | undefined {
    return useContext(universeContext)
}

export function useUniverse(): Universe | undefined {
    return useUniverseContext()?.universe
}

export function defaultArticleUniverse(articleUniverses: Universe[]): typeof universes_default[number] {
    // last element of articleUniverses that is in universes_default
    for (let i = articleUniverses.length - 1; i >= 0; i--) {
        if (universes_default.some(x => x === articleUniverses[i])) {
            return articleUniverses[i] as typeof universes_default[number]
        }
    }
    return universes_default[0]
}

export function defaultComparisonUniverse(articleUniverses: Universe[][], availableUniverses: Universe[]): Universe {
    const universes = articleUniverses.map(x => defaultArticleUniverse(x))
    // locate each universe in availableUniverses. If it is in, give the index, otherwise length of availableUniverses
    const universeIndices = universes.map(x => availableUniverses.includes(x) ? availableUniverses.indexOf(x) : availableUniverses.length - 1)
    // find the universe with the largest index
    const maxIndex = Math.max(...universeIndices)
    return availableUniverses[maxIndex]
}

interface UniverseContext {
    universe: Universe
    universes: readonly Universe[]
    setUniverse: (newUniverse: Universe) => void
}

export const universeContext = React.createContext<UniverseContext | undefined>(undefined)

export const universeSchema = z.enum(universes_ordered)
