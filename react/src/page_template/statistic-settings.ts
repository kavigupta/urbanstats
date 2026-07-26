import { useContext } from 'react'

import { dataSources } from '../data/statistics_tree'
import { Navigator } from '../navigation/Navigator'

import { isStagedChange, Settings, settingValue, sourceEnabledKey, StatGroupKey, StatYearKey, StatSourceKey, useSetting, useSettings, useSettingsInfo } from './settings'
import { allGroups, allYears, AmbiguousSources, Category, DataSource, DataSourceCheckboxes, findAmbiguousSourcesAll, Group, sourceDisambiguation, statParents, StatPath, statsTree, Year, yearStatPaths } from './statistic-tree'

export type StatGroupSettings = Record<StatGroupKey | StatYearKey | StatSourceKey, boolean>

export function statIsEnabled(statId: StatPath, settings: StatGroupSettings, sourcesByCategory: AmbiguousSources): boolean {
    const { group, year, source } = statParents.get(statId)!
    return settings[`show_stat_group_${group.id}`]
        && (year !== null ? settings[`show_stat_year_${year}`] : true)
        && (source !== null ? sourceApplies(source, settings, sourcesByCategory) : true)
}

function sourceApplies(source: DataSource, settings: StatGroupSettings, sourcesByCategory: AmbiguousSources): boolean {
    if (!sourcesByCategory.has(source.category)) {
        return true
    }
    if (!sourcesByCategory.get(source.category)!.chooseable.has(source.name)) {
        return true
    }
    return settings[sourceEnabledKey(source) satisfies StatSourceKey]
}

function groupKeys(groups: Group[]): StatGroupKey[] {
    return groups.map(group => `show_stat_group_${group.id}` as const)
}

function yearKeys(years: Year[]): StatYearKey[] {
    return years.map(year => `show_stat_year_${year}` as const)
}

/** Everything that selects which statistics are shown apart from the group checkboxes. */
export function yearSourceKeys(): (StatYearKey | StatSourceKey)[] {
    return [
        ...yearKeys(allYears),
        ...dataSources.flatMap(({ category, sources }) => sources.map(({ source }) => sourceEnabledKey({ category, name: source }))),
    ]
}

export function statGroupKeys(): StatGroupKey[] {
    return groupKeys(allGroups)
}

export function groupYearKeys(): (keyof StatGroupSettings)[] {
    return [
        ...statGroupKeys(),
        ...yearSourceKeys(),
    ]
}

/**
 * Every group checkbox forced on, for the views that show the whole statistic tree rather
 * than the current selection. Spread over the year and source settings to complete a
 * `StatGroupSettings`.
 */
export const allStatGroupsEnabled = Object.fromEntries(
    groupKeys(allGroups).map(key => [key, true]),
) as Record<StatGroupKey, boolean>

function categoryStatus(enabled: boolean[]): boolean | 'indeterminate' {
    const checkedGroups = enabled.filter(value => value).length

    switch (checkedGroups) {
        case 0:
            return false
        case enabled.length:
            return true
        default:
            return 'indeterminate'
    }
}

function changeStatGroupSetting(settings: Settings, group: Group, newValue: boolean): void {
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

/**
 * State machine:
 *
 * indeterminate -> checked -> unchecked -(if nonempty saved indeterminate)-> indeterminate
 *                                       -(if empty saved indeterminate)-> checked
 */
function toggleCategorySetting(settings: Settings, category: Category, availableGroups: Group[], status: boolean | 'indeterminate'): void {
    const setAllGroups = (value: (group: Group) => boolean): void => {
        category.contents.forEach((group) => { settings.setSetting(`show_stat_group_${group.id}`, value(group)) })
    }
    switch (status) {
        case 'indeterminate':
            setAllGroups(() => true)
            break
        case true:
            setAllGroups(() => false)
            break
        case false:
            const savedDeterminate = new Set(settings.get(`stat_category_saved_indeterminate_${category.id}`))
            // The saved state can refer to groups that don't exist on this page, which would restore nothing
            if (availableGroups.every(group => !savedDeterminate.has(group.id))) {
                setAllGroups(() => true)
            }
            else {
                setAllGroups(group => savedDeterminate.has(group.id))
            }
            break
    }
}

export interface GroupTreeState {
    group: Group
    enabled: boolean
    setEnabled: (enabled: boolean) => void
    highlight: boolean
}

export interface CategoryTreeState {
    status: boolean | 'indeterminate'
    toggle: () => void
    highlight: boolean
    expanded: boolean
    setExpanded: (expanded: boolean) => void
    groups: GroupTreeState[]
}

/**
 * State for one category of the statistic tree. The tree is rendered on both the article
 * table's edit mode and the comparison table's, with different layouts; sharing the state
 * here keeps them from disagreeing about what a checkbox means.
 */
export function useCategoryTreeState(category: Category): CategoryTreeState {
    const settings = useContext(Settings.Context)
    const availableGroups = useAvailableGroups(category)
    const info = useSettingsInfo(groupKeys(availableGroups))
    const [expanded, setExpanded] = useSetting(`stat_category_expanded_${category.id}`)

    const groups = availableGroups.map(group => ({
        group,
        enabled: settingValue(info[`show_stat_group_${group.id}`]),
        setEnabled: (newValue: boolean) => { changeStatGroupSetting(settings, group, newValue) },
        highlight: isStagedChange(info[`show_stat_group_${group.id}`]),
    }))

    const status = categoryStatus(groups.map(group => group.enabled))

    return {
        status,
        toggle: () => { toggleCategorySetting(settings, category, availableGroups, status) },
        highlight: groups.some(group => group.highlight),
        expanded,
        setExpanded,
        groups,
    }
}

function searchMatch(searchTerm: string, target: string): boolean {
    return target.toLowerCase().includes(searchTerm.toLowerCase())
}

/**
 * The categories a search term shows. A category whose own name matches is kept
 * whole; otherwise it is narrowed to its matching groups, and dropped if none match.
 *
 * Narrowing produces a category whose `contents` are just the matches, which scopes
 * everything downstream (including useCategoryTreeState) to those groups — so while
 * searching, the category checkbox acts on what's visible rather than on the groups
 * the search is hiding.
 */
export function useCategoriesMatchingSearch(searchTerm: string): Category[] {
    const categories = useAvailableCategories()
    const groups = useAvailableGroups()
    return categories.flatMap((category) => {
        if (searchMatch(searchTerm, category.name)) {
            return [category]
        }
        const contents = category.contents.filter(group => groups.includes(group) && searchMatch(searchTerm, group.name))
        return contents.length > 0 ? [{ ...category, contents }] : []
    })
}

export function useSelectedGroups(): Group[] {
    const availableGroups = useAvailableGroups()
    const settingsValues = useSettings(groupKeys(availableGroups))
    return availableGroups.filter(group => settingsValues[`show_stat_group_${group.id}`])
}

export function useSelectedYears(): Year[] {
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

function useStatPaths(): StatPath[] {
    return useStatPathsAll().flat()
}

export function getAvailableGroups(contextStatPaths: StatPath[], category?: Category): Group[] {
    // Find the intersection between the stat paths we have loaded in the context and the groups that are available
    // This is so we can show the user only the groups that will actually show up
    return (category?.contents ?? allGroups).filter(group => contextStatPaths.some(statPath => group.statPaths.has(statPath)))
}

function useAvailableGroups(category?: Category): Group[] {
    const contextStatPaths = useStatPaths()
    return getAvailableGroups(contextStatPaths, category)
}

function getAvailableCategories(contextStatPaths: StatPath[]): Category[] {
    // Find the intersection between the stat paths we have loaded in the context and the categories that are available
    // This is so we can show the user only the categories that will actually show up
    return statsTree.filter(category => contextStatPaths.some(statPath => category.statPaths.has(statPath)))
}

function useAvailableCategories(): Category[] {
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
