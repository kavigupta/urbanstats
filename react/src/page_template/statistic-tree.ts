import statNames from '../data/statistic_name_list'
import statPaths from '../data/statistic_path_list'
import { rawStatsTree, dataSources } from '../data/statistics_tree'
import { DefaultMap } from '../utils/DefaultMap'

export type StatPath = (typeof statPaths)[number]

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

const statParentsList: [StatPath, { category: CategoryIdentifier, group: Group, year: Year | null, source: DataSource | null }][] = allGroups
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

export interface DataSourceCheckbox { name: SourceIdentifier, forcedOn: boolean }

export type DataSourceCheckboxes = { category: SourceCategoryIdentifier, checkboxSpecs: DataSourceCheckbox[] }[]

function findAmbiguousSources(paths: StatPath[]): Map<SourceCategoryIdentifier, Set<SourceIdentifier>> {
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
    return ambiguousSources
}

export type AmbiguousSources = Map<SourceCategoryIdentifier, { chooseable: Set<SourceIdentifier>, forcedOn: Set<SourceIdentifier> }>
// Rule being followed here is somewhat nontrivial, but it exists to avoid showing a checkbox menu
// in situations where unchecking boxes (which might be done by default) would result in no data
// being shown at all.

// The idea is to show a checkbox menu for all the checkboxes for each category that have more than
// one source, but to not show a checkbox for any source where unchecking it would result in no data
// for any of the articles.
export function findAmbiguousSourcesAll(statPathsEach: StatPath[][]): AmbiguousSources {
    const ambiguousSourcesAll = statPathsEach.map(findAmbiguousSources)
    const categoriesAll = new Set(ambiguousSourcesAll.flatMap(ambiguousSources => Array.from(ambiguousSources.keys())))
    const result = new Map<SourceCategoryIdentifier, { chooseable: Set<SourceIdentifier>, forcedOn: Set<SourceIdentifier> }>()
    for (const category of categoriesAll) {
        const namesEach = ambiguousSourcesAll.map(ambiguousSources => ambiguousSources.get(category) ?? new Set() satisfies Set<SourceIdentifier>)
        const union = new Set(Array.from(namesEach[0]))
        for (const names of namesEach.slice(1)) {
            for (const name of names) {
                union.add(name)
            }
        }
        const singletons = new Set(namesEach.filter(names => names.size === 1).map(names => Array.from(names)[0])) satisfies Set<SourceIdentifier>
        for (const name of singletons) {
            union.delete(name)
        }
        result.set(category, { chooseable: union, forcedOn: singletons })
    }
    return result
}

export function sourceDisambiguation(ambiguousSources: AmbiguousSources): DataSourceCheckboxes {
    function splitSources(sources: SourceIdentifier[], ambiguous: { chooseable: Set<SourceIdentifier>, forcedOn: Set<SourceIdentifier> }): DataSourceCheckbox[] {
        const result = []
        for (const source of sources) {
            let forcedOn
            if (ambiguous.forcedOn.has(source)) {
                forcedOn = true
            }
            else if (ambiguous.chooseable.has(source)) {
                forcedOn = false
            }
            else {
                continue
            }
            result.push({ name: source, forcedOn })
        }
        return result
    }

    return dataSources
        .filter(({ category }) => ambiguousSources.has(category) && ambiguousSources.get(category)!.chooseable.size > 0)
        .map(({ category, sources }) => ({
            category,
            checkboxSpecs: splitSources(sources.map(({ source }) => source), ambiguousSources.get(category)!),
        }))
}
