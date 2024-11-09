import { rawStatsTree, dataSources } from '../data/statistics_tree'
import { DefaultMap } from '../utils/DefaultMap'

const statPaths = require('../data/statistic_path_list.json') as StatPath[]
const statNames = require('../data/statistic_name_list.json') as string[]

export type StatPath = string & { __statPath: true }

export type CategoryIdentifier = (typeof rawStatsTree)[number]['id']
export type GroupIdentifier = (typeof rawStatsTree)[number]['contents'][number]['id']
export type Year = Exclude<(typeof rawStatsTree)[number]['contents'][number]['contents'][number]['year'], null>
export type DataSource = Exclude<(typeof rawStatsTree)[number]['contents'][number]['contents'][number]['stats_by_source'][number]['stats'][number]['source'], null>
export type SourceCategoryIdentifier = DataSource['category']
export type SourceIdentifier = DataSource['name']

export type StatsTree = Category[]
export interface Category {
    kind: 'Category'
    id: CategoryIdentifier
    name: string
    contents: Group[]
    years: Set<Year | null> // for which years does this category have data
    statPaths: Set<StatPath> // which StatPaths does this category contain
}

export interface Group {
    kind: 'Group'
    id: GroupIdentifier
    name: string
    contents: GroupYear[]
    parent: Category
    years: Set<Year | null> // for which years does this group have data
    statPaths: Set<StatPath> // which StatPaths does this group contain
}

export interface GroupYear {
    year: Year | null
    stats: MultiSourceStatistic[]
    parent: Group
}

export interface MultiSourceStatistic {
    name: string
    by_source: Statistic[]
}

export interface Statistic {
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- this should be fine even if there's never any non-null source
    source: DataSource | null
    path: StatPath
    name: string
    parent: GroupYear
}

export const statsTree: StatsTree = rawStatsTree.map(category => (
    {
        kind: 'Category',
        ...category,
        contents: category.contents.map(group => ({
            kind: 'Group',
            ...group,
            contents: group.contents.map(({ year, stats_by_source }) => ({
                year,
                stats: stats_by_source.map(({ name, stats }) => ({
                    name,
                    by_source: stats.map(({ source, column }) => ({
                        source,
                        path: statPaths[column],
                        name: statNames[column],
                        parent: undefined as unknown as GroupYear, // set below
                    } satisfies Statistic)),
                } satisfies MultiSourceStatistic)),
                parent: undefined as unknown as Group, // set below
            } satisfies GroupYear)),
            parent: undefined as unknown as Category, // set below
            years: new Set(group.contents.map(({ year }) => year)),
            statPaths: new Set(), // set below
        } satisfies Group)),
        years: new Set(), // set below
        statPaths: new Set(), // set below
    } satisfies Category
))

// For a given year, what statpaths does it include
export const yearStatPaths = new DefaultMap<Year, Set<StatPath>>(() => new Set())

// Build references
for (const category of statsTree) {
    for (const group of category.contents) {
        group.parent = category
        for (const yearGroup of group.contents) {
            yearGroup.parent = group
            for (const stats_by_source of yearGroup.stats) {
                for (const stat of stats_by_source.by_source) {
                    stat.parent = yearGroup
                    group.statPaths.add(stat.path)
                    category.statPaths.add(stat.path)
                    if (yearGroup.year !== null) {
                        yearStatPaths.get(yearGroup.year).add(stat.path)
                    }
                }
            }
            category.years.add(yearGroup.year)
        }
    }
}

function sortYears(year1: Year, year2: Year): number {
    return year2 - year1
}

export const allGroups = statsTree.flatMap(category => category.contents)
export const allYears = Array.from(
    new Set(allGroups
        .flatMap(group => Array.from(group.years))
        .filter(year => year !== null)),
).sort(sortYears)

const statParentsList: [StatPath, { group: Group, year: Year | null, source: DataSource | null }][] = allGroups
    .flatMap(group => group.contents
        .flatMap(({ year, stats }) => stats
            .flatMap(stat => stat.by_source
                .map(({ source, path }) =>
                    [path, { group, year, source }] satisfies [StatPath, { group: Group, year: Year | null, source: DataSource | null }]))))

export const statParents = new Map<StatPath, { group: Group, year: Year | null, source: DataSource | null }>(
    statParentsList,
)

export const statPathToOrder = new Map<StatPath, number>(
    statParentsList.map(([statPath], i) => [statPath, i] as const),
)

export const statDataOrderToOrder = new Map<number, number>(
    statPaths.map((statPath, i) => [i, statPathToOrder.get(statPath)!] as const),
)

export type AmbiguousSources = Map<SourceCategoryIdentifier, Set<SourceIdentifier>>
export type DataSourceCheckboxes = { category: SourceCategoryIdentifier, names: SourceIdentifier[] }[]

export function findAmbiguousSources(paths: StatPath[]): AmbiguousSources {
    const sources = paths.map(statPath => statParents.get(statPath)!.source)
    const ambiguousSources = new Map<SourceCategoryIdentifier, Set<SourceIdentifier>>()
    for (const source of sources) {
        if (source === null) {
            continue
        }
        const category = source.category
        const name = source.name
        if (!ambiguousSources.has(category)) {
            ambiguousSources.set(category, new Set())
        }
        ambiguousSources.get(category)!.add(name)
    }
    // delete all length-1 categories
    for (const [category, names] of ambiguousSources.entries()) {
        if (names.size === 1) {
            ambiguousSources.delete(category)
        }
    }
    return ambiguousSources
}

export function sourceDisambiguation(ambiguousSources: AmbiguousSources): DataSourceCheckboxes {
    return dataSources
        .filter(({ category }) => ambiguousSources.has(category) && ambiguousSources.get(category)!.size > 1)
        .map(({ category, sources }) => ({
            category,
            names: Array.from(sources).filter(source => ambiguousSources.has(category) && ambiguousSources.get(category)!.has(source)),
        }))
}
