import { DefaultMap } from '../utils/DefaultMap'

export type CategoryIdentifier = string & { __categoryIdentifier: true }
export type GroupIdentifier = string & { __groupIdentifier: true }
export type StatPath = string & { __statPath: true }
export type StatIndex = number & { __statIndex: true }

export type StatsTree = Category[]
export interface Category {
    kind: 'Category'
    id: CategoryIdentifier
    name: string
    contents: Group[]
    years: Set<number | null> // for which years does this category have data
    statPaths: Set<StatPath> // which StatPaths does this category contain
}

export interface Group {
    kind: 'Group'
    id: GroupIdentifier
    name: string
    contents: GroupYear[]
    parent: Category
    years: Set<number | null> // for which years does this group have data
    statPaths: Set<StatPath> // which StatPaths does this group contain
}

export interface GroupYear {
    year: number | null
    stats: Statistic[]
    parent: Group
}

export interface Statistic {
    path: StatPath
    name: string
    parent: GroupYear
}

export const rawStatsTree = require('../data/statistics_tree.json') as {
    id: CategoryIdentifier
    name: string
    contents: {
        id: GroupIdentifier
        name: string
        contents: {
            year: number | null
            stats: StatIndex[]
        }[]
    }[] }[]

const statPaths = require('../data/statistic_path_list.json') as StatPath[]
const statNames = require('../data/statistic_name_list.json') as string[]

export const statsTree: StatsTree = rawStatsTree.map(category => (
    {
        kind: 'Category',
        ...category,
        contents: category.contents.map(group => ({
            kind: 'Group',
            ...group,
            contents: group.contents.map(({ year, stats }) => ({
                year,
                stats: stats.map(statIndex => ({
                    path: statPaths[statIndex],
                    name: statNames[statIndex],
                    parent: undefined as unknown as GroupYear, // set below
                } satisfies Statistic)),
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
export const yearStatPaths = new DefaultMap<number, Set<StatPath>>(() => new Set())

// Build references
for (const category of statsTree) {
    for (const group of category.contents) {
        group.parent = category
        for (const yearGroup of group.contents) {
            yearGroup.parent = group
            for (const stat of yearGroup.stats) {
                stat.parent = yearGroup
                group.statPaths.add(stat.path)
                category.statPaths.add(stat.path)
                if (yearGroup.year !== null) {
                    yearStatPaths.get(yearGroup.year).add(stat.path)
                }
            }
            category.years.add(yearGroup.year)
        }
    }
}

export function sortYears(year1: number, year2: number): number {
    return year2 - year1
}

export const allGroups = statsTree.flatMap(category => category.contents)
export const allYears = Array.from(
    new Set(allGroups
        .flatMap(group => Array.from(group.years))
        .filter(year => year !== null)),
).sort(sortYears)

export const statParents = new Map<StatPath, { group: Group, year: number | null }>(
    allGroups
        .flatMap(group => group.contents
            .flatMap(({ year, stats }) => stats
                .map(stat => [stat.path, { group, year }]))),
)
