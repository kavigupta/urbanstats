import { gunzipSync } from 'zlib'

import React, { createContext, useEffect, useState } from 'react'
import { z } from 'zod'

import { applySettingsParam, settingsConnectionConfig } from '../components/QuerySettingsConnection'
import { ArticleRow, forType, loadArticles } from '../components/load-article'
import type { StatisticPanelProps } from '../components/statistic-panel'
import explanation_pages from '../data/explanation_page'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list' // TODO: Maybe dynamically import these
import paths from '../data/statistic_path_list'
import { discordFix } from '../discord-fix'
import { loadOrdering, loadOrderingProtobuf, loadJSON, loadProtobuf } from '../load_json'
import { defaultSettings, MapSettings } from '../mapper/settings'
import { Settings } from '../page_template/settings'
import { getVector } from '../page_template/settings-vector'
import { StatGroupSettings } from '../page_template/statistic-settings'
import { StatName, StatPath } from '../page_template/statistic-tree'
import { getDailyOffsetNumber, getRetrostatOffsetNumber } from '../quiz/dates'
import { CustomQuizContent, JuxtaQuestionJSON, loadJuxta, loadRetro, QuizDescriptor, QuizQuestion, RetroQuestionJSON } from '../quiz/quiz'
import { defaultArticleUniverse, defaultComparisonUniverse } from '../universe'
import { Article, IDataList } from '../utils/protos'
import { followSymlink, followSymlinks } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'
import { base64Gunzip } from '../utils/urlParamShort'

import { dataLink } from './links'
import { byPopulation, uniform } from './random'

const articleSchema = z.object({
    longname: z.string().transform(followSymlink),
    universe: z.optional(z.string()),
    s: z.optional(z.string()),
})

const articleSchemaFromParams = z.object({
    longname: z.string().transform(followSymlink),
    universe: z.optional(z.string()),
    s: z.optional(z.string()),
})

const comparisonSchema = z.object({
    longnames: z.array(z.string()),
    universe: z.optional(z.string()),
    s: z.optional(z.string()),
})

const comparisonSchemaFromParams = z.object({
    longnames: z.string().transform(value => z.array(z.string()).parse(JSON.parse(value))).transform(followSymlinks),
    universe: z.optional(z.string()),
    s: z.optional(z.string()),
})

const statisticSchema = z.object({
    article_type: z.string(),
    statname: z.string() as z.ZodType<StatName, z.ZodTypeDef, StatName>,
    start: z.number().int(),
    amount: z.union([z.literal('All'), z.number().int()]),
    order: z.union([z.literal('descending'), z.literal('ascending')]),
    highlight: z.optional(z.string()),
    universe: z.optional(z.string()),
})

const statisticSchemaFromParams = z.object({
    article_type: z.string(),
    statname: z.string().transform(s => s.replaceAll('__PCT__', '%') as StatName),
    start: z.optional(z.coerce.number().int()).default(1),
    amount: z.union([z.literal('All'), z.coerce.number().int(), z.undefined().transform(() => 10)]),
    order: z.union([z.undefined().transform(() => 'descending' as const), z.literal('descending'), z.literal('ascending')]),
    highlight: z.optional(z.string()),
    universe: z.optional(z.string()),
})

const randomSchema = z.object({
    sampleby: z.union([z.literal('uniform'), z.literal('population')]),
    us_only: z.boolean(),
})

const randomSchemaForParams = z.object({
    sampleby: z.union([z.literal('uniform'), z.literal('population'), z.undefined().transform(() => 'uniform' as const)]),
    us_only: z.union([z.literal('true').transform(() => true), z.literal('false').transform(() => false), z.undefined().transform(() => false)]),
})

const quizSchema = z.object({
    mode: z.union([z.undefined(), z.literal('retro'), z.literal('custom')]),
    date: z.optional(z.coerce.number().int()),
    quizContent: z.optional(z.string()),
})

const mapperSchema = z.object({
    settings: z.optional(z.string()),
    view: z.boolean(),
})

const mapperSchemaForParams = z.object({
    settings: z.optional(z.string()),
    view: z.union([z.undefined().transform(() => false), z.literal('true').transform(() => true), z.literal('false').transform(() => false)]),
})

const pageDescriptorSchema = z.union([
    z.object({ kind: z.literal('article') }).and(articleSchema),
    z.object({ kind: z.literal('comparison') }).and(comparisonSchema),
    z.object({ kind: z.literal('statistic') }).and(statisticSchema),
    z.object({ kind: z.literal('random') }).and(randomSchema),
    z.object({ kind: z.literal('index') }),
    z.object({ kind: z.literal('about') }),
    z.object({ kind: z.literal('dataCredit'), hash: z.string() }),
    z.object({ kind: z.literal('quiz') }).and(quizSchema),
    z.object({ kind: z.literal('mapper') }).and(mapperSchema),
])

const historyStateSchema = z.object({
    pageDescriptor: pageDescriptorSchema,
    scrollPosition: z.number(),
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Ensures that history does not have effects. (aka that stored history state will be able to be parsed)
((typeCheck: z.ZodType<HistoryState, z.ZodTypeDef, HistoryState>): void => undefined)(historyStateSchema)

type HistoryState = z.infer<typeof historyStateSchema>

window.history.scrollRestoration = 'manual'
const history = window.history as {
    replaceState: (data: HistoryState, unused: string, url?: string | URL | null) => void
    pushState: (data: HistoryState, unused: string, url?: string | URL | null) => void
    state: HistoryState
    forward: () => void
    back: () => void
}

export type PageDescriptor = z.infer<typeof pageDescriptorSchema>
type ExceptionalPageDescriptor = PageDescriptor
    | { kind: 'initialLoad', url: URL }
    | { kind: 'error', url: URL }

export type PageData =
    { kind: 'article', article: Article, universe: string, rows: (settings: StatGroupSettings) => ArticleRow[][], statPaths: StatPath[][] }
    | { kind: 'comparison', articles: Article[], universe: string, universes: string[], rows: (settings: StatGroupSettings) => ArticleRow[][], statPaths: StatPath[][] }
    | { kind: 'statistic', universe: string } & StatisticPanelProps
    | { kind: 'index' }
    | { kind: 'about' }
    | { kind: 'dataCredit' }
    | { kind: 'quiz', quizDescriptor: QuizDescriptor, quiz: QuizQuestion[], parameters: string, todayName: string }
    | { kind: 'mapper', settings: MapSettings, view: boolean }
    | {
        kind: 'error'
        error: unknown
        url: URL
        descriptor?: PageDescriptor // If descriptor is not present, we could not parse it
    }
    | { kind: 'initialLoad' }

function pageDescriptorFromURL(url: URL): PageDescriptor {
    /**
     * Remember: When adding a new entrypoint here, you'll also need to add the actual file in `build.py` in order to support initial navigation.
     */
    const params = Object.fromEntries(url.searchParams.entries())
    switch (url.pathname) {
        case '/article.html':
            return { kind: 'article', ...articleSchemaFromParams.parse(params) }
        case '/comparison.html':
            return { kind: 'comparison', ...comparisonSchemaFromParams.parse(params) }
        case '/statistic.html':
            return { kind: 'statistic', ...statisticSchemaFromParams.parse(params) }
        case '/random.html':
            return { kind: 'random', ...randomSchemaForParams.parse(params) }
        case '/':
        case '':
        case '/index.html':
            return { kind: 'index' }
        case '/quiz.html':
            const hashParams = Object.fromEntries(new URLSearchParams(url.hash.slice(1)).entries())
            return { kind: 'quiz', ...quizSchema.parse({ ...params, ...hashParams }) }
        case '/mapper.html':
            return { kind: 'mapper', ...mapperSchemaForParams.parse(params) }
        case '/about.html':
            return { kind: 'about' }
        case '/data-credit.html':
            return { kind: 'dataCredit', hash: url.hash }
        default:
            throw new Error('404 not found')
    }
}

export function urlFromPageDescriptor(pageDescriptor: ExceptionalPageDescriptor): URL {
    let pathname: string
    let searchParams: Record<string, string | undefined>
    let hash = ''
    switch (pageDescriptor.kind) {
        case 'article':
            pathname = '/article.html'
            searchParams = {
                longname: pageDescriptor.longname,
                universe: pageDescriptor.universe,
                s: pageDescriptor.s,
            }
            break
        case 'comparison':
            pathname = '/comparison.html'
            searchParams = {
                longnames: JSON.stringify(pageDescriptor.longnames.map(n => n)),
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
            hash = pageDescriptor.hash
            break
        case 'quiz':
            /**
             * We use hash params for quizzes since the juxtastat.org redirect doesn't preserve query params
             */
            // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
            const quizResult = new URL(window.location.origin)
            quizResult.pathname = '/quiz.html'
            const hashParams = new URLSearchParams(Object.entries({
                mode: pageDescriptor.mode,
                date: pageDescriptor.date?.toString(),
                quizContent: pageDescriptor.quizContent,
            }).flatMap(([key, value]) => value !== undefined ? [[key, value]] : []))
            if (hashParams.size > 0) {
                quizResult.hash = `#${hashParams.toString()}`
            }
            return quizResult
        case 'mapper':
            pathname = '/mapper.html'
            searchParams = {
                view: pageDescriptor.view ? 'true' : undefined,
                settings: pageDescriptor.settings,
            }
            break
        case 'initialLoad':
        case 'error':
            return pageDescriptor.url
    }
    // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
    const result = new URL(window.location.origin)
    result.pathname = pathname
    for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined) {
            result.searchParams.set(key, value)
        }
    }
    result.hash = hash
    return result
}

// Should not do side-effects in this function, since it can race with other calls of itself. Instead, return effects in the effects result value
async function loadPageDescriptor(newDescriptor: PageDescriptor, settings: Settings): Promise<{ pageData: PageData, newPageDescriptor: PageDescriptor, effects: () => void }> {
    switch (newDescriptor.kind) {
        case 'article':
            const article = await loadProtobuf(dataLink(newDescriptor.longname), 'Article')

            const defaultUniverse = defaultArticleUniverse(article.universes)

            const articleUniverse = newDescriptor.universe !== undefined && article.universes.includes(newDescriptor.universe) ? newDescriptor.universe : defaultUniverse

            const displayUniverse = articleUniverse === defaultUniverse ? undefined : articleUniverse

            const { rows: articleRows, statPaths: articleStatPaths } = loadArticles([article], articleUniverse)

            return {
                pageData: {
                    kind: 'article',
                    article,
                    universe: articleUniverse,
                    rows: articleRows,
                    statPaths: articleStatPaths,
                },
                newPageDescriptor: {
                    ...newDescriptor,
                    universe: displayUniverse,
                    s: getVector(settings),
                },
                effects() {
                    if (newDescriptor.s !== undefined) {
                        const config = settingsConnectionConfig({ pageKind: 'article', statPaths: articleStatPaths, settings })
                        applySettingsParam(newDescriptor.s, settings, articleStatPaths, config)
                    }
                },
            }
        case 'comparison':
            const articles = await Promise.all(newDescriptor.longnames.map(name => loadProtobuf(dataLink(name), 'Article')))
            // intersection of all the data.universes
            const articleUniverses = articles.map(x => x.universes)
            const universes = articleUniverses.reduce((a, b) => a.filter(c => b.includes(c)))

            const defaultUniverseComparison = defaultComparisonUniverse(articleUniverses, universes)

            const comparisonUniverse = newDescriptor.universe !== undefined && universes.includes(newDescriptor.universe) ? newDescriptor.universe : defaultUniverseComparison

            const displayComparisonUniverse = comparisonUniverse === defaultUniverseComparison ? undefined : comparisonUniverse

            const { rows: comparisonRows, statPaths: comparisonStatPaths } = loadArticles(articles, comparisonUniverse)

            return {
                pageData: {
                    kind: 'comparison',
                    articles,
                    universe: comparisonUniverse,
                    universes,
                    rows: comparisonRows,
                    statPaths: comparisonStatPaths,
                },
                newPageDescriptor: {
                    ...newDescriptor,
                    universe: displayComparisonUniverse,
                    s: getVector(settings),
                },
                effects() {
                    if (newDescriptor.s !== undefined) {
                        const config = settingsConnectionConfig({ pageKind: 'comparison', statPaths: comparisonStatPaths, settings })
                        applySettingsParam(newDescriptor.s, settings, comparisonStatPaths, config)
                    }
                },
            }
        case 'statistic':
            const statUniverse = newDescriptor.universe ?? 'world'
            const displayStatUniverse = statUniverse !== 'world' ? statUniverse : undefined

            const statIndex = names.indexOf(newDescriptor.statname)
            const statpath = paths[statIndex]
            const statcol = stats[statIndex]
            const explanationPage = explanation_pages[statIndex]

            const data = loadOrderingProtobuf(statUniverse, statpath, newDescriptor.article_type, true).then(result => result as NormalizeProto<IDataList>)
            const articleNames = await loadOrdering(statUniverse, statpath, newDescriptor.article_type)

            let parsedAmount: number
            if (newDescriptor.amount === 'All') {
                parsedAmount = articleNames.length
            }
            else {
                parsedAmount = newDescriptor.amount
            }

            return {
                pageData: {
                    kind: 'statistic',
                    statcol,
                    statname: newDescriptor.statname,
                    count: forType(statUniverse, statcol, newDescriptor.article_type),
                    explanationPage,
                    order: newDescriptor.order,
                    highlight: newDescriptor.highlight ?? undefined,
                    articleType: newDescriptor.article_type,
                    joinedString: statpath,
                    start: newDescriptor.start,
                    amount: parsedAmount,
                    articleNames,
                    data: await data,
                    renderedStatname: newDescriptor.statname,
                    universe: statUniverse,

                },
                newPageDescriptor: {
                    ...newDescriptor,
                    universe: displayStatUniverse,
                    highlight: undefined,
                },
                effects: () => undefined,
            }
        case 'random':
            let longname: string
            switch (newDescriptor.sampleby) {
                case 'uniform':
                    longname = await uniform()
                    break
                case 'population':
                    longname = await byPopulation(newDescriptor.us_only)
                    break
            }

            return await loadPageDescriptor({
                kind: 'article',
                longname,
            }, settings)

        case 'index':
        case 'about':
        case 'dataCredit':
            return { pageData: newDescriptor, newPageDescriptor: newDescriptor, effects: () => undefined }
        case 'quiz':
            let quiz: QuizQuestion[]
            let quizDescriptor: QuizDescriptor
            let todayName: string
            switch (newDescriptor.mode) {
                case 'custom':
                    const custom = JSON.parse(base64Gunzip(newDescriptor.quizContent ?? '')) as CustomQuizContent
                    quizDescriptor = {
                        kind: 'custom',
                        name: custom.name,
                    }
                    quiz = custom.questions
                    todayName = custom.name
                    break
                case 'retro':
                    const retro = newDescriptor.date ?? getRetrostatOffsetNumber()
                    quizDescriptor = {
                        kind: 'retrostat',
                        name: `W${retro}`,
                    }
                    quiz = (await loadJSON(`/retrostat/${retro}`) as RetroQuestionJSON[]).map(loadRetro)
                    todayName = `Week ${retro}`
                    break
                case undefined:
                    const today = newDescriptor.date ?? getDailyOffsetNumber()
                    quizDescriptor = { kind: 'juxtastat', name: today }
                    quiz = (await loadJSON(`/quiz/${today}`) as JuxtaQuestionJSON[]).map(loadJuxta)
                    todayName = today.toString()
            }
            return {
                pageData: {
                    kind: 'quiz',
                    quizDescriptor,
                    quiz,
                    parameters: urlFromPageDescriptor(newDescriptor).searchParams.toString(),
                    todayName,
                },
                newPageDescriptor: newDescriptor,
                effects: () => undefined,
            }
        case 'mapper':
            return {
                pageData: {
                    kind: 'mapper',
                    view: newDescriptor.view,
                    settings: mapSettingsFromURLParam(newDescriptor.settings),
                },
                newPageDescriptor: newDescriptor,
                effects: () => undefined,
            }
    }
}

type PageState = { kind: 'loading', loading: { descriptor: PageDescriptor }, current: { data: PageData, descriptor: ExceptionalPageDescriptor }, loadStartTime: number }
    | { kind: 'loaded', current: { data: PageData, descriptor: ExceptionalPageDescriptor } }

type SubsequentLoadingState = { kind: 'notLoading', updateAt: undefined } | { kind: 'quickLoad', updateAt: number } | { kind: 'longLoad', updateAt: undefined }

function loadingStateFromPageState(pageState: PageState): SubsequentLoadingState {
    if (pageState.kind === 'loaded' || pageState.current.data.kind === 'initialLoad') {
        return { kind: 'notLoading', updateAt: undefined }
    }

    const quickThresholdDuration = (window as { testQuickNavigationDuration?: number }).testQuickNavigationDuration ?? 2000
    return Date.now() - pageState.loadStartTime >= quickThresholdDuration ? { kind: 'longLoad', updateAt: undefined } : { kind: 'quickLoad', updateAt: pageState.loadStartTime + quickThresholdDuration }
}

export interface NavigationOptions {
    history: 'push' | 'replace' | null // What should we do with this browser history? `null` means nothing, usually you want 'push' or 'replace'
    scroll: number | null // Where should we scroll to after the navigation? `null` maintains the current scroll position, a number scrolls to that position (0 for top of page). If you're navigating to a hash, passing `null` means we'll scroll to the hash anchor
}

export class Navigator {
    /* eslint-disable react-hooks/rules-of-hooks, no-restricted-syntax -- This is a logic class with custom hooks and core navigation functions */
    static Context = createContext(new Navigator())

    private pageState: PageState
    private pageStateObservers = new Set<() => void>()

    // Read by the router to apply React effects on rerender
    // Using this wierd communication with react allows for smooth rendering, as opposed to setting a timeout sometime after the react render
    effects: (() => void)[] = []

    constructor() {
        try {
            const url = new URL(discordFix(window.location.href))
            this.pageState = {
                kind: 'loading',
                loading: { descriptor: pageDescriptorFromURL(url) },
                current: { descriptor: { kind: 'initialLoad', url }, data: { kind: 'initialLoad' } },
                loadStartTime: Date.now(),
            }
            void this.navigate(this.pageState.loading.descriptor, { history: 'replace', scroll: null })
        }
        catch (error) {
            const url = new URL(window.location.href)
            this.pageState = {
                kind: 'loaded',
                current: {
                    descriptor: { kind: 'error', url },
                    data: { kind: 'error', url, error },
                },
            }
        }
        window.addEventListener('hashchange', () => {
            void this.navigate(pageDescriptorFromURL(new URL(discordFix(window.location.href))), { history: 'replace', scroll: null })
        })
        window.addEventListener('popstate', (popStateEvent: PopStateEvent): void => {
            if (popStateEvent.state === null) {
                // When we use window.location.replace for hashes
                return
            }
            const parseResult = historyStateSchema.safeParse(popStateEvent.state)
            if (parseResult.success) {
                void this.navigate(parseResult.data.pageDescriptor, {
                    history: null,
                    scroll: parseResult.data.scrollPosition,
                })
            }
            else {
                console.warn(`Failed to parse history state! ${parseResult.error}`)
                location.reload()
            }
        })
        window.addEventListener('scroll', () => {
            history.replaceState({ ...history.state, scrollPosition: window.scrollY }, '')
        })

        /*
         * Don't have the patience to debug #728 https://github.com/kavigupta/urbanstats/issues/728
         * So let's try a hack.
         */
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.pageState.kind === 'loading') {
                console.warn('focused during loading, navigating again')
                void this.navigate(this.pageState.loading.descriptor, { history: null, scroll: null })
            }
        })
    }

    async navigate(newDescriptor: PageDescriptor, options: NavigationOptions): Promise<void> {
        this.effects = [] // If we're starting another navigation, don't use previous effects

        switch (options.history) {
            case 'push':
                history.pushState({ pageDescriptor: newDescriptor, scrollPosition: options.scroll ?? window.scrollY }, '', urlFromPageDescriptor(newDescriptor))
                break
            case 'replace':
                history.replaceState({ pageDescriptor: newDescriptor, scrollPosition: options.scroll ?? window.scrollY }, '', urlFromPageDescriptor(newDescriptor))
                break
            case null:
                break
        }

        this.pageState = { kind: 'loading', loading: { descriptor: newDescriptor }, current: this.pageState.current, loadStartTime: Date.now() }
        this.pageStateObservers.forEach((observer) => { observer() })
        try {
            const { pageData, newPageDescriptor, effects } = await loadPageDescriptor(newDescriptor, Settings.shared)
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Async function, pageState can change during await
            if (this.pageState.kind !== 'loading' || this.pageState.loading.descriptor !== newDescriptor) {
                // Another load has started, don't race it
                return
            }
            const url = urlFromPageDescriptor(newPageDescriptor)
            history.replaceState({ pageDescriptor: newPageDescriptor, scrollPosition: options.scroll ?? window.scrollY }, '', url)
            this.pageState = { kind: 'loaded', current: { data: pageData, descriptor: newPageDescriptor } }
            this.pageStateObservers.forEach((observer) => { observer() })

            this.effects.push(effects)

            // On successful navigate

            // If we're going to a page that doesn't use a settings param, exit staging mode if we're in it
            if (!['article', 'comparison'].includes(this.pageState.current.descriptor.kind) && Settings.shared.getStagedKeys() !== undefined) {
                Settings.shared.exitStagedMode('discard')
            }

            // Jump to
            if (options.scroll !== null) {
                // higher priority than hash because we're going back to a page that might have a hash, and we don't want the hash to override the saved scroll position
                this.effects.push(() => { window.scrollTo({ top: options.scroll! }) })
            }
            else if (url.hash !== '') {
                this.effects.push(() => {
                    let nextScrollEventIsSeek = false

                    const scrollObserver = (): void => {
                        if (!nextScrollEventIsSeek) {
                            destroyObservers()
                        }
                        else {
                            nextScrollEventIsSeek = false
                        }
                    }

                    // Keep track of the state where we're seeking so we don't keep trying to seek on another page
                    const seekedState = this.pageState

                    const resizeObserver = new ResizeObserver(() => {
                        if (this.pageState === seekedState) {
                            seekToHash()
                        }
                        else {
                            destroyObservers()
                        }
                    })

                    const destroyObservers = (): void => {
                        resizeObserver.unobserve(document.body)
                        window.removeEventListener('scroll', scrollObserver)
                    }

                    const seekToHash = (): void => {
                        const element = document.getElementById(url.hash.substring(1))
                        if (element !== null) {
                            const position = element.getBoundingClientRect().top + window.scrollY
                            if (Math.round(position) !== Math.round(window.scrollY)) {
                                nextScrollEventIsSeek = true
                                window.scrollTo(0, position)
                            }
                        }
                    }

                    // If the body height changes, and the user hasn't scrolled yet, this means something (e.g. fonts) have loaded and our hash seek isn't correct.
                    resizeObserver.observe(document.body)
                    // Scrolling from the user should cancel the hash lock, but not scrolling because we've seeked to the hash
                    window.addEventListener('scroll', scrollObserver)

                    seekToHash()
                })
            }
        }
        catch (error) {
            if (this.pageState.kind !== 'loading' || this.pageState.loading.descriptor !== newDescriptor) {
                // Another load has started, don't race it
                return
            }
            this.pageState = {
                kind: 'loaded',
                current: {
                    descriptor: { kind: 'error', url: urlFromPageDescriptor(newDescriptor) },
                    data: { kind: 'error', error, descriptor: newDescriptor, url: urlFromPageDescriptor(newDescriptor) },
                } }
            this.pageStateObservers.forEach((observer) => { observer() })
        }
    }

    link(pageDescriptor: PageDescriptor, options: {
        scroll: NavigationOptions['scroll']
        postNavigationCallback?: () => void
    }): { href: string, onClick: (e?: React.MouseEvent) => Promise<void> } {
        const url = urlFromPageDescriptor(pageDescriptor)
        return {
            href: url.pathname + url.search,
            onClick: async (e?: React.MouseEvent) => {
                if (e?.altKey || e?.ctrlKey || e?.metaKey || e?.shiftKey) {
                    // Some sort of shortcut to open in new tab, etc.
                    return
                }
                e?.preventDefault()
                await this.navigate(pageDescriptor, {
                    history: 'push',
                    scroll: options.scroll,
                })
                options.postNavigationCallback?.()
            },
        }
    }

    usePageState(): PageState {
        const [result, setResult] = useState(this.pageState)

        useEffect(() => {
            const observer = (): void => {
                setResult(this.pageState)
            }
            this.pageStateObservers.add(observer)
            return () => { this.pageStateObservers.delete(observer) }
        }, [])

        return result
    }

    get universe(): string | undefined {
        const data = this.pageState.current.data
        switch (data.kind) {
            case 'article':
            case 'comparison':
            case 'statistic':
                return data.universe
            default:
                return undefined
        }
    }

    useUniverse(): string | undefined {
        const [universe, setUniverse] = useState(this.universe)

        useEffect(() => {
            const observer = (): void => {
                setUniverse(this.universe)
            }
            this.pageStateObservers.add(observer)
            return () => { this.pageStateObservers.delete(observer) }
        }, [])

        return universe
    }

    setUniverse(newUniverse: string): void {
        switch (this.pageState.current.descriptor.kind) {
            case 'article':
            case 'comparison':
            case 'statistic':
                void this.navigate({
                    ...this.pageState.current.descriptor,
                    universe: newUniverse,
                }, {
                    history: 'push',
                    scroll: null,
                })
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageState.current.descriptor.kind} does not have a universe`)
        }
    }

    private get statPaths(): StatPath[][] | undefined {
        switch (this.pageState.current.data.kind) {
            case 'article':
            case 'comparison':
                return this.pageState.current.data.statPaths
            default:
                return undefined
        }
    }

    useStatPathsAll(): StatPath[][] | undefined {
        const [statPaths, setStatPaths] = useState(this.statPaths)

        useEffect(() => {
            const observer = (): void => {
                setStatPaths(this.statPaths)
            }
            this.pageStateObservers.add(observer)
            return () => { this.pageStateObservers.delete(observer) }
        }, [])

        return statPaths
    }

    setSettingsVector(newVector: string): void {
        switch (this.pageState.current.descriptor.kind) {
            case 'article':
            case 'comparison':
                this.pageState.current.descriptor.s = newVector
                history.replaceState({ pageDescriptor: this.pageState.current.descriptor, scrollPosition: window.scrollY }, '', urlFromPageDescriptor(this.pageState.current.descriptor))
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageState.current.descriptor.kind} does not have a settings vector`)
        }
    }

    setMapperSettings(newSettings: string): void {
        switch (this.pageState.current.descriptor.kind) {
            case 'mapper':
                this.pageState.current.descriptor.settings = newSettings
                history.replaceState({ pageDescriptor: this.pageState.current.descriptor, scrollPosition: window.scrollY }, '', urlFromPageDescriptor(this.pageState.current.descriptor))
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageState.current.descriptor.kind} does not have mapper settings`)
        }
    }

    useSubsequentLoading(): SubsequentLoadingState['kind'] {
        const [loading, setLoading] = useState(loadingStateFromPageState(this.pageState))

        useEffect(() => {
            const observer = (): void => {
                setLoading(loadingStateFromPageState(this.pageState))
            }
            this.pageStateObservers.add(observer)
            return () => { this.pageStateObservers.delete(observer) }
        }, [])

        useEffect(() => {
            if (loading.updateAt !== undefined) {
                const timeout = setTimeout(() => {
                    setLoading(loadingStateFromPageState(this.pageState))
                }, loading.updateAt - Date.now())
                return () => { clearTimeout(timeout) }
            }
            else {
                return undefined
            }
        }, [loading.updateAt])

        return loading.kind
    }
    /* eslint-enable react-hooks/rules-of-hooks, no-restricted-syntax */
}

function mapSettingsFromURLParam(encodedSettings: string | undefined): MapSettings {
    let settings: Partial<MapSettings> = {}
    if (encodedSettings !== undefined) {
        const jsonedSettings = gunzipSync(Buffer.from(encodedSettings, 'base64')).toString()
        settings = JSON.parse(jsonedSettings) as Partial<MapSettings>
    }
    return defaultSettings(settings)
}
