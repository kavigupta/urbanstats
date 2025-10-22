import { useContext } from 'react'

import universes_default from './data/universes_default'
import universes_ordered from './data/universes_ordered'
import { Navigator } from './navigation/Navigator'

export type Universe = (typeof universes_ordered)[number]

export function useUniverse(): string {
    return useContext(Navigator.Context).useUniverse() ?? (() => { throw new Error(`No universe for current page`) })()
}

export function defaultArticleUniverse(articleUniverses: string[]): typeof universes_default[number] {
    // last element of articleUniverses that is in universes_default
    for (let i = articleUniverses.length - 1; i >= 0; i--) {
        if (universes_default.some(x => x === articleUniverses[i])) {
            return articleUniverses[i] as typeof universes_default[number]
        }
    }
    return universes_default[0]
}

export function defaultComparisonUniverse(articleUniverses: string[][], availableUniverses: string[]): string {
    const universes = articleUniverses.map(x => defaultArticleUniverse(x))
    // locate each universe in availableUniverses. If it is in, give the index, otherwise length of availableUniverses
    const universeIndices = universes.map(x => availableUniverses.includes(x) ? availableUniverses.indexOf(x) : availableUniverses.length - 1)
    // find the universe with the largest index
    const maxIndex = Math.max(...universeIndices)
    return availableUniverses[maxIndex]
}
