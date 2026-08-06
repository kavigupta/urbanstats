import { useContext, useMemo } from 'react'

import { dataSources } from '../data/statistics_tree'
import { Navigator } from '../navigation/Navigator'

import { Settings, sourceEnabledKey, StatGroupKey, StatYearKey, StatSourceKey, useSettings } from './settings'
import { allGroups, allYears, AmbiguousSources, Category, DataSource, DataSourceCheckboxes, findAmbiguousSourcesAll, Group, SourceIdentifier, sourceDisambiguation, statParents, StatPath, statsTree, Year, yearStatPaths } from './statistic-tree'

export type StatGroupSettings = Record<StatGroupKey | StatYearKey | StatSourceKey, boolean>

export function statIsEnabled(statId: StatPath, settings: StatGroupSettings, sourcesByCategory: AmbiguousSources): boolean {
    const { group, year } = statParents.get(statId)!
    return settings[`show_stat_group_${group.id}`]
        && (year !== null ? settings[`show_stat_year_${year}`] : true)
        && statSourceIsEnabled(statId, settings, sourcesByCategory)
}

function statSourceIsEnabled(statId: StatPath, settings: StatGroupSettings, sourcesByCategory: AmbiguousSources): boolean {
    return sourceApplies(statParents.get(statId)!.source, settings, sourcesByCategory)
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

export function groupYearKeys(): (keyof StatGroupSettings)[] {
    return [
        ...groupKeys(allGroups),
        ...allYears.map(year => `show_stat_year_${year}` as const),
        ...dataSources.flatMap(({ sources }) => sources.map(source => sourceEnabledKey(source))),
    ]
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

export function useCategoryStatus(category: Category): boolean | 'indeterminate' {
    const groups = useAvailableGroups(category)
    const settingsValues = useSettings(groupKeys(groups))
    return categoryStatus(groups.map(group => settingsValues[`show_stat_group_${group.id}`]))
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

export function useChangeCategorySetting(category: Category): () => void {
    const status = useCategoryStatus(category)
    const availableGroups = useAvailableGroups(category)
    const settings = useContext(Settings.Context)
    return () => { toggleCategorySetting(settings, category, availableGroups, status) }
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
 * The sources to name in a warning, and whether enabling any single one of them is enough. We could present
 * something more complex like a list of subsets, but that would be confusing and not very useful.
 * So instead, we just say "enable one of these sources" or "enable all of these sources".
 */
export interface MissingSources {
    sources: SourceIdentifier[]
    anySourceSuffices: boolean
}

/** Why a group that the user selected is nonetheless showing no statistics. */
export type MissingGroupReason =
    /** None of `years` are selected: the years this page has the group's statistics for from an enabled source. */
    { kind: 'year', years: Year[] } |
    /** Every source the group has statistics from in a selected year is disabled. */
    ({ kind: 'source' } & MissingSources) |
    /** Nothing the group has is in a selected year, and its sources are disabled too. */
    ({ kind: 'yearAndSource', years: Year[] } & MissingSources)

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
            return `source_${reason.sources.join(',')}_${reason.anySourceSuffices}`
        case 'yearAndSource':
            return `yearAndSource_${reason.years.join(',')}_${reason.sources.join(',')}_${reason.anySourceSuffices}`
    }
}

const sourceOrder = new Map<SourceIdentifier, number>()
for (const { sources } of dataSources) {
    for (const { name } of sources) {
        sourceOrder.set(name, sourceOrder.size)
    }
}

function sortSources(sources: Iterable<SourceIdentifier>): SourceIdentifier[] {
    return Array.from(new Set(sources)).sort((a, b) => sourceOrder.get(a)! - sourceOrder.get(b)!)
}

/**
 * Which selected groups are showing no statistics, and why. Groups are consolidated into their
 * category only when the whole category is missing for the same reason.
 */
export function missingGroups(
    { selectedGroups, selectedYears, statPathsAll, settings, availableTree }: {
        selectedGroups: Group[]
        selectedYears: Year[]
        statPathsAll: StatPath[][]
        settings: StatGroupSettings
        availableTree: AvailableTree
    },
): MissingGroup[] {
    const consolidateGroups = consolidateGroupsIn(availableTree)
    const pageStatPathsEach = statPathsAll.map(statPaths => new Set(statPaths))
    const ambiguousSources = findAmbiguousSourcesAll(statPathsAll)

    const sourceEnabled = (path: StatPath): boolean => statSourceIsEnabled(path, settings, ambiguousSources)
    const inSelectedYear = (path: StatPath): boolean => {
        const { year } = statParents.get(path)!
        return year === null || selectedYears.includes(year)
    }
    const yearsOf = (paths: StatPath[]): Year[] => {
        const years = new Set(paths.map(path => statParents.get(path)!.year))
        return allYears.filter(year => years.has(year))
    }

    const missingReason = (group: Group): MissingGroupReason | undefined => {
        // Restricted to this page, so a page that only goes back to 2010 doesn't name an earlier year.
        // A region with none of the group's statistics isn't missing them; a comparison warns as soon
        // as one of its regions is showing nothing, even if the others still are.
        const blockedEach = pageStatPathsEach
            .map(pageStatPaths => Array.from(group.statPaths).filter(path => pageStatPaths.has(path)))
            .filter(paths => paths.length > 0 && !paths.some(path => statIsEnabled(path, settings, ambiguousSources)))
        if (blockedEach.length === 0) {
            return undefined
        }
        const blocked = Array.from(new Set(blockedEach.flat()))

        /** The disabled sources standing in the way, across the regions missing the group. */
        const missingSources = (candidates: (paths: StatPath[]) => StatPath[]): MissingSources => {
            const eachRegion = blockedEach.map(paths => new Set(candidates(paths).map(path => statParents.get(path)!.source.name)))
            const sources = sortSources(eachRegion.flatMap(region => Array.from(region)))
            return {
                sources,
                anySourceSuffices: sources.some(source => eachRegion.every(region => region.has(source))),
            }
        }

        // Statistics whose source is enabled are held back by their year alone.
        const heldBackByYear = blocked.filter(sourceEnabled)
        if (heldBackByYear.length > 0) {
            return { kind: 'year', years: yearsOf(heldBackByYear) }
        }
        // Every source is disabled, so the statistics already in a selected year name the ones to enable.
        if (blocked.some(inSelectedYear)) {
            return { kind: 'source', ...missingSources(paths => paths.filter(inSelectedYear)) }
        }
        return { kind: 'yearAndSource', years: yearsOf(blocked), ...missingSources(paths => paths) }
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

export function useMissingGroups(): MissingGroup[] {
    const selectedGroups = useSelectedGroups()
    const selectedYears = useSelectedYears()
    const statPathsAll = useStatPathsAll()
    const settings = useSettings(groupYearKeys())
    const availableTree = useAvailableTree()

    return missingGroups({ selectedGroups, selectedYears, statPathsAll, settings, availableTree })
}

/**
 * If all of the groups in a category are present in-order in the list, replace them with that category
 *
 * `groups` **must** be a subset of available groups
 */
function consolidateGroupsIn({ categories: availableCategories, groups: availableGroups }: AvailableTree): (groups: Group[]) => (Group | Category)[] {
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

interface AvailableTree { categories: Category[], groups: Set<Group> }

export function getAvailableTree(statPathsAll: StatPath[][]): AvailableTree {
    const contextStatPaths = statPathsAll.flat()
    return {
        categories: getAvailableCategories(contextStatPaths),
        groups: new Set(getAvailableGroups(contextStatPaths)),
    }
}

/**
 * The parts of the statistic tree this page has data for. Memoized on the page's own stat
 * paths, which only change on navigation: the tree is scanned once per category rendered,
 * and again on every checkbox click and every keystroke in the search box.
 */
function useAvailableTree(): AvailableTree {
    const statPathsAll = useStatPathsAll()
    return useMemo(() => getAvailableTree(statPathsAll), [statPathsAll])
}

export function useAvailableGroups(category?: Category): Group[] {
    const { groups } = useAvailableTree()
    return (category?.contents ?? allGroups).filter(group => groups.has(group))
}

export function useAvailableCategories(): Category[] {
    return useAvailableTree().categories
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
