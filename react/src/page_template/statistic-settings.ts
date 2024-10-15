import { Settings, StatGroupKey, StatYearKey } from './settings'

export type CategoryIdentifier = string & { __categoryIdentifier: true }
export type GroupIdentifier = string & { __groupIdentifier: true }
export type StatIdentifier = string & { __statisticIdentifier: true }

export type StatisticsTree = Category[]
export interface Category {
    id: CategoryIdentifier
    name: string
    contents: Group[]
}

export interface Group {
    id: GroupIdentifier
    name: string
    contents: {
        year: number
        stats: StatIdentifier[]
    }[]
    parent: Category // Not present in the JSON, but built below
}

export const statsTree = require('../data/statistics_tree.json') as StatisticsTree

// Build references
for (const category of statsTree) {
    for (const group of category.contents) {
        group.parent = category
    }
}

export const allGroups = statsTree.flatMap(category => category.contents)
export const allYears = allGroups.flatMap(group => group.contents.map(({ year }) => year)).sort((a, b) => a - b)

const statParents = new Map<StatIdentifier, { group: Group, year: number }>(
    allGroups
        .flatMap(group => group.contents
            .flatMap(({ year, stats }) => stats
                .map(statId => [statId, { group, year }]))),
)

export type StatGroupSettings = Record<StatGroupKey | StatYearKey, boolean>

export function statIsEnabled(statId: StatIdentifier, settings: StatGroupSettings): boolean {
    const { group, year } = statParents.get(statId)!
    return settings[`show_stat_group_${group.id}`] && settings[`show_stat_year_${year}`]
}

export function groupKeys(partialGroups: Group[]): StatGroupKey[] {
    return partialGroups.map(group => `show_stat_group_${group.id}` as const)
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
