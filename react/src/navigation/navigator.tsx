import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'

import { AboutPanel } from '../components/AboutPanel'
import { DataCreditPanel } from '../components/DataCreditPanel'
import { IndexPanel } from '../components/IndexPanel'
import { ArticlePanel } from '../components/article-panel'
import { ComparisonPanel } from '../components/comparison-panel'
import { for_type } from '../components/load-article'
import { MapperPanel, mapSettingsFromURLParam } from '../components/mapper-panel'
import { QuizPanel } from '../components/quiz-panel'
import { StatisticPanel, StatisticPanelProps } from '../components/statistic-panel'
import explanation_pages from '../data/explanation_page'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list' // TODO: Maybe dynamically import these
import paths from '../data/statistic_path_list'
import { discordFix } from '../discord-fix'
import { load_ordering, load_ordering_protobuf, loadJSON, loadProtobuf } from '../load_json'
import { MapSettings } from '../mapper/settings'
import { Settings } from '../page_template/settings'
import { StatName } from '../page_template/statistic-tree'
import { get_daily_offset_number, get_retrostat_offset_number } from '../quiz/dates'
import { JuxtaQuestionJSON, load_juxta, load_retro, QuizDescriptor, QuizQuestion, RetroQuestionJSON } from '../quiz/quiz'
import { default_article_universe, default_comparison_universe } from '../universe'
import { Article, IDataList } from '../utils/protos'
import { followSymlink, followSymlinks } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'

import { data_link, sanitize } from './links'
import { by_population, uniform } from './random'

const articleSchema = z.object({
    longname: z.string().transform(followSymlink),
    universe: z.optional(z.string()),
    s: z.optional(z.string()),
})

const comparisonSchema = z.object({
    longnames: z.preprocess(value => JSON.parse(value as string), z.array(z.string())).transform(followSymlinks),
    universe: z.optional(z.string()),
    s: z.optional(z.string()),
})

const statisticSchema = z.object({
    article_type: z.string(),
    statname: z.string().transform(s => s.replaceAll('__PCT__', '%') as StatName),
    start: z.optional(z.string()).transform(s => parseInt(s ?? '1')),
    amount: z.union([z.literal('All'), z.string().transform(s => parseInt(s)), z.undefined().transform(() => 10)]),
    order: z.union([z.undefined().transform(() => 'descending' as const), z.literal('descending'), z.literal('ascending')]),
    highlight: z.optional(z.string()),
    universe: z.optional(z.string()),
})

const randomSchema = z.object({
    sampleby: z.union([z.literal('uniform'), z.literal('population'), z.undefined().transform(() => 'uniform' as const)]),
    us_only: z.union([z.literal('true').transform(() => true), z.literal('false').transform(() => false), z.undefined().transform(() => false)]),
})

const quizSchema = z.object({
    mode: z.union([z.undefined(), z.literal('retro')]),
    date: z.optional(z.number().int()),
})

const mapperSchema = z.object({
    settings: z.optional(z.string()),
    view: z.union([z.undefined().transform(() => false), z.literal('true').transform(() => true), z.literal('false').transform(() => false)]),
})

export type PageDescriptor = ({ kind: 'article' } & z.infer<typeof articleSchema>)
    | ({ kind: 'comparison' } & z.infer<typeof comparisonSchema>)
    | ({ kind: 'statistic' } & z.infer<typeof statisticSchema>)
    | ({ kind: 'random' } & z.infer<typeof randomSchema>)
    | { kind: 'index' }
    | { kind: 'about' }
    | { kind: 'dataCredit' }
    | ({ kind: 'quiz' } & z.infer<typeof quizSchema>)
    | ({ kind: 'mapper' } & z.infer<typeof mapperSchema>)

type PageData =
    { kind: 'article', article: Article, universe: string }
    | { kind: 'comparison', articles: Article[], universe: string, universes: string[] }
    | { kind: 'statistic', universe: string } & StatisticPanelProps
    | { kind: 'index' }
    | { kind: 'about' }
    | { kind: 'dataCredit' }
    | { kind: 'quiz', quizDescriptor: QuizDescriptor, quiz: QuizQuestion[], parameters: string, todayName: string }
    | { kind: 'mapper', settings: MapSettings, view: boolean }

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
        case '/quiz.html':
            return { kind: 'quiz', ...quizSchema.parse(params) }
        case '/mapper.html':
            return { kind: 'mapper', ...mapperSchema.parse(params) }
        case '/about.html':
            return { kind: 'about' }
        case '/data-credit.html':
            return { kind: 'dataCredit' }
        default:
            throw new Error('404 not found')
    }
}

// Not a pure function, just modifies the current URL
function urlFromPageDescriptor(pageDescriptor: PageDescriptor): URL {
    let pathname: string
    let searchParams: Record<string, string | undefined>
    switch (pageDescriptor.kind) {
        case 'article':
            pathname = '/article.html'
            searchParams = {
                longname: sanitize(pageDescriptor.longname),
                universe: pageDescriptor.universe,
                s: pageDescriptor.s,
            }
            break
        case 'comparison':
            pathname = '/comparison.html'
            searchParams = {
                longnames: JSON.stringify(pageDescriptor.longnames.map(n => sanitize(n))),
                universe: pageDescriptor.universe,
                s: pageDescriptor.s,
            }
            break
        case 'statistic':
            pathname = '/statistic.html'
            searchParams = {
                statname: pageDescriptor.statname.replaceAll('%', '__PCT__'),
                article_type: pageDescriptor.article_type,
                start: pageDescriptor.start.toString(),
                amount: pageDescriptor.amount.toString(),
                order: pageDescriptor.order === 'descending' ? undefined : 'ascending',
                highlight: pageDescriptor.highlight,
                universe: pageDescriptor.universe,
            }
            break
        case 'random':
            pathname = '/random.html'
            searchParams = {
                sampleby: pageDescriptor.sampleby,
                us_only: pageDescriptor.us_only ? 'true' : undefined,
            }
            break
        case 'index':
            pathname = ''
            searchParams = {}
            break
        case 'about':
            pathname = '/about.html'
            searchParams = {}
            break
        case 'dataCredit':
            pathname = '/data-credit.html'
            searchParams = {}
            break
        case 'quiz':
            pathname = '/quiz.html'
            searchParams = {
                mode: pageDescriptor.mode,
                date: pageDescriptor.date?.toString(),
            }
            break
        case 'mapper':
            pathname = '/mapper.html'
            searchParams = {
                view: pageDescriptor.view ? 'true' : undefined,
                settings: pageDescriptor.settings,
            }
    }
    // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
    const result = new URL(window.location.origin)
    result.pathname = pathname
    for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined) {
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

            const articleUniverse = descriptor.universe !== undefined && article.universes.includes(descriptor.universe) ? descriptor.universe : defaultUniverse

            const displayUniverse = articleUniverse === defaultUniverse ? undefined : articleUniverse

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

            const comparisonUniverse = descriptor.universe !== undefined && universes.includes(descriptor.universe) ? descriptor.universe : defaultComparisonUniverse

            const displayComparisonUniverse = comparisonUniverse === defaultComparisonUniverse ? undefined : comparisonUniverse

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
            const displayStatUniverse = statUniverse !== 'world' ? statUniverse : undefined

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
                    highlight: undefined,
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
            }, settings)

        case 'index':
        case 'about':
        case 'dataCredit':
            return { pageData: descriptor, newPageDescriptor: descriptor }
        case 'quiz':
            let quiz: QuizQuestion[]
            let quizDescriptor: QuizDescriptor
            let todayName: string
            switch (descriptor.mode) {
                case 'retro':
                    const retro = descriptor.date ?? get_retrostat_offset_number()
                    quizDescriptor = {
                        kind: 'retrostat',
                        name: `W${retro}`,
                    }
                    quiz = (await loadJSON(`/retrostat/${retro}`) as RetroQuestionJSON[]).map(load_retro)
                    todayName = `Week ${retro}`
                    break
                case undefined:
                    const today = descriptor.date ?? get_daily_offset_number()
                    quizDescriptor = { kind: 'juxtastat', name: today }
                    quiz = (await loadJSON(`/quiz/${today}`) as JuxtaQuestionJSON[]).map(load_juxta)
                    todayName = today.toString()
            }
            return {
                pageData: {
                    kind: 'quiz',
                    quizDescriptor,
                    quiz,
                    parameters: urlFromPageDescriptor(descriptor).searchParams.toString(),
                    todayName,
                },
                newPageDescriptor: descriptor,
            }
        case 'mapper':
            return {
                pageData: {
                    kind: 'mapper',
                    view: descriptor.view,
                    settings: mapSettingsFromURLParam(descriptor.settings),
                },
                newPageDescriptor: descriptor,
            }
    }
}

export function Navigator(): ReactNode {
    const settings = useContext(Settings.Context)

    const [state, setState] = useState<NavigationState>(() => {
        let descriptor: PageDescriptor
        try {
            // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
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

    const navContext = useMemo<NavigationContextValue>(() => {
        return {
            navigate(newDescriptor, kind, doPageLoad = true) {
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
                    // We only skip page load if we're already in a loaded state, otherwise we can have weird conditions
                    return doPageLoad || currentState.state !== 'loaded'
                        ? { state: 'loading', from, to: { descriptor: newDescriptor } }
                        : { state: 'loaded', descriptor: newDescriptor, data: currentState.data }
                })
            },

            setUniverse(newUniverse) {
                setState((currentState) => {
                    const from = toFromField(currentState)
                    switch (from?.descriptor.kind) {
                        case 'article':
                        case 'comparison':
                        case 'statistic':
                            const newDescriptor = {
                                ...from.descriptor,
                                universe: newUniverse,
                            }
                            // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
                            history.pushState(newDescriptor, '', urlFromPageDescriptor(newDescriptor))
                            return { state: 'loading', from, to: { descriptor: newDescriptor } }
                        default:
                            throw new Error(`switching universe is not supported for page descriptor kind ${from?.descriptor.kind}`)
                    }
                })
            },

            universe: (() => {
                const from = toFromField(state)
                switch (from?.data.kind) {
                    case 'article':
                    case 'comparison':
                    case 'statistic':
                        return from.data.universe
                    default:
                        return undefined
                }
            })(),

            link(pageDescriptor) {
                const url = urlFromPageDescriptor(pageDescriptor)
                return {
                    href: url.pathname + url.search,
                    onClick: (e: React.MouseEvent) => {
                        e.preventDefault()
                        this.navigate(pageDescriptor, 'push')
                    },
                }
            },

            settingsVector: (() => {
                const from = toFromField(state)
                switch (from?.descriptor.kind) {
                    case 'article':
                    case 'comparison':
                        return from.descriptor.s
                    default:
                        return undefined
                }
            })(),

            setSettingsVector(newVector) {
                const from = toFromField(state)
                switch (from?.descriptor.kind) {
                    case 'article':
                    case 'comparison':
                        this.navigate(
                            {
                                ...from.descriptor,
                                s: newVector,
                            },
                            'replace',
                            false,
                        )
                        break
                    default:
                        throw new Error(`setting settings vector is not supported for page descriptor kind ${from?.descriptor.kind}`)
                }
            },
        }
    }, [state])

    switch (state.state) {
        case 'notFound':
            return <ErrorScreen error="Not Found" />
        case 'loading':
            return (
                <NavigationContext.Provider value={navContext}>
                    {state.from !== undefined ? <PageRouter pageData={state.from.data} /> : null}
                    <LoadingScreen />
                </NavigationContext.Provider>
            )
        case 'loaded':
            return (
                <NavigationContext.Provider value={navContext}>
                    <PageRouter pageData={state.data} />
                </NavigationContext.Provider>
            )
        case 'loading':
            return <LoadingScreen />
        case 'errorLoading':
            return (
                <NavigationContext.Provider value={navContext}>
                    {state.from !== undefined ? <PageRouter pageData={state.from.data} /> : null}
                    <ErrorScreen error={state.error} />
                </NavigationContext.Provider>
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

interface NavigationContextValue {
    navigate: (pageDescriptor: PageDescriptor, kind: 'replace' | 'push', doPageLoad?: boolean) => void
    setUniverse: (newUniverse: string) => void
    universe: string | undefined
    link: (pageDescriptor: PageDescriptor) => { href: string, onClick: (e: React.MouseEvent) => void }
    settingsVector: string | undefined
    setSettingsVector: (newVector: string) => void
}

export const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

function PageRouter({ pageData }: { pageData: PageData }): ReactNode {
    switch (pageData.kind) {
        case 'article':
            return (
                <ArticlePanel article={pageData.article} />
            )
        case 'comparison':
            return (
                <ComparisonPanel articles={pageData.articles} universes={pageData.universes} />
            )
        case 'statistic':
            return (
                <StatisticPanel
                    {...pageData}
                />
            )
        case 'index':
            return <IndexPanel />
        case 'about':
            return <AboutPanel />
        case 'dataCredit':
            return <DataCreditPanel />
        case 'quiz':
            return (
                <QuizPanel
                    quizDescriptor={pageData.quizDescriptor}
                    today_name={pageData.todayName}
                    todays_quiz={pageData.quiz}
                    parameters={pageData.parameters}
                />
            )
        case 'mapper':
            return <MapperPanel map_settings={pageData.settings} view={pageData.view} />
    }
}
