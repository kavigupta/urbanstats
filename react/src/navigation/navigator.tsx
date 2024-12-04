import { gunzipSync } from 'zlib'

import React, { createContext, useEffect, useState } from 'react'
import { z } from 'zod'

import { applySettingsParam, settingsConnectionConfig } from '../components/QuerySettingsConnection'
import { ArticleRow, for_type, load_articles } from '../components/load-article'
import type { StatisticPanelProps } from '../components/statistic-panel'
import explanation_pages from '../data/explanation_page'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list' // TODO: Maybe dynamically import these
import paths from '../data/statistic_path_list'
import { discordFix } from '../discord-fix'
import { load_ordering, load_ordering_protobuf, loadJSON, loadProtobuf } from '../load_json'
import { default_settings, MapSettings } from '../mapper/settings'
import { Settings } from '../page_template/settings'
import { getVector } from '../page_template/settings-vector'
import { StatGroupSettings } from '../page_template/statistic-settings'
import { StatName, StatPath } from '../page_template/statistic-tree'
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
    start: z.optional(z.coerce.number().int()).default(1),
    amount: z.union([z.literal('All'), z.coerce.number().int(), z.undefined().transform(() => 10)]),
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
    date: z.optional(z.coerce.number().int()),
})

const mapperSchema = z.object({
    settings: z.optional(z.string()),
    view: z.union([z.undefined().transform(() => false), z.literal('true').transform(() => true), z.literal('false').transform(() => false)]),
})

export type PageDescriptor =
    ({ kind: 'article' } & z.infer<typeof articleSchema>)
    | ({ kind: 'comparison' } & z.infer<typeof comparisonSchema>)
    | ({ kind: 'statistic' } & z.infer<typeof statisticSchema>)
    | ({ kind: 'random' } & z.infer<typeof randomSchema>)
    | { kind: 'index' }
    | { kind: 'about' }
    | { kind: 'dataCredit', hash: string }
    | ({ kind: 'quiz' } & z.infer<typeof quizSchema>)
    | ({ kind: 'mapper' } & z.infer<typeof mapperSchema>)
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
            return { kind: 'dataCredit', hash: url.hash }
        default:
            throw new Error('404 not found')
    }
}

export function urlFromPageDescriptor(pageDescriptor: PageDescriptor): URL {
    let pathname: string
    let searchParams: Record<string, string | undefined>
    let hash = ''
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
            hash = pageDescriptor.hash
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

async function loadPageDescriptor(newDescriptor: PageDescriptor, settings: Settings): Promise<{ pageData: PageData, newPageDescriptor: PageDescriptor }> {
    switch (newDescriptor.kind) {
        case 'article':
            const article = await loadProtobuf(data_link(newDescriptor.longname), 'Article')

            const defaultUniverse = default_article_universe(article.universes)

            const articleUniverse = newDescriptor.universe !== undefined && article.universes.includes(newDescriptor.universe) ? newDescriptor.universe : defaultUniverse

            const displayUniverse = articleUniverse === defaultUniverse ? undefined : articleUniverse

            const { rows: articleRows, statPaths: articleStatPaths } = load_articles([article], articleUniverse)

            if (newDescriptor.s !== undefined) {
                const config = settingsConnectionConfig({ pageKind: 'article', statPaths: articleStatPaths, settings })
                applySettingsParam(newDescriptor.s, settings, articleStatPaths, config)
            }

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

            }
        case 'comparison':
            const articles = await Promise.all(newDescriptor.longnames.map(name => loadProtobuf(data_link(name), 'Article')))
            // intersection of all the data.universes
            const articleUniverses = articles.map(x => x.universes)
            const universes = articleUniverses.reduce((a, b) => a.filter(c => b.includes(c)))

            const defaultComparisonUniverse = default_comparison_universe(articleUniverses, universes)

            const comparisonUniverse = newDescriptor.universe !== undefined && universes.includes(newDescriptor.universe) ? newDescriptor.universe : defaultComparisonUniverse

            const displayComparisonUniverse = comparisonUniverse === defaultComparisonUniverse ? undefined : comparisonUniverse

            const { rows: comparisonRows, statPaths: comparisonStatPaths } = load_articles(articles, comparisonUniverse)

            if (newDescriptor.s !== undefined) {
                const config = settingsConnectionConfig({ pageKind: 'comparison', statPaths: comparisonStatPaths, settings })
                applySettingsParam(newDescriptor.s, settings, comparisonStatPaths, config)
            }

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
            }
        case 'statistic':
            const statUniverse = newDescriptor.universe ?? 'world'
            const displayStatUniverse = statUniverse !== 'world' ? statUniverse : undefined

            const statIndex = names.indexOf(newDescriptor.statname)
            const statpath = paths[statIndex]
            const statcol = stats[statIndex]
            const explanation_page = explanation_pages[statIndex]

            const article_names = await load_ordering(statUniverse, statpath, newDescriptor.article_type)
            const data = await load_ordering_protobuf(statUniverse, statpath, newDescriptor.article_type, true) as NormalizeProto<IDataList>

            let parsedAmount: number
            if (newDescriptor.amount === 'All') {
                parsedAmount = article_names.length
            }
            else {
                parsedAmount = newDescriptor.amount
            }

            return {
                pageData: {
                    kind: 'statistic',
                    statcol,
                    statname: newDescriptor.statname,
                    count: for_type(statUniverse, statcol, newDescriptor.article_type),
                    explanation_page,
                    order: newDescriptor.order,
                    highlight: newDescriptor.highlight ?? undefined,
                    article_type: newDescriptor.article_type,
                    joined_string: statpath,
                    start: newDescriptor.start,
                    amount: parsedAmount,
                    article_names,
                    data,
                    rendered_statname: newDescriptor.statname,
                    universe: statUniverse,

                },
                newPageDescriptor: {
                    ...newDescriptor,
                    universe: displayStatUniverse,
                    highlight: undefined,
                },
            }
        case 'random':
            const settingsValues = settings.getMultiple(['show_historical_cds'])

            let longname: string
            switch (newDescriptor.sampleby) {
                case 'uniform':
                    longname = await uniform(settingsValues)
                    break
                case 'population':
                    longname = await by_population(settingsValues, newDescriptor.us_only)
                    break
            }

            return await loadPageDescriptor({
                kind: 'article',
                longname,
            }, settings)

        case 'index':
        case 'about':
        case 'dataCredit':
            return { pageData: newDescriptor, newPageDescriptor: newDescriptor }
        case 'quiz':
            let quiz: QuizQuestion[]
            let quizDescriptor: QuizDescriptor
            let todayName: string
            switch (newDescriptor.mode) {
                case 'retro':
                    const retro = newDescriptor.date ?? get_retrostat_offset_number()
                    quizDescriptor = {
                        kind: 'retrostat',
                        name: `W${retro}`,
                    }
                    quiz = (await loadJSON(`/retrostat/${retro}`) as RetroQuestionJSON[]).map(load_retro)
                    todayName = `Week ${retro}`
                    break
                case undefined:
                    const today = newDescriptor.date ?? get_daily_offset_number()
                    quizDescriptor = { kind: 'juxtastat', name: today }
                    quiz = (await loadJSON(`/quiz/${today}`) as JuxtaQuestionJSON[]).map(load_juxta)
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
            }
        case 'mapper':
            return {
                pageData: {
                    kind: 'mapper',
                    view: newDescriptor.view,
                    settings: mapSettingsFromURLParam(newDescriptor.settings),
                },
                newPageDescriptor: newDescriptor,
            }
        case 'initialLoad':
            throw new Error('cannot navigate to initialLoad')
        case 'error':
            throw new Error('should not attempt to load error descriptor')
    }
}

type PageState = { kind: 'loading', loading: { descriptor: PageDescriptor }, current: { data: PageData, descriptor: PageDescriptor }, loadStartTime: number }
    | { kind: 'loaded', current: { data: PageData, descriptor: PageDescriptor } }

type LoadingState =
    { kind: 'notLoading', started: undefined } |
    { kind: 'initial', started: number } |
    { kind: 'subsequent', started: number }

function loadingStateFromPageState(pageState: PageState): LoadingState {
    if (pageState.kind === 'loaded') {
        return { kind: 'notLoading', started: undefined }
    }
    else if (pageState.current.descriptor.kind === 'initialLoad') {
        return { kind: 'initial', started: pageState.loadStartTime }
    }
    else {
        return { kind: 'subsequent', started: pageState.loadStartTime }
    }
}

export class Navigator {
    /* eslint-disable react-hooks/rules-of-hooks, no-restricted-syntax -- This is a logic class with custom hooks and core navigation functions */
    static Context = createContext(new Navigator())

    private pageState: PageState
    private pageStateObservers = new Set<() => void>()

    constructor() {
        try {
            const url = new URL(discordFix(window.location.href))
            this.pageState = {
                kind: 'loading',
                loading: { descriptor: pageDescriptorFromURL(url) },
                current: { descriptor: { kind: 'initialLoad', url }, data: { kind: 'initialLoad' } },
                loadStartTime: Date.now(),
            }
            void this.navigate(this.pageState.loading.descriptor, 'replace')
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
    }

    async navigate(newDescriptor: PageDescriptor, kind: 'push' | 'replace' | null): Promise<void> {
        switch (kind) {
            case 'push':
                history.pushState(newDescriptor, '', urlFromPageDescriptor(newDescriptor))
                break
            case 'replace':
                history.replaceState(newDescriptor, '', urlFromPageDescriptor(newDescriptor))
                break
            case null:
                break
        }

        this.pageState = { kind: 'loading', loading: { descriptor: newDescriptor }, current: this.pageState.current, loadStartTime: Date.now() }
        this.pageStateObservers.forEach((observer) => { observer() })
        try {
            const { pageData, newPageDescriptor } = await loadPageDescriptor(newDescriptor, Settings.shared)
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Async function, pageState can change during await
            if (this.pageState.kind !== 'loading' || this.pageState.loading.descriptor !== newDescriptor) {
                // Another load has started, don't race it
                return
            }
            history.replaceState(newPageDescriptor, '', urlFromPageDescriptor(newPageDescriptor))
            this.pageState = { kind: 'loaded', current: { data: pageData, descriptor: newPageDescriptor } }
            this.pageStateObservers.forEach((observer) => { observer() })
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

    link(pageDescriptor: PageDescriptor): { href: string, onClick: (e: React.MouseEvent) => void } {
        const url = urlFromPageDescriptor(pageDescriptor)
        return {
            href: url.pathname + url.search,
            onClick: (e: React.MouseEvent) => {
                e.preventDefault()
                void this.navigate(pageDescriptor, 'push')
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
                }, 'push')
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
                history.replaceState(this.pageState.current.descriptor, '', urlFromPageDescriptor(this.pageState.current.descriptor))
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageState.current.descriptor.kind} does not have a settings vector`)
        }
    }

    setMapperSettings(newSettings: string): void {
        switch (this.pageState.current.descriptor.kind) {
            case 'mapper':
                this.pageState.current.descriptor.settings = newSettings
                history.replaceState(this.pageState.current.descriptor, '', urlFromPageDescriptor(this.pageState.current.descriptor))
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageState.current.descriptor.kind} does not have mapper settings`)
        }
    }

    useLoading(): LoadingState {
        const [loading, setLoading] = useState(loadingStateFromPageState(this.pageState))

        useEffect(() => {
            const observer = (): void => {
                const newLoading = loadingStateFromPageState(this.pageState)
                // Don't want to cause the state to change with a new object
                setLoading(currentLoading => currentLoading.kind !== newLoading.kind || currentLoading.started !== newLoading.started ? newLoading : currentLoading)
            }
            this.pageStateObservers.add(observer)
            return () => { this.pageStateObservers.delete(observer) }
        }, [])

        return loading
    }
    /* eslint-enable react-hooks/rules-of-hooks, no-restricted-syntax */
}

function mapSettingsFromURLParam(encoded_settings: string | undefined): MapSettings {
    let settings: Partial<MapSettings> = {}
    if (encoded_settings !== undefined) {
        const jsoned_settings = gunzipSync(Buffer.from(encoded_settings, 'base64')).toString()
        settings = JSON.parse(jsoned_settings) as Partial<MapSettings>
    }
    return default_settings(settings)
}
