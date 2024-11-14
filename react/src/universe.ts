import { createContext, useContext } from 'react'
import universes_default from './data/universes_default'

export const UNIVERSE_CONTEXT = createContext<string | undefined>(undefined)

export function useUniverse(): string {
    return useContext(UNIVERSE_CONTEXT)!
}

export function get_universe<Default extends string | undefined>(default_universe: Default): string | Default {
    return new URLSearchParams(window.location.search).get('universe') ?? default_universe
}

export function set_universe(universe: string): void {
    const params = new URLSearchParams(window.location.search)
    params.set('universe', universe)
    window.location.search = params.toString()
}

export function remove_universe_if_not_in(universes: string[]): void {
    const universe = get_universe(undefined)
    if (universe === undefined || !universes.includes(universe)) {
        // clear universe without actually reloading the page
        const params = new URLSearchParams(window.location.search)
        params.delete('universe')
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    }
}

export function remove_universe_if_default(default_universe: string): void {
    if (get_universe(undefined) === default_universe) {
        // clear universe without actually reloading the page
        const params = new URLSearchParams(window.location.search)
        params.delete('universe')
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
    }
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

export function universe_is_american(universe: string): boolean {
    // if universe ends with USA, then it's American
    return universe.endsWith(', USA') || universe === 'USA'
}
