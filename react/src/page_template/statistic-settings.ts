import { useContext } from 'react'

import { dataSources } from '../data/statistics_tree'
import { Navigator } from '../navigation/Navigator'

import { Settings, sourceEnabledKey, StatGroupKey, StatYearKey, StatSourceKey, useSettings } from './settings'
import { allGroups, allYears, AmbiguousSources, Category, DataSource, DataSourceCheckboxes, findAmbiguousSourcesAll, Group, sourceDisambiguation, statParents, StatPath, statsTree, Year, yearStatPaths } from './statistic-tree'

export type StatGroupSettings = Record<StatGroupKey | StatYearKey | StatSourceKey, boolean>

export function statIsEnabled(statId: StatPath, settings: StatGroupSettings, sourcesByCategory: AmbiguousSources): boolean {
    const { group, year, source } = statParents.get(statId)!
    return settings[`show_stat_group_${group.id}`]
        && (year !== null ? settings[`show_stat_year_${year}`] : true)
        && (source !== null ? sourceApplies(source, settings, sourcesByCategory) : true)
}

export function sourceApplies(source: DataSource, settings: StatGroupSettings, sourcesByCategory: AmbiguousSources): boolean {
    if (!sourcesByCategory.has(source.category)) {
        return true
    }
    if (!sourcesByCategory.get(source.category)!.chooseable.has(source.name)) {
        return true
    }
    return settings[sourceEnabledKey(source) satisfies StatSourceKey]
}

export function groupKeys(groups: Group[]): StatGroupKey[] {
    return groups.map(group => `show_stat_group_${group.id}` as const)
}

function yearKeys(years: Year[]): StatYearKey[] {
    return years.map(year => `show_stat_year_${year}` as const)
}

export function groupYearKeys(): (keyof StatGroupSettings)[] {
    return [
        ...groupKeys(allGroups),
        ...allYears.map(year => `show_stat_year_${year}` as const),
        ...dataSources.flatMap(({ category, sources }) => sources.map(({ source }) => sourceEnabledKey({ category, name: source }))),
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

function useSelectedYears(): Year[] {
    const availableYears = useAvailableYears()
    const settingsValues = useSettings(yearKeys(availableYears))
    return availableYears.filter(year => settingsValues[`show_stat_year_${year}`])
}

/**
 * Which groups are selected, but are not showing any statistics because no intersecting years are selected.
 */
export function useGroupsMissingYearSelection(): (Group | Category)[] {
    const selectedGroups = useSelectedGroups()
    const selectedYears = useSelectedYears()
    const groupsMissingYears = selectedGroups.filter(group => !group.years.has(null) && selectedYears.every(year => !group.years.has(year)))
    return useConsolidateGroups()(groupsMissingYears)
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

export function useStatPathsAll(): StatPath[][] {
    return useContext(Navigator.Context).useStatPathsAll() ?? (() => { throw new Error('Current page does not have StatPath information') })()
}

export function useStatPaths(): StatPath[] {
    return useStatPathsAll().flat()
}

export function getAvailableGroups(contextStatPaths: StatPath[], category?: Category): Group[] {
    // Find the intersection between the stat paths we have loaded in the context and the groups that are available
    // This is so we can show the user only the groups that will actually show up
    return (category?.contents ?? allGroups).filter(group => contextStatPaths.some(statPath => group.statPaths.has(statPath)))
}

export function useAvailableGroups(category?: Category): Group[] {
    const contextStatPaths = useStatPaths()
    return getAvailableGroups(contextStatPaths, category)
}

export function getAvailableCategories(contextStatPaths: StatPath[]): Category[] {
    // Find the intersection between the stat paths we have loaded in the context and the categories that are available
    // This is so we can show the user only the categories that will actually show up
    return statsTree.filter(category => contextStatPaths.some(statPath => category.statPaths.has(statPath)))
}

export function useAvailableCategories(): Category[] {
    const contextStatPaths = useStatPaths()
    return getAvailableCategories(contextStatPaths)
}

export function getAvailableYears(contextStatPaths: StatPath[]): Year[] {
    // Find the intersection between the stat paths we have loaded in the context and the years that are available
    // This is so we can show the user only the years that will actually show up
    return allYears.filter(year => contextStatPaths.some(statPath => yearStatPaths.get(year).has(statPath)))
}

export function useAvailableYears(): Year[] {
    const contextStatPaths = useStatPaths()
    return getAvailableYears(contextStatPaths)
}

export function getDataSourceCheckboxes(statPathsAll: StatPath[][]): DataSourceCheckboxes {
    const ambiguousSources = findAmbiguousSourcesAll(statPathsAll)
    const checkboxes = sourceDisambiguation(ambiguousSources)
    return checkboxes
}

export function useDataSourceCheckboxes(): DataSourceCheckboxes {
    const statPathsAll = useStatPathsAll()
    return getDataSourceCheckboxes(statPathsAll)
}
