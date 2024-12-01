import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { z } from 'zod'

import { AboutPanel } from '../components/AboutPanel'
import { DataCreditPanel } from '../components/DataCreditPanel'
import { IndexPanel } from '../components/IndexPanel'
import { applySettingsParam, settingsConnectionConfig } from '../components/QuerySettingsConnection'
import { ArticlePanel } from '../components/article-panel'
import { ComparisonPanel } from '../components/comparison-panel'
import { ArticleRow, for_type, load_articles } from '../components/load-article'
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
    { kind: 'article', article: Article, universe: string, rows: (settings: StatGroupSettings) => ArticleRow[][], statPaths: StatPath[][] }
    | { kind: 'comparison', articles: Article[], universe: string, universes: string[], rows: (settings: StatGroupSettings) => ArticleRow[][], statPaths: StatPath[][] }
    | { kind: 'statistic', universe: string } & StatisticPanelProps
    | { kind: 'index' }
    | { kind: 'about' }
    | { kind: 'dataCredit' }
    | { kind: 'quiz', quizDescriptor: QuizDescriptor, quiz: QuizQuestion[], parameters: string, todayName: string }
    | { kind: 'mapper', settings: MapSettings, view: boolean }

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
    }
}

type PageState = { kind: 'loading', loading: { descriptor: PageDescriptor }, current?: { data: PageData, descriptor: PageDescriptor } }
    | { kind: 'loaded', current: { data: PageData, descriptor: PageDescriptor } }
    | { kind: 'error', error: unknown, current?: { data: PageData, descriptor: PageDescriptor } }

export class Navigator {
    /* eslint-disable react-hooks/rules-of-hooks -- This is a logic class with custom hooks */
    static Context = createContext(new Navigator())

    private pageState: PageState
    private pageStateObservers = new Set<() => void>()

    constructor() {
        try {
            // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
            this.pageState = { kind: 'loading', loading: { descriptor: pageDescriptorFromURL(new URL(discordFix(window.location.href))) } }
            void this.navigate(this.pageState.loading.descriptor, 'replace')
        }
        catch (error) {
            this.pageState = { kind: 'error', error }
        }
    }

    async navigate(newDescriptor: PageDescriptor, kind: 'push' | 'replace' | null): Promise<void> {
        switch (kind) {
            case 'push':
                // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
                history.pushState(newDescriptor, '', urlFromPageDescriptor(newDescriptor))
                break
            case 'replace':
                // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
                history.replaceState(newDescriptor, '', urlFromPageDescriptor(newDescriptor))
                break
            case null:
                break
        }

        this.pageState = { kind: 'loading', loading: { descriptor: newDescriptor }, current: this.pageState.current }
        this.pageStateObservers.forEach((observer) => { observer() })
        try {
            const { pageData, newPageDescriptor } = await loadPageDescriptor(newDescriptor, Settings.shared)
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Async function, pageState can change during await
            if (this.pageState.kind !== 'loading' || this.pageState.loading.descriptor !== newDescriptor) {
                // Another load has started, don't race it
                return
            }
            // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
            history.replaceState(newPageDescriptor, '', urlFromPageDescriptor(newPageDescriptor))
            this.pageState = { kind: 'loaded', current: { data: pageData, descriptor: newPageDescriptor } }
            this.pageStateObservers.forEach((observer) => { observer() })
        }
        catch (error) {
            if (this.pageState.kind !== 'loading' || this.pageState.loading.descriptor !== newDescriptor) {
                // Another load has started, don't race it
                return
            }
            this.pageState = { kind: 'error', error, current: this.pageState.current }
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

    private get pageData(): PageData {
        if (this.pageState.current === undefined) {
            throw new Error(`No current page for state ${JSON.stringify(this.pageState)}`)
        }
        return this.pageState.current.data
    }

    private get pageDescriptor(): PageDescriptor {
        if (this.pageState.current === undefined) {
            throw new Error(`No current page descriptor for state ${JSON.stringify(this.pageState)}`)
        }
        return this.pageState.current.descriptor
    }

    get universe(): string {
        const data = this.pageData
        switch (data.kind) {
            case 'article':
            case 'comparison':
            case 'statistic':
                return data.universe
            default:
                throw new Error(`Page data kind  ${data.kind} does not have a universe`)
        }
    }

    useUniverse(): string {
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
        switch (this.pageDescriptor.kind) {
            case 'article':
            case 'comparison':
            case 'statistic':
                void this.navigate({
                    ...this.pageDescriptor,
                    universe: newUniverse,
                }, 'push')
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageDescriptor.kind} does not have a universe`)
        }
    }

    private get statPaths(): StatPath[][] | undefined {
        switch (this.pageData.kind) {
            case 'article':
            case 'comparison':
                return this.pageData.statPaths
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
        switch (this.pageState.current?.descriptor.kind) {
            case 'article':
            case 'comparison':
                this.pageState.current.descriptor.s = newVector
                // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
                history.replaceState(this.pageState.current.descriptor, '', urlFromPageDescriptor(this.pageState.current.descriptor))
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageDescriptor.kind} does not have a settings vector`)
        }
    }

    setMapperSettings(newSettings: string): void {
        switch (this.pageState.current?.descriptor.kind) {
            case 'mapper':
                this.pageState.current.descriptor.settings = newSettings
                // eslint-disable-next-line no-restricted-syntax -- Core navigation functions
                history.replaceState(this.pageState.current.descriptor, '', urlFromPageDescriptor(this.pageState.current.descriptor))
                break
            default:
                throw new Error(`Page descriptor kind ${this.pageDescriptor.kind} does not have mapper settings`)
        }
    }
    /* eslint-enable react-hooks/rules-of-hooks */
}

export function Router(): ReactNode {
    const navigator = useContext(Navigator.Context)

    useEffect(() => {
        // Hook into the browser back/forward buttons
        const listener = (popStateEvent: PopStateEvent): void => {
            void navigator.navigate(popStateEvent.state as PageDescriptor, null)
        }
        window.addEventListener('popstate', listener)
        return () => { window.removeEventListener('popstate', listener) }
    }, [navigator])

    const pageState = navigator.usePageState()

    return (
        <>
            {pageState.current !== undefined ? <PageRouter pageData={pageState.current.data} /> : null}
            {pageState.kind === 'loading' ? <LoadingScreen /> : null}
            {pageState.kind === 'error' ? <ErrorScreen error={pageState.error} /> : null}
        </>
    )
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

function PageRouter({ pageData }: { pageData: PageData }): ReactNode {
    switch (pageData.kind) {
        case 'article':
            return (
                <ArticlePanel article={pageData.article} rows={pageData.rows} />
            )
        case 'comparison':
            return (
                <ComparisonPanel articles={pageData.articles} universes={pageData.universes} rows={pageData.rows} />
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
