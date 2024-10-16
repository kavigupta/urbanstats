import { createContext, useContext } from 'react'

import { DefaultMap } from '../utils/DefaultMap'

import { Settings, StatGroupKey, StatYearKey, useSettings } from './settings'

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
const yearStatPaths = new DefaultMap<number, Set<StatPath>>(() => new Set())

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

const statParents = new Map<StatPath, { group: Group, year: number | null }>(
    allGroups
        .flatMap(group => group.contents
            .flatMap(({ year, stats }) => stats
                .map(stat => [stat.path, { group, year }]))),
)

export type StatGroupSettings = Record<StatGroupKey | StatYearKey, boolean>

export function statIsEnabled(statId: StatPath, settings: StatGroupSettings): boolean {
    const { group, year } = statParents.get(statId)!
    return settings[`show_stat_group_${group.id}`]
        && (year !== null ? settings[`show_stat_year_${year}`] : true)
}

export function groupKeys(groups: Group[]): StatGroupKey[] {
    return groups.map(group => `show_stat_group_${group.id}` as const)
}

function yearKeys(years: number[]): StatYearKey[] {
    return years.map(year => `show_stat_year_${year}` as const)
}

export function groupYearKeys(): (keyof StatGroupSettings)[] {
    return [
        ...groupKeys(allGroups),
        ...allYears.map(year => `show_stat_year_${year}` as const),
    ]
}

export function useCategoryStatus(category: Category): boolean | 'indeterminate' {
    const groups = useAvailableGroups(category)
    const settingsValues = useSettings(groupKeys(groups))
    const checkedGroups = groups.filter(group => settingsValues[`show_stat_group_${group.id}`]).length

    let result: boolean | 'indeterminate'

    switch (checkedGroups) {
        case 0:
            result = false
            break
        case groups.length:
            result = true
            break
        default:
            result = 'indeterminate'
            break
    }

    return result
}

export function changeStatGroupSetting(settings: Settings, group: Group, newValue: boolean): void {
    settings.setSetting(`show_stat_group_${group.id}`, newValue)
    saveIndeterminateState(settings, group.parent)
}

function saveIndeterminateState(settings: Settings, category: Category): void {
    settings.setSetting(
        `stat_category_saved_indeterminate_${category.id}`,
        category.contents
            .map(group => group.id)
            .filter(id => settings.get(`show_stat_group_${id}`)),
    )
}

export function useChangeCategorySetting(category: Category): () => void {
    const categoryStatus = useCategoryStatus(category)
    const settings = useContext(Settings.Context)
    return () => {
        /**
     * State machine:
     *
     * indeterminate -> checked -> unchecked -(if nonempty saved indeterminate)-> indeterminate
     *                                       -(if empty saved indeterminate)-> checked
     */
        switch (categoryStatus) {
            case 'indeterminate':
                category.contents.forEach((group) => { settings.setSetting(`show_stat_group_${group.id}`, true) })
                break
            case true:
                category.contents.forEach((group) => { settings.setSetting(`show_stat_group_${group.id}`, false) })
                break
            case false:
                const savedDeterminate = new Set(settings.get(`stat_category_saved_indeterminate_${category.id}`))
                if (savedDeterminate.size === 0) {
                    category.contents.forEach((group) => { settings.setSetting(`show_stat_group_${group.id}`, true) })
                }
                else {
                    category.contents.forEach((group) => { settings.setSetting(`show_stat_group_${group.id}`, savedDeterminate.has(group.id)) })
                }
                break
        }
    }
}

export function useSelectedGroups(): Group[] {
    const availableGroups = useAvailableGroups()
    const settingsValues = useSettings(groupKeys(availableGroups))
    return availableGroups.filter(group => settingsValues[`show_stat_group_${group.id}`])
}

function useSelectedYears(): number[] {
    const availableYears = useAvailableYears()
    const settingsValues = useSettings(yearKeys(availableYears))
    return availableYears.filter(year => settingsValues[`show_stat_year_${year}`])
}

/**
 * Which groups are selected, but are not showing any statistics because no years are selected.
 */
export function useGroupsMissingYearSelection(): (Group | Category)[] {
    const selectedGroups = useSelectedGroups()
    const selectedYears = useSelectedYears()
    const consolidateGroups = useConsolidateGroups()
    if (selectedYears.length > 0) {
        return []
    }
    const groupsThatNeedAYear = selectedGroups.filter(group => !group.years.has(null))
    return consolidateGroups(groupsThatNeedAYear)
}

/**
 * For each year, what groups are selected that don't have data for that year.
 *
 * Don't include years with no problems
 */
export function useGroupsMissingYearData(): {
    year: number
    groups: (Group | Category)[]
}[] {
    const selectedGroups = useSelectedGroups()
    const selectedYears = useSelectedYears()
    const consolidateGroups = useConsolidateGroups()
    return selectedYears.map(year => ({
        year,
        groups: consolidateGroups(selectedGroups.filter(group => !group.years.has(year) && !group.years.has(null))),
    })).filter(({ groups }) => groups.length > 0)
}

/**
 * If all of the groups in a category are present in-order in the list, replace them with that category
 *
 * `groups` **must** be a subset of available groups
 */
function useConsolidateGroups(): (groups: Group[]) => (Group | Category)[] {
    const contextStatPaths = useStatPaths()
    const availableCategories = useAvailableCategories()
    return (groups) => {
        const result: (Group | Category)[] = []
        let indexOfGroup = 0
        for (const category of availableCategories) {
            const categoryContents = category.contents.filter(group => contextStatPaths.some(statPath => group.statPaths.has(statPath)))
            let indexInCategory = 0
            const startIndexOfGroup = indexOfGroup
            while (indexInCategory < categoryContents.length && groups[indexOfGroup] === categoryContents[indexInCategory]) {
                // Step through the groups and the category contents while they match
                indexOfGroup++
                indexInCategory++
            }
            if (indexInCategory === categoryContents.length) {
                // If we matched the entire category, place it in the result
                result.push(category)
            }
            else {
                // If not, push all the groups we iterated through
                result.push(...groups.slice(startIndexOfGroup, indexOfGroup))
            }
            if (indexOfGroup > groups.length) {
                throw new Error('Something has gone terribly wrong')
            }
        }
        result.push(...groups.slice(indexOfGroup))
        return result
    }
}

/**
 * Provides information about what stat paths can be loaded for whatever we're viewing.
 *
 * This way, we can reason about groups and categories based on what is available to the user in this context.
 *
 * This allows us to not show the user checkboxes that do nothing.
 */
export const StatPathsContext = createContext<StatPath[] | undefined>(undefined)

function useStatPaths(): StatPath[] {
    return useContext(StatPathsContext) ?? (() => { throw new Error('Using Statistics settings without StatPathsContext') })()
}

export function useAvailableGroups(category?: Category): Group[] {
    const contextStatPaths = useStatPaths()
    // Find the intersection between the stat paths we have loaded in the context and the groups that are available
    // This is so we can show the user only the groups that will actually show up
    return (category?.contents ?? allGroups).filter(group => contextStatPaths.some(statPath => group.statPaths.has(statPath)))
}

export function useAvailableCategories(): Category[] {
    const contextStatPaths = useStatPaths()
    // Find the intersection between the stat paths we have loaded in the context and the categories that are available
    // This is so we can show the user only the categories that will actually show up
    return statsTree.filter(category => contextStatPaths.some(statPath => category.statPaths.has(statPath)))
}

export function useAvailableYears(): number[] {
    const contextStatPaths = useStatPaths()
    return allYears.filter(year => contextStatPaths.some(statPath => yearStatPaths.get(year).has(statPath)))
}
