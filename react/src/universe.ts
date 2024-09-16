import { createContext, useContext } from 'react'

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

export function default_article_universe(longname: string): 'USA' | 'world' {
    // if longname contains USA, then default to USA
    if (longname.includes('USA')) {
        return 'USA'
    }
    return 'world'
}

export function default_comparison_universe(longnames: string[]): 'USA' | 'world' {
    // if all longnames are the same universe, default to that universe
    const universes = longnames.map(x => default_article_universe(x))
    if (universes.every(x => x === universes[0])) {
        return universes[0]
    }
    return 'world'
}

export function universe_is_american(universe: string): boolean {
    // if universe ends with USA, then it's American
    return universe.includes('USA')
}

export function longname_is_exclusively_american(universe: string): boolean {
    // if longname ends with ", USA", then it's exclusively American
    return universe.endsWith(', USA') || universe == 'USA'
}
