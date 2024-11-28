import { createContext, useContext } from 'react'

import universes_default from './data/universes_default'

export const UniverseContext = createContext<string | undefined>(undefined)

export function useUniverse(): string {
    return useContext(UniverseContext)!
}

export function default_article_universe(articleUniverses: string[]): typeof universes_default[number] {
    // last element of articleUniverses that is in universes_default
    for (let i = articleUniverses.length - 1; i >= 0; i--) {
        if (universes_default.some(x => x === articleUniverses[i])) {
            return articleUniverses[i] as typeof universes_default[number]
        }
    }
    return universes_default[0]
}

export function default_comparison_universe(articleUniverses: string[][], availableUniverses: string[]): string {
    const universes = articleUniverses.map(x => default_article_universe(x))
    // locate each universe in availableUniverses. If it is in, give the index, otherwise length of availableUniverses
    const universe_indices = universes.map(x => availableUniverses.includes(x) ? availableUniverses.indexOf(x) : availableUniverses.length - 1)
    // find the universe with the largest index
    const max_index = Math.max(...universe_indices)
    return availableUniverses[max_index]
}
