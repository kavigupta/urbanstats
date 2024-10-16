import { Settings, StatGroupKey, StatYearKey, useSettings } from './settings'

export type CategoryIdentifier = string & { __categoryIdentifier: true }
export type GroupIdentifier = string & { __groupIdentifier: true }
export type StatPath = string & { __statPath: true }
export type StatIndex = number & { __statIndex: true }

export type StatsTree = Category[]
export interface Category {
    id: CategoryIdentifier
    name: string
    contents: Group[]
    years: Set<number | null> // for which years does this category have data
    hierarchicalName: string
}

export interface Group {
    id: GroupIdentifier
    name: string
    contents: GroupYear[]
    parent: Category
    years: Set<number | null> // for which years does this group have data
    hierarchicalName: `${string} > ${string}`
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
        ...category,
        hierarchicalName: category.name,
        contents: category.contents.map(group => ({
            ...group,
            hierarchicalName: `${category.name} > ${group.name}`,
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
        } satisfies Group)),
        years: new Set(),
    } satisfies Category
))

// Build references
for (const category of statsTree) {
    for (const group of category.contents) {
        group.parent = category
        for (const yearGroup of group.contents) {
            yearGroup.parent = group
            for (const stat of yearGroup.stats) {
                stat.parent = yearGroup
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

export function getCategoryStatus(groupSettingsValues: Record<StatGroupKey, boolean>): boolean | 'indeterminate' {
    const statisticSettings = Object.entries(groupSettingsValues)
    const totalStatistics = statisticSettings.length
    const totalCheckedStatistics = statisticSettings.filter(([, checked]) => checked).length

    let result: boolean | 'indeterminate'

    switch (totalCheckedStatistics) {
        case 0:
            result = false
            break
        case totalStatistics:
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

export function changeCategorySetting(settings: Settings, category: Category): void {
    const categoryStatus = getCategoryStatus(settings.getMultiple(groupKeys(category.contents)))
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

export function useSelectedGroups(): Group[] {
    const settingsValues = useSettings(groupKeys(allGroups))
    return allGroups.filter(group => settingsValues[`show_stat_group_${group.id}`])
}

/**
 * Which groups are selected, but are not showing any statistics because of year settings.
 *
 * If all of the groups in a category are selected, include the category instead
 */
export function useAnachronisticSelectedGroups(): (Group | Category)[] {
    const selectedGroups = useSelectedGroups()
    const yearSettings = useSettings(yearKeys(allYears))
    const resultGroups = selectedGroups.filter(group =>
        !Array.from(group.years)
            .some(year => year === null || yearSettings[`show_stat_year_${year}`]),
    )
    return consolidateGroups(resultGroups)
}

/**
 * If all of the groups in a category are present in-order in the list, replace them with that category
 */
function consolidateGroups(groups: Group[]): (Group | Category)[] {
    const result: (Group | Category)[] = []
    let indexOfGroup = 0
    for (const category of statsTree) {
        let indexInCategory = 0
        const startIndexOfGroup = indexOfGroup
        while (indexInCategory < category.contents.length && groups[indexOfGroup] === category.contents[indexInCategory]) {
            // Step through the groups and the category contents while they match
            indexOfGroup++
            indexInCategory++
        }
        if (indexInCategory === category.contents.length) {
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

/**
 * Which years are selected, but aren't showing any statistics because of group settings.
 */
export function useEmptyYears(): number[] {
    const selectedGroups = useSelectedGroups()
    const yearSettings = useSettings(yearKeys(allYears))
    return allYears.filter(year =>
        yearSettings[`show_stat_year_${year}`]
        && !selectedGroups.some(group => group.years.has(year)),
    )
}
