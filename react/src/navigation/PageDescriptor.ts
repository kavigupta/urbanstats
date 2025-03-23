import { gunzipSync } from 'zlib'

import { z } from 'zod'

import { applySettingsParamSettings, settingsConnectionConfig } from '../components/QuerySettingsConnection'
import { getCountsByArticleType } from '../components/countsByArticleType'
import { ArticleRow, forType, loadArticles } from '../components/load-article'
import type { StatisticPanelProps } from '../components/statistic-panel'
import explanation_pages from '../data/explanation_page'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list' // TODO: Maybe dynamically import these
import paths from '../data/statistic_path_list'
import { loadJSON, loadStatisticsPage } from '../load_json'
import { defaultSettings, MapSettings } from '../mapper/settings'
import { Settings } from '../page_template/settings'
import { activeVectorKeys, fromVector, getVector } from '../page_template/settings-vector'
import { StatGroupSettings } from '../page_template/statistic-settings'
import { allGroups, CategoryIdentifier, StatName, StatPath, statsTree } from '../page_template/statistic-tree'
import { getDailyOffsetNumber, getRetrostatOffsetNumber } from '../quiz/dates'
import { validQuizInfiniteVersions } from '../quiz/infinite'
import {
    QuizQuestionsModel, wrapQuestionsModel, addFriendFromLink, CustomQuizContent, JuxtaQuestionJSON,
    loadJuxta, loadRetro, QuizDescriptor, RetroQuestionJSON, infiniteQuiz, QuizHistory,
} from '../quiz/quiz'
import { getInfiniteQuizzes } from '../quiz/statistics'
import { defaultArticleUniverse, defaultComparisonUniverse } from '../universe'
import { Article } from '../utils/protos'
import { randomBase62ID } from '../utils/random'
import { loadArticleFromPossibleSymlink, loadArticlesFromPossibleSymlink as loadArticlesFromPossibleSymlinks } from '../utils/symlinks'
import { base64Gunzip } from '../utils/urlParamShort'

import { byPopulation, uniform } from './random'

const articleSchema = z.object({
    longname: z.string(),
    universe: z.optional(z.string()),
    s: z.optional(z.string()),
    category: z.optional(z.string()) as z.ZodOptional<z.ZodType<CategoryIdentifier, z.ZodTypeDef, CategoryIdentifier>>,
})

const articleSchemaFromParams = z.object({
    longname: z.string(),
    universe: z.optional(z.string()),
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
    universe: z.optional(z.string()),
    s: z.optional(z.string()),
})

const comparisonSchemaFromParams = z.object({
    longnames: z.string().transform(value => z.array(z.string()).parse(JSON.parse(value))),
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

const mapperSchema = z.object({
    settings: z.optional(z.string()),
    view: z.boolean(),
})

const mapperSchemaForParams = z.object({
    settings: z.optional(z.string()),
    view: z.union([z.undefined().transform(() => false), z.literal('true').transform(() => true), z.literal('false').transform(() => false)]),
})

export const pageDescriptorSchema = z.union([
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

export type PageDescriptor = z.infer<typeof pageDescriptorSchema>
export type ExceptionalPageDescriptor = PageDescriptor
    | { kind: 'initialLoad', url: URL }
    | { kind: 'error', url: URL }

export type PageData =
    { kind: 'article', article: Article, universe: string, rows: (settings: StatGroupSettings) => ArticleRow[][], statPaths: StatPath[][] }
    | { kind: 'comparison', articles: Article[], universe: string, universes: string[], rows: (settings: StatGroupSettings) => ArticleRow[][], statPaths: StatPath[][] }
    | { kind: 'statistic', universe: string } & StatisticPanelProps
    | { kind: 'index' }
    | { kind: 'about' }
    | { kind: 'dataCredit' }
    | { kind: 'quiz', quizDescriptor: QuizDescriptor, quiz: QuizQuestionsModel, parameters: string, todayName?: string }
    | { kind: 'mapper', settings: MapSettings, view: boolean }
    | {
        kind: 'error'
        error: unknown
        url: URL
        descriptor?: PageDescriptor // If descriptor is not present, we could not parse it
    }
    | { kind: 'initialLoad' }

export function pageDescriptorFromURL(url: URL): PageDescriptor {
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
export async function loadPageDescriptor(newDescriptor: PageDescriptor, settings: Settings): Promise<{ pageData: PageData, newPageDescriptor: PageDescriptor, effects: () => void }> {
    switch (newDescriptor.kind) {
        case 'article':
            const article = await loadArticleFromPossibleSymlink(newDescriptor.longname)

            const defaultUniverse = defaultArticleUniverse(article.universes)

            const articleUniverse = newDescriptor.universe !== undefined && article.universes.includes(newDescriptor.universe) ? newDescriptor.universe : defaultUniverse

            const displayUniverse = articleUniverse === defaultUniverse ? undefined : articleUniverse

            const { rows: articleRows, statPaths: articleStatPaths } = loadArticles([article], await getCountsByArticleType(), articleUniverse)

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
        case 'comparison':
            const articles = await loadArticlesFromPossibleSymlinks(newDescriptor.longnames)
            // intersection of all the data.universes
            const articleUniverses = articles.map(x => x.universes)
            const universes = articleUniverses.reduce((a, b) => a.filter(c => b.includes(c)))

            const defaultUniverseComparison = defaultComparisonUniverse(articleUniverses, universes)

            const comparisonUniverse = newDescriptor.universe !== undefined && universes.includes(newDescriptor.universe) ? newDescriptor.universe : defaultUniverseComparison

            const displayComparisonUniverse = comparisonUniverse === defaultUniverseComparison ? undefined : comparisonUniverse

            const { rows: comparisonRows, statPaths: comparisonStatPaths } = loadArticles(articles, await getCountsByArticleType(), comparisonUniverse)

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
                    longnames: articles.map(x => x.longname),
                },
                effects() {
                    if (newDescriptor.s !== undefined) {
                        const config = settingsConnectionConfig({ pageKind: 'comparison', statPaths: comparisonStatPaths, settings })
                        applySettingsParamSettings(fromVector(newDescriptor.s, settings), settings, comparisonStatPaths, config)
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

            const [data, articleNames] = await loadStatisticsPage(statUniverse, statpath, newDescriptor.article_type)

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
                    count: forType(await getCountsByArticleType(), statUniverse, statcol, newDescriptor.article_type),
                    explanationPage,
                    order: newDescriptor.order,
                    highlight: newDescriptor.highlight ?? undefined,
                    articleType: newDescriptor.article_type,
                    joinedString: statpath,
                    start: newDescriptor.start,
                    amount: parsedAmount,
                    articleNames,
                    data,
                    renderedStatname: newDescriptor.statname,
                    universe: statUniverse,
                    // StatisticPanel needs this to compute the set of universes to display
                    counts: await getCountsByArticleType(),

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
        case 'dataCredit':
            return { pageData: newDescriptor, newPageDescriptor: newDescriptor, effects: () => undefined }
        case 'quiz':
            let quiz: QuizQuestionsModel
            let quizDescriptor: QuizDescriptor
            let todayName: string | undefined
            const updatedDescriptor: PageDescriptor = { ...newDescriptor }
            switch (newDescriptor.mode) {
                case 'custom':
                    const custom = JSON.parse(base64Gunzip(newDescriptor.quizContent)) as CustomQuizContent
                    quizDescriptor = {
                        kind: 'custom',
                        name: custom.name,
                    }
                    quiz = wrapQuestionsModel(custom.questions)
                    todayName = custom.name
                    break
                case 'retro':
                    const retro = newDescriptor.date ?? getRetrostatOffsetNumber()
                    quizDescriptor = {
                        kind: 'retrostat',
                        name: `W${retro}`,
                    }
                    quiz = wrapQuestionsModel((await loadJSON(`/retrostat/${retro}`) as RetroQuestionJSON[]).map(loadRetro))
                    todayName = `Week ${retro}`
                    break
                case 'infinite':
                    if (updatedDescriptor.seed === undefined) {
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
                        updatedDescriptor.v = Math.max(...validQuizInfiniteVersions)
                    }
                    quizDescriptor = { kind: 'infinite', name: `I_${updatedDescriptor.seed}_${updatedDescriptor.v}`, seed: updatedDescriptor.seed, version: updatedDescriptor.v }
                    quiz = infiniteQuiz(updatedDescriptor.seed, updatedDescriptor.v)
                    todayName = undefined
                    break
                case undefined:
                    const today = newDescriptor.date ?? getDailyOffsetNumber()
                    quizDescriptor = { kind: 'juxtastat', name: today }
                    quiz = wrapQuestionsModel((await loadJSON(`/quiz/${today}`) as JuxtaQuestionJSON[]).map(loadJuxta))
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
                newPageDescriptor: {
                    ...updatedDescriptor,
                    // Remove friend stuff so it doesn't get triggered again
                    id: undefined,
                    name: undefined,
                },
                effects: () => {
                    if (newDescriptor.id !== undefined && newDescriptor.name !== undefined) {
                        void addFriendFromLink(newDescriptor.id, newDescriptor.name.trim())
                    }
                },
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

function mapSettingsFromURLParam(encodedSettings: string | undefined): MapSettings {
    let settings: Partial<MapSettings> = {}
    if (encodedSettings !== undefined) {
        const jsonedSettings = gunzipSync(Buffer.from(encodedSettings, 'base64')).toString()
        settings = JSON.parse(jsonedSettings) as Partial<MapSettings>
    }
    return defaultSettings(settings)
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
        case 'article':
            return pageData.article.shortname
        case 'statistic':
            return pageData.statname
        case 'comparison':
            return pageData.articles.map(x => x.shortname).join(' vs ')
        case 'error':
            return 'Error'
    }
}
