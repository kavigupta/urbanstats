import { Settings, StatisticSettingKey } from './settings'

export type StatisticIdentifier = string & { __statisticIdentifier: true }
export type CategoryIdentifier = string & { __statisticCategoryIdentifier: true }

export interface Category {
    kind: 'category'
    identifier: CategoryIdentifier
    name: string
    show_checkbox: boolean
    default: boolean
    children: (Category | Statistic)[] // only direct
    leaves: Statistic[] // all descendants
    parents: Category[]
}

export interface Statistic {
    kind: 'statistic'
    identifier: StatisticIdentifier
    name: string
    parents: Category[] // In order of most direct to least direct
}

export type Tree = Category[]

function categoryKeyToIdentifier(key: string[]): CategoryIdentifier {
    return key.join(',') as CategoryIdentifier
}

function prefixes<T>(array: T[]): T[][] {
    if (array.length === 0) {
        return []
    }
    else {
        // Order is important here for assigning statistics to their direct parents
        return [array].concat(prefixes(array.slice(0, -1)))
    }
}

// The statistics as grouped by category in order
export const statisticCategoryTree: Tree = []
export const categories: (Category & { parentIdentifier?: CategoryIdentifier })[] = []
export const statistics: Statistic[] = []
// Populated below

function populateStatisticCategoryTree(): void {
// Required to be topologically sorted
    const categoryMetadata = require('../data/statistic_category_metadata.json') as { key: string[], name: string, show_checkbox: boolean, default: boolean }[]

    const categoriesByIdentifier = new Map<CategoryIdentifier, Category>()

    // Populate categories and tree
    categoryMetadata.forEach((metadata) => {
        const parents = prefixes(metadata.key.slice(0, -1)).map(parentKey => categoriesByIdentifier.get(categoryKeyToIdentifier(parentKey))!)
        const category: Category = {
            ...metadata,
            kind: 'category',
            identifier: categoryKeyToIdentifier(metadata.key),
            children: [],
            leaves: [],
            parents,
        }
        categories.push(category)
        categoriesByIdentifier.set(category.identifier, category)
        if (category.parents.length === 0) {
            statisticCategoryTree.push(category)
        }
    })

    const statisticIdentifiers = require('../data/statistic_path_list.json') as StatisticIdentifier[]
    const statisticCategories = require('../data/statistic_category_list.json') as string[][]
    const statisticNames = require('../data/statistic_name_list.json') as string[]
    statisticIdentifiers.forEach((identifier, i) => {
        const statistic: Statistic = {
            kind: 'statistic',
            identifier,
            name: statisticNames[i],
            // Removed to remove tree functionality
            // parents: prefixes(statisticCategories[i]).map(key => categoriesByIdentifier.get(categoryKeyToIdentifier(key))!),
            parents: [categoriesByIdentifier.get(categoryKeyToIdentifier(statisticCategories[i]))!],
        }
        statistic.parents[0].children.push(statistic) // This is the direct parent
        statistic.parents.forEach(parent => parent.leaves.push(statistic))
        statistics.push(statistic)
    })

    // Need to add category children last so order is correct
    categories.forEach((category) => {
        category.parents[0]?.children.push(category)
        category.parents = [] // To remove tree functionality
    })
}

populateStatisticCategoryTree()

export function tableCheckboxKeys(partialStatistics: Statistic[] = statistics): StatisticSettingKey[] {
    return partialStatistics.map(statistic => `show_statistic_${statistic.identifier}` as const)
}

export function getCategoryStatus(statisticSettingValues: Record<string, boolean>): boolean | 'indeterminate' {
    const statisticSettings = Object.entries(statisticSettingValues)
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

export function changeStatisticSetting(settings: Settings, statistic: Statistic, newValue: boolean): void {
    settings.setSetting(`show_statistic_${statistic.identifier}`, newValue)
    saveIndeterminateState(settings, statistic)
}

function saveIndeterminateState(settings: Settings, node: Statistic | Category): void {
    for (const category of node.parents) {
        settings.setSetting(`statistic_category_saved_indeterminate_${category.identifier}`, category.leaves.map(statistic => statistic.identifier).filter(identifer => settings.get(`show_statistic_${identifer}`)))
    }
}

export function changeCategorySetting(settings: Settings, category: Category): void {
    const categoryStatus = getCategoryStatus(settings.getMultiple(tableCheckboxKeys(category.leaves)))
    /**
     * State machine:
     *
     * indeterminate -> checked -> unchecked -(if nonempty saved indeterminate)-> indeterminate
     *                                       -(if empty saved indeterminate)-> checked
     */
    switch (categoryStatus) {
        case 'indeterminate':
            category.leaves.forEach((statistic) => { settings.setSetting(`show_statistic_${statistic.identifier}`, true) })
            break
        case true:
            category.leaves.forEach((statistic) => { settings.setSetting(`show_statistic_${statistic.identifier}`, false) })
            break
        case false:
            const savedDeterminate = new Set(settings.get(`statistic_category_saved_indeterminate_${category.identifier}`))
            if (savedDeterminate.size === 0) {
                category.leaves.forEach((statistic) => { settings.setSetting(`show_statistic_${statistic.identifier}`, true) })
            }
            else {
                category.leaves.forEach((statistic) => { settings.setSetting(`show_statistic_${statistic.identifier}`, savedDeterminate.has(statistic.identifier)) })
            }
            break
    }
    saveIndeterminateState(settings, category)
}
