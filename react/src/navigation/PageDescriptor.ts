import { z } from 'zod'

import { applySettingsParamSettings, settingsConnectionConfig } from '../components/QuerySettingsConnection'
import type { ArticlePanel } from '../components/article-panel'
import type { ComparisonPanel } from '../components/comparison-panel'
import { CountsByUT, getCountsByArticleType } from '../components/countsByArticleType'
import { ArticleRow, loadArticles } from '../components/load-article'
import type { QuizPanel } from '../components/quiz-panel'
import statnames from '../data/statistic_name_list'
import type { DataCreditPanel } from '../data-credit'
import type { ScreenshotDiffViewerPanel } from '../dev/ScreenshotDiffViewerPanel'
import { loadJSON } from '../load_json'
import type { DebugMapTextBoxPanel } from '../mapper/components/DebugMapTextBox'
import type { MapperPanel } from '../mapper/components/MapperPanel'
import { mapUSSFromString } from '../mapper/settings/map-uss'
import type { MapSettings } from '../mapper/settings/utils'
import { Settings } from '../page_template/settings'
import { activeVectorKeys, fromVector, getVector } from '../page_template/settings-vector'
import { StatGroupSettings } from '../page_template/statistic-settings'
import { allGroups, CategoryIdentifier, StatPath, statsTree } from '../page_template/statistic-tree'
import { OauthCallbackPanel } from '../quiz/OauthCallbackPanel'
import type {
    QuizQuestionsModel, CustomQuizContent, JuxtaQuestionJSON,
    QuizDescriptor, RetroQuestionJSON, QuizHistory,
} from '../quiz/quiz'
import { StatisticPanel } from '../stat/StatisticPanel'
import { Statistic, StatSettings, View } from '../stat/types'
import { loadSYAUData, SYAUData } from '../syau/load'
import type { SYAUPanel } from '../syau/syau-panel'
import { defaultArticleUniverse, defaultComparisonUniverse, Universe, universeSchema } from '../universe'
import type { DebugEditorPanel } from '../urban-stats-script/DebugEditorPanel'
import type { USSDocumentationPanel } from '../uss-documentation'
import type { Article } from '../utils/protos'
import { randomBase62ID } from '../utils/random'
import { loadArticleFromPossibleSymlink, loadArticlesFromPossibleSymlink as loadArticlesFromPossibleSymlinks } from '../utils/symlinks'
import { base64Gunzip } from '../utils/urlParamShort'

import { byPopulation, uniform } from './random'

const articleSchema = z.object({
    longname: z.string(),
    universe: z.optional(universeSchema),
    s: z.optional(z.string()),
    category: z.optional(z.string()) as z.ZodOptional<z.ZodType<CategoryIdentifier, z.ZodTypeDef, CategoryIdentifier>>,
})

const articleSchemaFromParams = z.object({
    longname: z.string(),
    universe: z.optional(universeSchema).catch(undefined),
    s: z.optional(z.string()),
    category: z.optional(z.string().transform((s) => {
        if (!statsTree.some(category => category.id === s)) {
            throw new Error(`${s} is not a valid category identifier`)
        }
        return s as CategoryIdentifier
    })),
})

const comparisonSchema = z.object({
    longnames: z.array(z.string()),
    universe: z.optional(universeSchema),
    s: z.optional(z.string()),
})

const comparisonSchemaFromParams = z.object({
    longnames: z.string().transform(value => z.array(z.string()).parse(JSON.parse(value))),
    universe: z.optional(universeSchema).catch(undefined),
    s: z.optional(z.string()),
})

const statisticSchema = z.object({
    article_type: z.string(),
    start: z.number().int(),
    amount: z.union([z.literal('All'), z.number().int()]),
    order: z.union([z.literal('descending'), z.literal('ascending')]),
    highlight: z.optional(z.string()),
    universe: z.optional(universeSchema),
    edit: z.optional(z.boolean()),
    sort_column: z.optional(z.number().int()),
}).and(
    z.union([
        z.object({
            statname: z.enum(statnames),
        }),
        z.object({
            uss: z.string(),
        }),
    ]),
)

const statisticSchemaFromParams = z.union([
    z.object({
        article_type: z.string(),
        start: z.optional(z.coerce.number().int()).default(1),
        amount: z.union([z.literal('All'), z.coerce.number().int(), z.undefined().transform(() => 10)]),
        order: z.union([z.undefined().transform(() => 'descending' as const), z.literal('descending'), z.literal('ascending')]),
        highlight: z.optional(z.string()),
        universe: z.optional(universeSchema).catch(undefined),
        edit: z.union([z.literal('true').transform(() => true), z.literal('false').transform(() => false), z.undefined().transform(() => false)]),
        sort_column: z.optional(z.coerce.number().int()).default(0),
    }).and(z.union([
        z.object({
            statname: z.string().transform(s => s.replaceAll('__PCT__', '%')).pipe(z.enum(statnames)),
        }),
        z.object({
            uss: z.string(),
        }),
    ])),
    z.object({}).transform(() => ({
        article_type: 'Subnational Region',
        uss: 'customNode(""); condition (true); table(columns=[column(values=density_pw_1km)])',
        start: 1,
        amount: 20,
        order: 'descending' as const,
        universe: 'USA' as const,
        edit: true,
        sort_column: 0,
    })),
])

const randomSchema = z.object({
    sampleby: z.union([z.literal('uniform'), z.literal('population')]),
    us_only: z.boolean(),
})

const randomSchemaForParams = z.object({
    sampleby: z.union([z.literal('uniform'), z.literal('population'), z.undefined().transform(() => 'uniform' as const)]),
    us_only: z.union([z.literal('true').transform(() => true), z.literal('false').transform(() => false), z.undefined().transform(() => false)]),
})

// Should either have all or none friends parameters
const quizSchema = z.intersection(
    z.union([
        z.object({
            mode: z.union([z.undefined(), z.literal('retro')]),
            date: z.optional(z.coerce.number().int()),
            quizContent: z.optional(z.undefined()),
            seed: z.optional(z.undefined()),
            v: z.optional(z.undefined()),
        }),
        z.object({
            mode: z.literal('custom'),
            date: z.optional(z.undefined()),
            quizContent: z.string(),
            seed: z.optional(z.undefined()),
            v: z.optional(z.undefined()),
        }),
        z.object({
            mode: z.literal('infinite'),
            date: z.optional(z.undefined()),
            quizContent: z.optional(z.undefined()),
            seed: z.union([z.undefined(), z.string()]),
            v: z.union([z.undefined(), z.coerce.number().int()]),
        }),
    ]),
    z.object({
        name: z.optional(z.string()),
        id: z.optional(z.string()),
    }),
)

const syauSchema = z.object({
    typ: z.optional(z.string()),
    universe: z.optional(universeSchema),
})

const mapperSchema = z.object({
    settings: z.optional(z.string()),
    view: z.boolean(),
})

const mapperSchemaForParams = z.object({
    settings: z.optional(z.string()),
    view: z.union([z.undefined().transform(() => false), z.literal('true').transform(() => true), z.literal('false').transform(() => false)]),
})

const editorSchema = z.object({
    undoChunking: z.optional(z.coerce.number().int()),
    mode: z.optional(z.enum(['uss', 'mapper'])),
})

const screenshotDiffViewerSchema = z.object({
    artifactId: z.string(),
    hash: z.string(),
    index: z.optional(z.coerce.number()),
})

export const pageDescriptorSchema = z.union([
    z.object({ kind: z.literal('article') }).and(articleSchema),
    z.object({ kind: z.literal('comparison') }).and(comparisonSchema),
    z.object({ kind: z.literal('statistic') }).and(statisticSchema),
    z.object({ kind: z.literal('random') }).and(randomSchema),
    z.object({ kind: z.literal('index') }),
    z.object({ kind: z.literal('about') }),
    z.object({ kind: z.literal('dataCredit'), hash: z.string() }),
    z.object({ kind: z.literal('ussDocumentation'), hash: z.string() }),
    z.object({ kind: z.literal('quiz') }).and(quizSchema),
    z.object({ kind: z.literal('syau') }).and(syauSchema),
    z.object({ kind: z.literal('mapper') }).and(mapperSchema),
    z.object({ kind: z.literal('editor') }).and(editorSchema),
    z.object({ kind: z.literal('oauthCallback'), params: z.record(z.string()) }),
    z.object({ kind: z.literal('screenshotDiffViewer') }).and(screenshotDiffViewerSchema),
])

export type PageDescriptor = z.infer<typeof pageDescriptorSchema>
export type ExceptionalPageDescriptor = PageDescriptor
    | { kind: 'initialLoad', url: URL, descriptor: PageDescriptor }
    | { kind: 'error', url: URL }

export type PageData =
    { kind: 'article', article: Article, universe: Universe, rows: (settings: StatGroupSettings) => ArticleRow[][], statPaths: StatPath[][], articlePanel: typeof ArticlePanel }
    | {
        kind: 'comparison'
        articles: Article[]
        universe: Universe
        universes: readonly Universe[]
        rows: (settings: StatGroupSettings) => ArticleRow[][]
        statPaths: StatPath[][]
        mapPartitions: number[][]
        comparisonPanel: typeof ComparisonPanel
    }
    | { kind: 'statistic', settings: StatSettings, statisticPanel: typeof StatisticPanel }
    | { kind: 'index' }
    | { kind: 'about' }
    | { kind: 'dataCredit', dataCreditPanel: typeof DataCreditPanel }
    | { kind: 'ussDocumentation', ussDocumentationPanel: typeof USSDocumentationPanel, hash: string }
    | { kind: 'quiz', quizDescriptor: QuizDescriptor, quiz: QuizQuestionsModel, parameters: string, todayName?: string, quizPanel: typeof QuizPanel }
    | { kind: 'syau', typ: string | undefined, universe: Universe | undefined, counts: CountsByUT, syauData: SYAUData | undefined, syauPanel: typeof SYAUPanel }
    | { kind: 'mapper', settings: MapSettings, view: boolean, mapperPanel: typeof MapperPanel, counts: CountsByUT }
    | { kind: 'editor', editorPanel: typeof DebugEditorPanel | typeof DebugMapTextBoxPanel, undoChunking?: number }
    | { kind: 'oauthCallback', result: { success: false, error: string } | { success: true }, oauthCallbackPanel: typeof OauthCallbackPanel }
    | {
        kind: 'error'
        error: unknown
        url: URL
        descriptor?: PageDescriptor // If descriptor is not present, we could not parse it
    }
    | { kind: 'initialLoad', descriptor: PageDescriptor }
    | { kind: 'screenshotDiffViewer', artifactId: string, hash: string, index: number, panel: typeof ScreenshotDiffViewerPanel }

export function pageDescriptorFromURL(url: URL): PageDescriptor {
    /**
     * Remember: When adding a new entrypoint here, you'll also need to add the actual file in `build.py` in order to support initial navigation.
     */
    const params = Object.fromEntries(url.searchParams.entries())
    const hashParams = Object.fromEntries(new URLSearchParams(url.hash.slice(1)).entries())
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
            return { kind: 'quiz', ...quizSchema.parse({ ...params, ...hashParams }) }
        case '/syau.html':
            return { kind: 'syau', ...syauSchema.parse({ ...params, ...hashParams }) }
        case '/mapper.html':
            return { kind: 'mapper', ...mapperSchemaForParams.parse(params) }
        case '/about.html':
            return { kind: 'about' }
        case '/data-credit.html':
            return { kind: 'dataCredit', hash: url.hash }
        case '/uss-documentation.html':
            return { kind: 'ussDocumentation', hash: url.hash }
        case '/editor.html':
            return { kind: 'editor', ...editorSchema.parse(params) }
        case '/oauth-callback.html':
            return { kind: 'oauthCallback', params }
        case '/screenshot-diff-viewer.html':
            return { kind: 'screenshotDiffViewer', ...screenshotDiffViewerSchema.parse(params) }
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
                ...('uss' in pageDescriptor ? { uss: pageDescriptor.uss } : { statname: pageDescriptor.statname.replaceAll('%', '__PCT__') }),
                article_type: pageDescriptor.article_type,
                start: pageDescriptor.start.toString(),
                amount: pageDescriptor.amount.toString(),
                order: pageDescriptor.order === 'descending' ? undefined : 'ascending',
                highlight: pageDescriptor.highlight,
                universe: pageDescriptor.universe,
                edit: pageDescriptor.edit ? 'true' : undefined,
                sort_column: pageDescriptor.sort_column === undefined || pageDescriptor.sort_column === 0
                    ? undefined
                    : pageDescriptor.sort_column.toString(),
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
        case 'ussDocumentation':
            pathname = '/uss-documentation.html'
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
                seed: pageDescriptor.seed,
                v: pageDescriptor.v?.toString(),
                quizContent: pageDescriptor.quizContent,
                name: pageDescriptor.name,
                id: pageDescriptor.id,
            }).flatMap(([key, value]) => value !== undefined ? [[key, value]] : []))
            if (hashParams.size > 0) {
                quizResult.hash = `#${hashParams.toString()}`
            }
            return quizResult
        case 'syau':
            pathname = '/syau.html'
            // same situation as the quiz
            const hashParamsSYAU = {
                typ: pageDescriptor.typ,
                universe: pageDescriptor.universe,
            }
            const hashParamsString = Object.entries(hashParamsSYAU)
                .flatMap(([key, value]) => value !== undefined ? [[key, value]] : [])
                .map(([key, value]) => `${key}=${value}`)
                .join('&')
            if (hashParamsString.length > 0) {
                hash = `#${hashParamsString}`
            }
            searchParams = {}
            break
        case 'mapper':
            pathname = '/mapper.html'
            searchParams = {
                view: pageDescriptor.view ? 'true' : undefined,
                settings: pageDescriptor.settings,
            }
            break
        case 'editor':
            pathname = '/editor.html'
            searchParams = {
                mode: pageDescriptor.mode,
                undoChunking: pageDescriptor.undoChunking?.toString(),
            }
            break
        case 'oauthCallback':
            pathname = '/oauth-callback.html'
            searchParams = pageDescriptor.params
            break
        case 'initialLoad':
        case 'error':
            return pageDescriptor.url
        case 'screenshotDiffViewer':
            pathname = '/screenshot-diff-viewer.html'
            searchParams = {
                artifactId: pageDescriptor.artifactId,
                hash: pageDescriptor.hash,
                index: pageDescriptor.index?.toString(),
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
    result.hash = hash
    return result
}

// Should not do side-effects in this function, since it can race with other calls of itself. Instead, return effects in the effects result value
// Only use one await per block (or use overlapping promises), so that resources may be loaded in parallel to improve performance
export async function loadPageDescriptor(newDescriptor: Extract<PageDescriptor, { kind: 'quiz' }>, settings: Settings): Promise<{ pageData: Extract<PageData, { kind: 'quiz' }>, newPageDescriptor: Extract<PageDescriptor, { kind: 'quiz' }>, effects: () => void }>
export async function loadPageDescriptor(newDescriptor: PageDescriptor, settings: Settings): Promise<{ pageData: PageData, newPageDescriptor: PageDescriptor, effects: () => void }>
export async function loadPageDescriptor(newDescriptor: PageDescriptor, settings: Settings): Promise<{ pageData: PageData, newPageDescriptor: PageDescriptor, effects: () => void }> {
    switch (newDescriptor.kind) {
        case 'article': {
            const [article, panel, countsByArticleType] = await Promise.all([
                loadArticleFromPossibleSymlink(newDescriptor.longname),
                import('../components/article-panel'),
                getCountsByArticleType(),
            ])

            const defaultUniverse = defaultArticleUniverse(article.universes as Universe[])

            const articleUniverse = newDescriptor.universe !== undefined && article.universes.includes(newDescriptor.universe) ? newDescriptor.universe : defaultUniverse

            const displayUniverse = articleUniverse === defaultUniverse ? undefined : articleUniverse

            const { rows: articleRows, statPaths: articleStatPaths } = loadArticles([article], countsByArticleType, articleUniverse)

            return {
                pageData: {
                    kind: 'article',
                    article,
                    universe: articleUniverse,
                    rows: articleRows,
                    statPaths: articleStatPaths,
                    articlePanel: panel.ArticlePanel,
                },
                newPageDescriptor: {
                    ...newDescriptor,
                    universe: displayUniverse,
                    s: getVector(settings),
                    longname: article.longname,
                },
                effects() {
                    if (newDescriptor.s !== undefined || newDescriptor.category !== undefined) {
                        const config = settingsConnectionConfig({ pageKind: 'article', statPaths: articleStatPaths, settings })
                        applySettingsParamSettings({
                            ...(newDescriptor.s === undefined ? settings.getMultiple(activeVectorKeys) : fromVector(newDescriptor.s, settings)),
                            ...(newDescriptor.category === undefined
                                ? undefined
                                : Object.fromEntries(allGroups.map(group => [`show_stat_group_${group.id}`, group.parent.id === newDescriptor.category] as const))),
                        }, settings, articleStatPaths, config)
                    }
                },
            }
        }
        case 'comparison': {
            const [articles, countsByArticleType, panel, mapPartitions] = await Promise.all([
                loadArticlesFromPossibleSymlinks(newDescriptor.longnames),
                getCountsByArticleType(),
                import('../components/comparison-panel'),
                import('../map-partition').then(({ partitionLongnames }) => partitionLongnames(newDescriptor.longnames)),
            ])

            // intersection of all the data.universes
            const articleUniverses = articles.map(x => x.universes as Universe[])
            const universes = articleUniverses.reduce((a, b) => a.filter(c => b.includes(c)))

            const defaultUniverseComparison = defaultComparisonUniverse(articleUniverses, universes)

            const comparisonUniverse = newDescriptor.universe !== undefined && universes.includes(newDescriptor.universe) ? newDescriptor.universe : defaultUniverseComparison

            const displayComparisonUniverse = comparisonUniverse === defaultUniverseComparison ? undefined : comparisonUniverse

            const { rows: comparisonRows, statPaths: comparisonStatPaths } = loadArticles(articles, countsByArticleType, comparisonUniverse)

            return {
                pageData: {
                    kind: 'comparison',
                    articles,
                    universe: comparisonUniverse,
                    universes,
                    rows: comparisonRows,
                    statPaths: comparisonStatPaths,
                    comparisonPanel: panel.ComparisonPanel,
                    mapPartitions,
                },
                newPageDescriptor: {
                    ...newDescriptor,
                    universe: displayComparisonUniverse,
                    s: getVector(settings),
                    longnames: articles.map(x => x.longname),
                },
                effects() {
                    if (newDescriptor.s !== undefined) {
                        const config = settingsConnectionConfig({ pageKind: 'comparison', statPaths: comparisonStatPaths, settings })
                        applySettingsParamSettings(fromVector(newDescriptor.s, settings), settings, comparisonStatPaths, config)
                    }
                },
            }
        }
        case 'statistic': {
            const statUniverse = newDescriptor.universe ?? 'world'
            const displayStatUniverse = statUniverse !== 'world' ? statUniverse : undefined

            // Pin the start position correctly to the beginning of the page
            let start = newDescriptor.start
            if (newDescriptor.amount !== 'All') {
                start = start - 1
                start = start - (start % newDescriptor.amount)
                start = start + 1
            }

            return {
                pageData: {
                    kind: 'statistic',
                    statisticPanel: (await import('../stat/StatisticPanel')).StatisticPanel,
                    settings: {
                        stat: {
                            universe: statUniverse,
                            articleType: newDescriptor.article_type,
                            ...('uss' in newDescriptor
                                ? {
                                        type: 'uss',
                                        uss: mapUSSFromString(newDescriptor.uss),
                                    }
                                : {
                                        type: 'simple',
                                        statName: newDescriptor.statname,
                                    }),
                        },
                        view: {
                            start,
                            amount: newDescriptor.amount,
                            order: newDescriptor.order,
                            highlight: newDescriptor.highlight,
                            edit: newDescriptor.edit ?? false,
                            sortColumn: newDescriptor.sort_column ?? 0,
                        },
                    },
                },
                newPageDescriptor: {
                    ...newDescriptor,
                    start,
                    universe: displayStatUniverse,
                    highlight: undefined,
                },
                effects: () => undefined,
            }
        }
        case 'random':
            let longname: string
            switch (newDescriptor.sampleby) {
                case 'uniform':
                    longname = (await uniform())()
                    break
                case 'population':
                    longname = (await byPopulation(newDescriptor.us_only))()
                    break
            }

            return await loadPageDescriptor({
                kind: 'article',
                longname,
            }, settings)

        case 'index':
        case 'about':
            return { pageData: newDescriptor, newPageDescriptor: newDescriptor, effects: () => undefined }

        case 'dataCredit':
            return {
                pageData: {
                    ...newDescriptor,
                    dataCreditPanel: (await import('../data-credit')).DataCreditPanel,
                },
                newPageDescriptor: newDescriptor,
                effects: () => undefined,
            }

        case 'ussDocumentation':
            return {
                pageData: {
                    ...newDescriptor,
                    ussDocumentationPanel: (await import('../uss-documentation')).USSDocumentationPanel,
                },
                newPageDescriptor: newDescriptor,
                effects: () => undefined,
            }

        case 'editor':
            return {
                pageData: {
                    ...newDescriptor,
                    editorPanel: newDescriptor.mode === 'mapper'
                        ? (await import('../mapper/components/DebugMapTextBox')).DebugMapTextBoxPanel
                        : (await import('../urban-stats-script/DebugEditorPanel')).DebugEditorPanel,
                },
                newPageDescriptor: newDescriptor,
                effects: () => undefined,
            }

        case 'quiz': {
            let quiz: QuizQuestionsModel
            let quizDescriptor: QuizDescriptor
            let todayName: string | undefined
            const updatedDescriptor: PageDescriptor = { ...newDescriptor }
            const panel = import('../components/quiz-panel')
            const dates = import('../quiz/dates')
            const quizImport = import('../quiz/quiz')
            switch (newDescriptor.mode) {
                case 'custom': {
                    const { wrapQuestionsModel } = await import('../quiz/quiz')
                    const custom = JSON.parse(base64Gunzip(newDescriptor.quizContent)) as CustomQuizContent
                    quizDescriptor = {
                        kind: 'custom',
                        name: custom.name,
                    }
                    quiz = wrapQuestionsModel(custom.questions)
                    todayName = custom.name
                    break
                }
                case 'retro': {
                    const retro = newDescriptor.date ?? (await dates).getRetrostatOffsetNumber()
                    quizDescriptor = {
                        kind: 'retrostat',
                        name: `W${retro}`,
                    }
                    const [json, { wrapQuestionsModel, loadRetro }] = await Promise.all([
                        loadJSON(`/retrostat/${retro}`),
                        quizImport,
                    ])
                    quiz = wrapQuestionsModel((json as RetroQuestionJSON[]).map(loadRetro))
                    todayName = `Week ${retro}`
                    break
                }
                case 'infinite': {
                    if (updatedDescriptor.seed === undefined) {
                        const { getInfiniteQuizzes } = await import('../quiz/statistics')
                        const [seedVersions] = getInfiniteQuizzes(JSON.parse((localStorage.quiz_history || '{}') as string) as QuizHistory, false)
                        if (seedVersions.length > 0) {
                            const [seed, version] = seedVersions[0]
                            updatedDescriptor.seed = seed
                            updatedDescriptor.v = version
                        }
                        else {
                            updatedDescriptor.seed = randomBase62ID(7)
                        }
                    }
                    if (updatedDescriptor.v === undefined) {
                        const { validQuizInfiniteVersions } = await import('../quiz/infinite')
                        updatedDescriptor.v = Math.max(...validQuizInfiniteVersions)
                    }
                    quizDescriptor = { kind: 'infinite', name: `I_${updatedDescriptor.seed}_${updatedDescriptor.v}`, seed: updatedDescriptor.seed, version: updatedDescriptor.v }
                    quiz = (await quizImport).infiniteQuiz(updatedDescriptor.seed, updatedDescriptor.v)
                    todayName = undefined
                    break
                }
                case undefined:
                    const today = newDescriptor.date ?? (await dates).getDailyOffsetNumber()
                    quizDescriptor = { kind: 'juxtastat', name: today }
                    const [json, { wrapQuestionsModel, loadJuxta }] = await Promise.all([
                        loadJSON(`/quiz/${today}`),
                        import('../quiz/quiz'),
                    ])
                    quiz = wrapQuestionsModel((json as JuxtaQuestionJSON[]).map(loadJuxta))
                    todayName = today.toString()
            }
            return {
                pageData: {
                    kind: 'quiz',
                    quizDescriptor,
                    quiz,
                    parameters: urlFromPageDescriptor(newDescriptor).searchParams.toString(),
                    todayName,
                    quizPanel: (await panel).QuizPanel,
                },
                newPageDescriptor: {
                    ...updatedDescriptor,
                    // Remove friend stuff so it doesn't get triggered again
                    id: undefined,
                    name: undefined,

                },
                effects: () => {
                    if (newDescriptor.id !== undefined && newDescriptor.name !== undefined) {
                        const friendId = newDescriptor.id
                        const friendName = newDescriptor.name.trim()
                        void (async () => {
                            const { addFriendFromLink } = await import('../quiz/friends')
                            await addFriendFromLink(friendId, friendName)
                        })()
                    }
                },
            }
        }
        case 'syau': {
            const panel = import('../syau/syau-panel')
            const counts = await getCountsByArticleType()
            const syauData = await loadSYAUData(newDescriptor.typ, newDescriptor.universe, counts)
            return {
                pageData: {
                    kind: 'syau',
                    typ: newDescriptor.typ,
                    universe: newDescriptor.universe,
                    counts,
                    syauData,
                    syauPanel: (await panel).SYAUPanel,
                },
                newPageDescriptor: newDescriptor,
                effects: () => undefined,
            }
        }
        case 'mapper': {
            const panel = import('../mapper/components/MapperPanel')
            const utils = import('../mapper/settings/utils')
            const counts = getCountsByArticleType()
            return {
                pageData: {
                    kind: 'mapper',
                    view: newDescriptor.view,
                    settings: (await utils).mapSettingsFromURLParam(newDescriptor.settings),
                    mapperPanel: (await panel).MapperPanel,
                    counts: await counts,
                },
                newPageDescriptor: newDescriptor,
                effects: () => undefined,
            }
        }
        case 'oauthCallback': {
            const panel = import('../quiz/OauthCallbackPanel')
            let result: Extract<PageData, { kind: 'oauthCallback' }>['result']
            try {
                const { AuthenticationStateMachine } = await import('../quiz/AuthenticationStateMachine')
                await AuthenticationStateMachine.shared.completeSignIn(newDescriptor)
                result = { success: true }
            }
            catch (e) {
                if (e instanceof Error) {
                    console.error('OAuth error', e.message)
                    result = { success: false, error: e.message }
                }
                else {
                    console.error('OAuth error', e)
                    result = { success: false, error: 'Unknown error' }
                }
            }
            return {
                pageData: { kind: 'oauthCallback', result, oauthCallbackPanel: (await panel).OauthCallbackPanel },
                newPageDescriptor: newDescriptor,
                effects: () => undefined,
            }
        }
        case 'screenshotDiffViewer':
            return {
                pageData: {
                    ...newDescriptor,
                    index: newDescriptor.index ?? 0,
                    panel: (await import('../dev/ScreenshotDiffViewerPanel')).ScreenshotDiffViewerPanel,
                },
                newPageDescriptor: newDescriptor,
                effects: () => undefined,
            }
    }
}

export function pageTitle(pageData: PageData): string {
    switch (pageData.kind) {
        case 'initialLoad':
        case 'index':
            return 'Urban Stats'
        case 'about':
            return 'About Urban Stats'
        case 'dataCredit':
            return 'Urban Stats Credits'
        case 'ussDocumentation':
            return 'USS Documentation'
        case 'mapper':
            return 'Urban Stats Mapper'
        case 'quiz':
            switch (pageData.quizDescriptor.kind) {
                case 'juxtastat':
                    return 'Juxtastat'
                case 'retrostat':
                    return 'Retrostat'
                case 'custom':
                    return 'Custom Quiz'
                case 'infinite':
                    return 'Juxtastat Infinite'
            }
        case 'syau':
            return `So you're an urbanist?`
        case 'article':
            return pageData.article.shortname
        case 'statistic':
            return pageData.settings.stat.type === 'simple' ? pageData.settings.stat.statName : 'Urban Stats: Custom Table'
        case 'comparison':
            return pageData.articles.map(x => x.shortname).join(' vs ')
        case 'editor':
            return 'Editor'
        case 'oauthCallback':
            return pageData.result.success ? 'Signed In' : 'Sign In Failed'
        case 'error':
            return 'Error'
        case 'screenshotDiffViewer':
            return 'Screenshot Diff Viewer'
    }
}
