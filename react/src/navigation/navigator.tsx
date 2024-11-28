import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

import { IndexPanel } from '../components/IndexPanel'
import { ArticlePanel } from '../components/article-panel'
import { ComparisonPanel } from '../components/comparison-panel'
import { for_type } from '../components/load-article'
import { StatisticPanel, StatisticPanelProps } from '../components/statistic-panel'
import explanation_pages from '../data/explanation_page'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list' // TODO: Maybe dynamically import these
import paths from '../data/statistic_path_list'
import { discordFix } from '../discord-fix'
import { load_ordering, load_ordering_protobuf, loadProtobuf } from '../load_json'
import { Settings } from '../page_template/settings'
import { default_article_universe, default_comparison_universe, UNIVERSE_CONTEXT } from '../universe'
import { Article, IDataList } from '../utils/protos'
import { followSymlink, followSymlinks } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'

import { data_link, sanitize } from './links'
import { by_population, uniform } from './random'

export type StatName = (typeof names)[number]

const articleSchema = z.object({
    longname: z.string().transform(followSymlink),
    universe: z.nullable(z.string()),
})

const comparisonSchema = z.object({
    longnames: z.preprocess(value => JSON.parse(value as string), z.array(z.string())).transform(followSymlinks),
    universe: z.nullable(z.string()),
})

const statisticSchema = z.object({
    article_type: z.string(),
    statname: z.string().transform(s => s.replaceAll('__PCT__', '%') as StatName),
    start: z.nullable(z.string()).transform(s => parseInt(s ?? '1')),
    amount: z.union([z.literal('All'), z.string().transform(s => parseInt(s)), z.null().transform(() => 10)]),
    order: z.union([z.null().transform(() => 'descending' as const), z.literal('descending'), z.literal('ascending')]),
    highlight: z.nullable(z.string()),
    universe: z.nullable(z.string()),
})

const randomSchema = z.object({
    sampleby: z.union([z.literal('uniform'), z.literal('population'), z.null().transform(() => 'uniform' as const)]),
    us_only: z.union([z.literal('true').transform(() => true), z.literal('false').transform(() => false), z.null().transform(() => false)]),
})

export type PageDescriptor = ({ kind: 'article' } & z.infer<typeof articleSchema>)
    | ({ kind: 'comparison' } & z.infer<typeof comparisonSchema>)
    | ({ kind: 'statistic' } & z.infer<typeof statisticSchema>)
    | ({ kind: 'random' } & z.infer<typeof randomSchema>)
    | ({ kind: 'index' })

type PageData =
    { kind: 'article', article: Article, universe: string }
    | { kind: 'comparison', articles: Article[], universe: string, universes: string[] }
    | { kind: 'statistic', universe: string } & StatisticPanelProps
    | { kind: 'index' }

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
    const params = Object.fromEntries(url.searchParams.entries())
    switch (url.pathname) {
        case '/article.html':
            return { kind: 'article', ...articleSchema.parse(params) }
        case '/comparison.html':
            return { kind: 'comparison', ...comparisonSchema.parse(params) }
        case '/statistic.html':
            return { kind: 'statistic', ...statisticSchema.parse(params) }
        case '/random.html':
            return { kind: 'random', ...randomSchema.parse(params) }
        case '/':
        case '':
        case '/index.html':
            return { kind: 'index' }
        default:
            throw new Error('404 not found')
    }
}

// Not a pure function, just modifies the current URL
function urlFromPageDescriptor(pageDescriptor: PageDescriptor): URL {
    let pathname: string
    let searchParams: Record<string, string | null>
    switch (pageDescriptor.kind) {
        case 'article':
            pathname = '/article.html'
            searchParams = {
                longname: sanitize(pageDescriptor.longname),
                universe: pageDescriptor.universe,
            }
            break
        case 'comparison':
            pathname = '/comparison.html'
            searchParams = {
                longnames: JSON.stringify(pageDescriptor.longnames.map(n => sanitize(n))),
                universe: pageDescriptor.universe,
            }
            break
        case 'statistic':
            pathname = '/statistic.html'
            searchParams = {
                statname: pageDescriptor.statname.replaceAll('%', '__PCT__'),
                article_type: pageDescriptor.article_type,
                start: pageDescriptor.start.toString(),
                amount: pageDescriptor.amount.toString(),
                order: pageDescriptor.order === 'descending' ? null : 'ascending',
                highlight: pageDescriptor.highlight,
                universe: pageDescriptor.universe,
            }
            break
        case 'random':
            pathname = '/random.html'
            searchParams = {
                sampleby: pageDescriptor.sampleby,
                us_only: pageDescriptor.us_only ? 'true' : null,
            }
            break
        case 'index':
            pathname = ''
            searchParams = {}
    }
    const result = new URL(window.location.href)
    result.pathname = pathname
    for (const [key, value] of Object.entries(searchParams)) {
        if (value === null) {
            result.searchParams.delete(key)
        }
        else {
            result.searchParams.set(key, value)
        }
    }
    return result
}

async function loadPageDescriptor(descriptor: PageDescriptor, settings: Settings): Promise<{ pageData: PageData, newPageDescriptor: PageDescriptor }> {
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
        case 'statistic':
            const statUniverse = descriptor.universe ?? 'world'
            const displayStatUniverse = statUniverse !== 'world' ? statUniverse : null

            const statIndex = names.indexOf(descriptor.statname)
            const statpath = paths[statIndex]
            const statcol = stats[statIndex]
            const explanation_page = explanation_pages[statIndex]

            const article_names = await load_ordering(statUniverse, statpath, descriptor.article_type)
            const data = await load_ordering_protobuf(statUniverse, statpath, descriptor.article_type, true) as NormalizeProto<IDataList>

            let parsedAmount: number
            if (descriptor.amount === 'All') {
                parsedAmount = article_names.length
            }
            else {
                parsedAmount = descriptor.amount
            }

            return {
                pageData: {
                    kind: 'statistic',
                    statcol,
                    statname: descriptor.statname,
                    count: for_type(statUniverse, statcol, descriptor.article_type),
                    explanation_page,
                    order: descriptor.order,
                    highlight: descriptor.highlight ?? undefined,
                    article_type: descriptor.article_type,
                    joined_string: statpath,
                    start: descriptor.start,
                    amount: parsedAmount,
                    article_names,
                    data,
                    rendered_statname: descriptor.statname,
                    universe: statUniverse,

                },
                newPageDescriptor: {
                    ...descriptor,
                    universe: displayStatUniverse,
                    highlight: null,
                },
            }
        case 'random':
            const settingsValues = settings.getMultiple(['show_historical_cds'])

            let longname: string
            switch (descriptor.sampleby) {
                case 'uniform':
                    longname = await uniform(settingsValues)
                    break
                case 'population':
                    longname = await by_population(settingsValues, descriptor.us_only)
                    break
            }

            return await loadPageDescriptor({
                kind: 'article',
                longname,
                universe: null,
            }, settings)

        case 'index':
            return { pageData: { kind: 'index' }, newPageDescriptor: { kind: 'index' } }
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

    const settings = useContext(Settings.Context)

    useEffect(() => {
        // Load if necessary
        // We should only update the state if our navigation is most recent, to avoid races
        switch (state.state) {
            case 'notFound':
            case 'loaded':
                return
            case 'loading':
                loadPageDescriptor(state.to.descriptor, settings).then(({ pageData, newPageDescriptor }) => {
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
    }, [state, settings])

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
        case 'statistic':
            return (
                <UNIVERSE_CONTEXT.Provider value={pageData.universe}>
                    <StatisticPanel
                        {...pageData}
                    />
                </UNIVERSE_CONTEXT.Provider>
            )
        case 'index':
            return <IndexPanel />
    }
}
