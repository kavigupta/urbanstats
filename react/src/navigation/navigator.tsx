import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react'

import { ArticlePanel } from '../components/article-panel'
import { ComparisonPanel } from '../components/comparison-panel'
import { discordFix } from '../discord-fix'
import { loadProtobuf } from '../load_json'
import { default_article_universe, default_comparison_universe, UNIVERSE_CONTEXT } from '../universe'
import { Article } from '../utils/protos'
import { followSymlink, followSymlinks } from '../utils/symlinks'

import { data_link } from './links'

export type PageDescriptor = {
    kind: 'article'
    longname: string
    universe: string | null
}
| {
    kind: 'comparison'
    longnames: string[]
    universe: string | null
}

type PageData =
    { kind: 'article', article: Article, universe: string }
    | { kind: 'comparison', articles: Article[], universe: string, universes: string[] }

type NavigationState = { state: 'notFound', error: unknown }
    | {
        state: 'loading'
        from?: { descriptor: PageDescriptor, data: PageData }
        to: { descriptor: PageDescriptor }
    }
    | { state: 'loaded', descriptor: PageDescriptor, data: PageData }
    | {
        state: 'errorLoading'
        error: unknown
        from?: { descriptor: PageDescriptor, data: PageData }
        to: { descriptor: PageDescriptor }
    }

function toFromField(navigationState: NavigationState): { descriptor: PageDescriptor, data: PageData } | undefined {
    switch (navigationState.state) {
        case 'notFound':
            return undefined
        case 'loaded':
            return navigationState
        default:
            return navigationState.from
    }
}

function pageDescriptorFromURL(url: URL): PageDescriptor {
    const universe = url.searchParams.get('universe')
    switch (url.pathname) {
        case '/article.html':
            const longname = url.searchParams.get('longname')
            if (longname === null) {
                throw new Error('missing param longname')
            }
            return { kind: 'article', longname: followSymlink(longname), universe }
        case '/comparison.html':
            const longnames = url.searchParams.get('longnames')
            if (longnames === null) {
                throw new Error('missing param longnames')
            }
            const names = followSymlinks(JSON.parse(longnames) as string[])
            return { kind: 'comparison', longnames: names, universe }
        default:
            throw new Error('404 not found')
    }
}

// Not a pure function, just modifies the current URL
function urlFromPageDescriptor(pageDescriptor: PageDescriptor): URL {
    const result = new URL(window.location.origin)
    result.hash = window.location.hash
    switch (pageDescriptor.kind) {
        case 'article':
            result.pathname = '/article.html'
            result.searchParams.set('longname', pageDescriptor.longname)
            if (pageDescriptor.universe !== null) {
                result.searchParams.set('universe', pageDescriptor.universe)
            }
            break
        case 'comparison':
            result.pathname = '/comparison.html'
            result.searchParams.set('longnames', JSON.stringify(pageDescriptor.longnames))
            if (pageDescriptor.universe !== null) {
                result.searchParams.set('universe', pageDescriptor.universe)
            }
            break
    }
    return result
}

// Must not throw an error, should return errors as error PageData
//
// Since setting the descriptor causes this function to be called, you'll probably want to avoid infinite loops
async function loadPageDescriptor(descriptor: PageDescriptor): Promise<{ pageData: PageData, newPageDescriptor: PageDescriptor }> {
    switch (descriptor.kind) {
        case 'article':
            const article = await loadProtobuf(data_link(descriptor.longname), 'Article')

            const defaultUniverse = default_article_universe(article.universes)

            const articleUniverse = descriptor.universe !== null && article.universes.includes(descriptor.universe) ? descriptor.universe : defaultUniverse

            const displayUniverse = articleUniverse === defaultUniverse ? null : articleUniverse

            return {
                pageData: {
                    kind: 'article',
                    article,
                    universe: articleUniverse,
                },
                newPageDescriptor: {
                    ...descriptor,
                    universe: displayUniverse,
                },

            }
        case 'comparison':
            const articles = await Promise.all(descriptor.longnames.map(name => loadProtobuf(data_link(name), 'Article')))
            // intersection of all the data.universes
            const articleUniverses = articles.map(x => x.universes)
            const universes = articleUniverses.reduce((a, b) => a.filter(c => b.includes(c)))

            const defaultComparisonUniverse = default_comparison_universe(articleUniverses, universes)

            const comparisonUniverse = descriptor.universe !== null && universes.includes(descriptor.universe) ? descriptor.universe : defaultComparisonUniverse

            const displayComparisonUniverse = comparisonUniverse === defaultComparisonUniverse ? null : comparisonUniverse

            return {
                pageData: {
                    kind: 'comparison',
                    articles,
                    universe: comparisonUniverse,
                    universes,
                },
                newPageDescriptor: {
                    ...descriptor,
                    universe: displayComparisonUniverse,
                },
            }
    }
}

export function Navigator(): ReactNode {
    const [state, setState] = useState<NavigationState>(() => {
        let descriptor: PageDescriptor
        try {
            descriptor = pageDescriptorFromURL(new URL(discordFix(window.location.href)))
        }
        catch (error) {
            return { state: 'notFound', error }
        }
        const url = urlFromPageDescriptor(descriptor) // Since we may want to do a redirect
        // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
        history.replaceState(descriptor, '', url)
        return { state: 'loading', to: { descriptor } }
    })

    useEffect(() => {
        // Load if necessary
        // We should only update the state if our navigation is most recent, to avoid races
        switch (state.state) {
            case 'notFound':
            case 'loaded':
                return
            case 'loading':
                loadPageDescriptor(state.to.descriptor).then(({ pageData, newPageDescriptor }) => {
                    setState((currentState) => {
                        if (currentState.state === 'loading' && currentState.to.descriptor === state.to.descriptor) {
                            // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
                            history.replaceState(newPageDescriptor, '', urlFromPageDescriptor(newPageDescriptor))
                            return { state: 'loaded', descriptor: newPageDescriptor, data: pageData }
                        }
                        return currentState
                    })
                }, (error) => {
                    setState((currentState) => {
                        if (currentState.state === 'loading' && currentState.to.descriptor === state.to.descriptor) {
                            return { state: 'errorLoading', error, from: currentState.from, to: currentState.to }
                        }
                        return currentState
                    })
                })
        }
    }, [state])

    useEffect(() => {
        // Hook into the browser back/forward buttons
        const listener = (popStateEvent: PopStateEvent): void => {
            setState(currentState => ({ state: 'loading', from: toFromField(currentState), to: { descriptor: popStateEvent.state as PageDescriptor } }))
        }
        window.addEventListener('popstate', listener)
        return () => { window.removeEventListener('popstate', listener) }
    }, [])

    const navContext = useMemo<NavigationContext>(() => {
        return {
            navigate(newDescriptor, kind) {
                setState((currentState) => {
                    const from = toFromField(currentState)
                    switch (kind) {
                        case 'push':
                            // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
                            history.pushState(newDescriptor, '', urlFromPageDescriptor(newDescriptor))
                            break
                        case 'replace':
                            // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
                            history.replaceState(newDescriptor, '', urlFromPageDescriptor(newDescriptor))
                            break
                    }
                    return { state: 'loading', from, to: { descriptor: newDescriptor } }
                })
            },
        }
    }, [])

    switch (state.state) {
        case 'notFound':
            return <ErrorScreen error="Not Found" />
        case 'loading':
            return (
                <navigationContext.Provider value={navContext}>
                    {state.from !== undefined ? <PageRouter pageData={state.from.data} /> : null}
                    <LoadingScreen />
                </navigationContext.Provider>
            )
        case 'loaded':
            return (
                <navigationContext.Provider value={navContext}>
                    <PageRouter pageData={state.data} />
                </navigationContext.Provider>
            )
        case 'loading':
            return <LoadingScreen />
        case 'errorLoading':
            return (
                <navigationContext.Provider value={navContext}>
                    {state.from !== undefined ? <PageRouter pageData={state.from.data} /> : null}
                    <ErrorScreen error={state.error} />
                </navigationContext.Provider>
            )
    }
}

function LoadingScreen(): ReactNode {
    return (
        <h1>
            Loading...
        </h1>
    )
}

function ErrorScreen({ error }: { error: unknown }): ReactNode {
    return (
        <h1>
            Error:
            {String(error)}
        </h1>
    )
}

interface NavigationContext {
    navigate: (pageDescriptor: PageDescriptor, kind: 'replace' | 'push') => void
}

export const navigationContext = createContext<NavigationContext | undefined>(undefined)

function PageRouter({ pageData }: { pageData: PageData }): ReactNode {
    switch (pageData.kind) {
        case 'article':
            return (
                <UNIVERSE_CONTEXT.Provider value={pageData.universe}>
                    <ArticlePanel article={pageData.article} />
                </UNIVERSE_CONTEXT.Provider>
            )
        case 'comparison':
            return (
                <UNIVERSE_CONTEXT.Provider value={pageData.universe}>
                    <ComparisonPanel articles={pageData.articles} universes={pageData.universes} />
                </UNIVERSE_CONTEXT.Provider>
            )
    }
}
