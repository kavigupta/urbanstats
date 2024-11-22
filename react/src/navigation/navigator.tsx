import React, { createContext, DependencyList, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ArticlePanel } from '../components/article-panel'
import { UNIVERSE_CONTEXT } from '../universe'
import { Article } from '../utils/protos'

export type PageDescriptor = { kind: 'error', error: Error } | { kind: 'article', longname: string, settings?: string } | { kind: 'comparison', longnames: string[], settings?: string }

function pageDescriptorFromURL(url: URL): PageDescriptor {
    switch (url.pathname) {
        case '/article.html':
            const longname = url.searchParams.get('longname')
            if (longname === null) {
                throw new Error('missing param longname')
            }
            return { kind: 'article', longname }
        default:
            return { kind: 'error', error: new Error('404 not found') }
    }
}

function urlFromPageDescriptor(pageDescriptor: PageDescriptor): URL {
    const result = new URL(window.location.origin)
    result.hash = window.location.hash
    switch (pageDescriptor.kind) {
        case 'article':
            result.pathname = '/article.html'
            result.searchParams.set('longname', pageDescriptor.longname)
            if (pageDescriptor.settings !== undefined) {
                result.searchParams.set('s', pageDescriptor.settings)
            }
            break
        default:
            throw new Error('not implemented')
    }
    return result
}

// Must not throw an error, should return errors as error PageData
async function loadPageDescriptor(descriptor: PageDescriptor): Promise<{ data: PageData, updatedDescriptor: PageDescriptor }> {
    try {
        throw new Error('not implemented')
    }
    catch (error) {
        return { data: { kind: 'error', error }, updatedDescriptor: descriptor }
    }
}

type PageData = { kind: 'article', article: Article, universe: string } | { kind: 'error', error: unknown }

export function Navigator(): ReactNode {
    const [descriptor, setDescriptor] = useState<PageDescriptor>(() => {
        const result = pageDescriptorFromURL(new URL(window.location.href))
        const url = urlFromPageDescriptor(result) // Since we may want to do a redirect
        history.replaceState(result, '', url)
        return result
    })

    useEffect(() => {
        const listener = (state: PopStateEvent): void => {
            setDescriptor(state.state as PageDescriptor)
        }
        window.addEventListener('popstate', listener)
        return () => { window.removeEventListener('popstate', listener) }
    }, [])

    const state = useAsyncLoad<PageData>(async () => {
        return await loadPageDescriptor(descriptor)
    }, [descriptor])

    const navContext = useMemo<NavigationContext>(() => {
        return {
            navigate(newDescriptor, kind) {
                switch (kind) {
                    case 'push':
                        history.pushState(newDescriptor, '', urlFromPageDescriptor(newDescriptor))
                        break
                    case 'replace':
                        history.replaceState(newDescriptor, '', urlFromPageDescriptor(newDescriptor))
                        break
                }
                setDescriptor(newDescriptor)
            },
        }
    }, [])

    switch (state.state) {
        case 'loaded':
        case 'transitioning':
            return (
                <navigationContext.Provider value={navContext}>
                    <PageRouter pageData={state.thing} />
                </navigationContext.Provider>
            )
        case 'loading':
            return <LoadingScreen />
    }
}

type AsyncLoadState<T> = { state: 'loading' } | { state: 'loaded', thing: T } | { state: 'transitioning', thing: T }

function useAsyncLoad<T>(loadThing: () => Promise<T>, deps: DependencyList): AsyncLoadState<T> {
    const [state, setState] = useState<AsyncLoadState<T>>({ state: 'loading' })
    const loadIteration = useRef(0)

    if (useCallback(loadThing, deps) === loadThing) {
        if (state.state === 'loaded') {
            setState({ state: 'transitioning', thing: state.thing })
        }
        // Deps have changed, so we should load the thing
        loadIteration.current++
        const thisIteration = loadIteration.current
        loadThing().then((newThing) => {
            if (loadIteration.current === thisIteration) {
                // want to avoid loading races
                setState({ state: 'loaded', thing: newThing })
            }
        }).catch(() => { throw new Error('Async loader should not throw errors') })
    }

    return state
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
        case 'error':
            return <ErrorScreen error={pageData.error} />
    }
}
