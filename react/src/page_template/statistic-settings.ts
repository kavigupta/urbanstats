import { useContext, useEffect, useMemo } from 'react'

import { dataSources } from '../data/statistics_tree'
import { Navigator } from '../navigation/Navigator'

import { isStagedChange, Settings, settingValue, sourceEnabledKey, StatGroupKey, StatYearKey, StatSourceKey, useSetting, useSettings, useSettingsInfo } from './settings'
import { allGroups, allYears, AmbiguousSources, Category, DataSource, DataSourceCheckboxes, findAmbiguousSourcesAll, Group, SourceCategoryIdentifier, sourceDisambiguation, statParents, StatPath, statsTree, Year, yearStatPaths } from './statistic-tree'

export type StatGroupSettings = Record<StatGroupKey | StatYearKey | StatSourceKey, boolean>

export function statIsEnabled(statId: StatPath, settings: StatGroupSettings, sourcesByCategory: AmbiguousSources): boolean {
    const { group, year } = statParents.get(statId)!
    return settings[`show_stat_group_${group.id}`]
        && (year !== null ? settings[`show_stat_year_${year}`] : true)
        && statSourceIsEnabled(statId, settings, sourcesByCategory)
}

function statSourceIsEnabled(statId: StatPath, settings: StatGroupSettings, sourcesByCategory: AmbiguousSources): boolean {
    const { source } = statParents.get(statId)!
    return source === null || sourceApplies(source, settings, sourcesByCategory)
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

export function groupKeys(groups: Group[]): StatGroupKey[] {
    return groups.map(group => `show_stat_group_${group.id}` as const)
}

function yearKeys(years: Year[]): StatYearKey[] {
    return years.map(year => `show_stat_year_${year}` as const)
}

/** Everything that selects which statistics are shown apart from the group checkboxes. */
function yearSourceKeys(): (StatYearKey | StatSourceKey)[] {
    return [
        ...yearKeys(allYears),
        ...dataSources.flatMap(({ category, sources }) => sources.map(({ source }) => sourceEnabledKey({ category, name: source }))),
    ]
}

export function groupYearKeys(): (keyof StatGroupSettings)[] {
    return [
        ...groupKeys(allGroups),
        ...yearSourceKeys(),
    ]
}

/**
 * Every group checkbox forced on, for the views that show the whole statistic tree rather
 * than the current selection. Spread over the year and source settings to complete a
 * `StatGroupSettings`.
 */
const allStatGroupsEnabled = Object.fromEntries(
    groupKeys(allGroups).map(key => [key, true]),
)

/**
 * The rows a table should display. With `showAllGroups`, every group is forced on, which is
 * what the edit tree wants: it shows the whole category/group tree rather than the current
 * selection.
 *
 * The group checkboxes are then deliberately not subscribed to either: they're all forced
 * on, so a click can't change this result, and re-running the filter and sort over every
 * statistic on each click would be wasted work.
 */
export function useVisibleRows<T>(rows: (settings: StatGroupSettings) => T, showAllGroups: boolean): T {
    const yearSourceSettings = useSettings(yearSourceKeys())
    const groupSettings = useSettings(showAllGroups ? [] : groupKeys(allGroups))
    return useMemo(
        () => rows({ ...yearSourceSettings, ...allStatGroupsEnabled, ...groupSettings }),
        [rows, yearSourceSettings, groupSettings],
    )
}

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

/** The sidebar's stat tree still drives its checkboxes through these; the edit tree uses useCategoryTreeState. */
export function useCategoryStatus(category: Category): boolean | 'indeterminate' {
    const groups = useAvailableGroups(category)
    const settingsValues = useSettings(groupKeys(groups))
    return categoryStatus(groups.map(group => settingsValues[`show_stat_group_${group.id}`]))
}

export function useChangeCategorySetting(category: Category): () => void {
    const status = useCategoryStatus(category)
    const availableGroups = useAvailableGroups(category)
    const settings = useContext(Settings.Context)
    return () => { toggleCategorySetting(settings, category, availableGroups, status) }
}

export function useAvailableCategories(): Category[] {
    return useAvailableTree().categories
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

/**
 * Expands every category that would otherwise hide a change staging is making: a collapsed
 * category shows only its selected groups, so a group staging turns off leaves the category
 * highlighted with nothing behind it to see.
 *
 * Only acts when `active` becomes true (edit mode opening), so the user can collapse such a
 * category again while staging is still going on.
 */
export function useExpandCategoriesHidingStagedChanges(active: boolean): void {
    const settings = useContext(Settings.Context)
    const { categories, groups: availableGroups } = useAvailableTree()
    useEffect(() => {
        if (!active) {
            return
        }
        for (const category of categories) {
            const hidesStagedChange = category.contents.some((group) => {
                if (!availableGroups.has(group)) {
                    return false
                }
                const info = settings.getSettingInfo(`show_stat_group_${group.id}`)
                return isStagedChange(info) && !settingValue(info)
            })
            if (hidesStagedChange) {
                settings.setSetting(`stat_category_expanded_${category.id}`, true)
            }
        }
    }, [active, categories, availableGroups, settings])
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
    const { categories, groups } = useAvailableTree()
    return categories.flatMap((category) => {
        if (searchMatch(searchTerm, category.name)) {
            return [category]
        }
        const contents = category.contents.filter(group => groups.has(group) && searchMatch(searchTerm, group.name))
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

/** Why a group that the user selected is nonetheless showing no statistics. */
export type MissingGroupReason =
    /** None of `years` are selected: the years this page has the group's statistics for from an enabled source. */
    { kind: 'year', years: Year[] } |
    { kind: 'source', category: SourceCategoryIdentifier }

export interface MissingGroup {
    groupOrCategory: Group | Category
    reason: MissingGroupReason
}

/** Groups only consolidate into their category when their warnings would read identically. */
function reasonKey(reason: MissingGroupReason): string {
    switch (reason.kind) {
        case 'year':
            return `year_${reason.years.join(',')}`
        case 'source':
            return `source_${reason.category}`
    }
}

/**
 * Which selected groups are showing no statistics, and why. Groups are consolidated into their
 * category only when the whole category is missing for the same reason.
 */
export function useMissingGroups(): MissingGroup[] {
    const selectedGroups = useSelectedGroups()
    const selectedYears = useSelectedYears()
    const statPathsAll = useStatPathsAll()
    const settings = useSettings(groupYearKeys())
    const consolidateGroups = useConsolidateGroups()

    const pageStatPaths = useMemo(() => new Set(statPathsAll.flat()), [statPathsAll])
    const ambiguousSources = useMemo(() => findAmbiguousSourcesAll(statPathsAll), [statPathsAll])

    const missingReason = (group: Group): MissingGroupReason | undefined => {
        // Which years the group has data for is asked of this page rather than of the whole tree,
        // so that a page that only goes back to 2010 says so instead of naming a year it lacks.
        const paths = Array.from(group.statPaths).filter(path => pageStatPaths.has(path))
        if (paths.some(path => statIsEnabled(path, settings, ambiguousSources))) {
            return undefined
        }
        // Statistics whose source is enabled are held back by their year alone.
        const fromEnabledSources = paths.filter(path => statSourceIsEnabled(path, settings, ambiguousSources))
        const pathsInSelectedYears = paths.filter((path) => {
            const { year } = statParents.get(path)!
            return year === null || selectedYears.includes(year)
        })
        if (pathsInSelectedYears.length > 0) {
            // Everything in the selected years is disabled by its source, so we can name that source
            // category if they agree on one -- unless the group has a statistic from an enabled
            // source in another year, which would make "all of them are disabled" a lie.
            const categories = new Set(pathsInSelectedYears.map(path => statParents.get(path)!.source?.category))
            const [category] = categories
            if (categories.size === 1 && category !== undefined
                && !fromEnabledSources.some(path => statParents.get(path)!.source?.category === category)) {
                return { kind: 'source', category }
            }
        }
        // Otherwise it is the years that are missing: the ones selecting would bring the group back.
        const yearsToSelect = new Set(fromEnabledSources.map(path => statParents.get(path)!.year))
        const years = allYears.filter(year => yearsToSelect.has(year))
        return years.length > 0 ? { kind: 'year', years } : undefined
    }

    const byReason = new Map<string, { reason: MissingGroupReason, groups: Group[] }>()
    for (const group of selectedGroups) {
        const reason = missingReason(group)
        if (reason === undefined) {
            continue
        }
        const key = reasonKey(reason)
        if (!byReason.has(key)) {
            byReason.set(key, { reason, groups: [] })
        }
        byReason.get(key)!.groups.push(group)
    }

    return Array.from(byReason.values()).flatMap(({ reason, groups }) =>
        consolidateGroups(groups).map(groupOrCategory => ({ groupOrCategory, reason })))
}

/**
 * If all of the groups in a category are present in-order in the list, replace them with that category
 *
 * `groups` **must** be a subset of available groups
 */
function useConsolidateGroups(): (groups: Group[]) => (Group | Category)[] {
    const { categories: availableCategories, groups: availableGroups } = useAvailableTree()
    return (groups) => {
        const result: (Group | Category)[] = []
        let indexOfGroup = 0
        for (const category of availableCategories) {
            const categoryContents = category.contents.filter(group => availableGroups.has(group))
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

/** Whether a group's or category's statistics include any that the page has loaded. */
function intersectsPage(statPaths: Set<StatPath>, pageStatPaths: Set<StatPath>): boolean {
    for (const statPath of statPaths) {
        if (pageStatPaths.has(statPath)) {
            return true
        }
    }
    return false
}

export function getAvailableGroups(contextStatPaths: StatPath[], category?: Category): Group[] {
    // Find the intersection between the stat paths we have loaded in the context and the groups that are available
    // This is so we can show the user only the groups that will actually show up
    const pageStatPaths = new Set(contextStatPaths)
    return (category?.contents ?? allGroups).filter(group => intersectsPage(group.statPaths, pageStatPaths))
}

function getAvailableCategories(contextStatPaths: StatPath[]): Category[] {
    // Find the intersection between the stat paths we have loaded in the context and the categories that are available
    // This is so we can show the user only the categories that will actually show up
    const pageStatPaths = new Set(contextStatPaths)
    return statsTree.filter(category => intersectsPage(category.statPaths, pageStatPaths))
}

/**
 * The parts of the statistic tree this page has data for. Memoized on the page's own stat
 * paths, which only change on navigation: edit mode puts the whole tree on the table, so
 * otherwise this would be rescanned on every checkbox click and every keystroke in its filter.
 */
function useAvailableTree(): { categories: Category[], groups: Set<Group> } {
    const statPathsAll = useStatPathsAll()
    return useMemo(() => {
        const contextStatPaths = statPathsAll.flat()
        return {
            categories: getAvailableCategories(contextStatPaths),
            groups: new Set(getAvailableGroups(contextStatPaths)),
        }
    }, [statPathsAll])
}

export function useAvailableGroups(category?: Category): Group[] {
    const { groups } = useAvailableTree()
    return (category?.contents ?? allGroups).filter(group => groups.has(group))
}

export function getAvailableYears(contextStatPaths: StatPath[]): Year[] {
    // Find the intersection between the stat paths we have loaded in the context and the years that are available
    // This is so we can show the user only the years that will actually show up
    return allYears.filter(year => contextStatPaths.some(statPath => yearStatPaths.get(year).has(statPath)))
}

export function useAvailableYears(): Year[] {
    const statPathsAll = useStatPathsAll()
    return useMemo(() => getAvailableYears(statPathsAll.flat()), [statPathsAll])
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
