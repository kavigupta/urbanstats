import { createContext, useContext, useEffect, useState } from 'react'

import { DefaultMap } from '../utils/DefaultMap'

type StatisticIdentifier = string & { __statisticIdentifier: true }
type StatisticCategoryIdentifier = string & { __statisticCategoryIdentifier: true }

export interface Category {
    kind: 'category'
    identifier: StatisticCategoryIdentifier
    name: string
    show_checkbox: boolean
    default: boolean
    children: (Category | Statistic)[]
    leaves: Statistic[]
}

export interface Statistic {
    kind: 'statistic'
    identifier: StatisticIdentifier
    name: string
    parents: Category[]
}

export type Tree = Category[]

export type StatisticSettingKey = `show_statistic_${StatisticIdentifier}`
export type StatisticCategorySavedIndeterminateKey = `statistic_category_saved_indeterminate_${StatisticCategoryIdentifier}`
export type RelationshipKey = `related__${string}__${string}`
export type RowExpandedKey = `expanded__${string}`
export type HistogramType = 'Bar' | 'Line' | 'Line (cumulative)'

export interface SettingsDictionary {
    [relationshipKey: RelationshipKey]: boolean
    [showStatisticKey: StatisticSettingKey]: boolean
    [savedIndeterminateKey: StatisticCategorySavedIndeterminateKey]: StatisticIdentifier[] // array of child keys
    [rowExpandedKey: RowExpandedKey]: boolean
    show_historical_cds: boolean
    simple_ordinals: boolean
    use_imperial: boolean
    histogram_type: HistogramType
    histogram_relative: boolean
}

export function relationship_key(article_type: string, other_type: string): RelationshipKey {
    return `related__${article_type}__${other_type}`
}

export function row_expanded_key(row_statname: string): RowExpandedKey {
    return `expanded__${row_statname}`
}

const categoryMetadata = require('../data/statistic_category_metadata.json') as { key: string[], name: string, show_checkbox: boolean, default: boolean }[]
const categoryMetadataByKey = new Map(categoryMetadata.map(category => [category.key, category]))

const statisticKeys = require('../data/statistic_list.json') as string[]
const statisticCategories = require('../data/statistic_category_list.json') as string[][]
const statisticNames = require('../data/statistic_name_list.json') as string[]
const statistics: Statistic[] = statisticKeys.map((key, i) => ({
    key,
    name: statisticNames[i],
    category: categoryMetadataByKey.get(statisticCategories[i])!,
}))

const statisticsByCategoryKey = (() => {
    const result = new DefaultMap<string, typeof statistics>(() => [])
    for (const statistic of statistics) {
        result.get(statistic.category.key).push(statistic)
    }
    return result
})()

// The statistics as grouped by category in order
export const statisticCategoryTree: Tree = categoryMetadata.map(category => ({
    category,
    statistics: statisticsByCategoryKey.get(category.key),
}))

export function load_settings(): SettingsDictionary {
    const settings = JSON.parse(localStorage.getItem('settings') ?? '{}') as Partial<SettingsDictionary>
    const map_relationship = require('../data/map_relationship.json') as [string, string][]
    for (const [article_type, other_type] of map_relationship) {
        const key = relationship_key(article_type, other_type)
        if (!(key in settings)) {
            settings[key] = true
        }
    }

    for (const statistic of statistics) {
        const setting_key = `show_statistic_${statistic.key}` as const
        if (!(setting_key in settings)) {
            settings[setting_key] = false
        }
    }

    for (const category of categoryMetadata) {
        const key = `statistic_category_saved_indeterminate_${category.key}` as const
        if (!(key in settings)) {
            settings[key] = 
        }
    }

    settings.show_historical_cds = settings.show_historical_cds ?? false
    settings.simple_ordinals = settings.simple_ordinals ?? false
    settings.use_imperial = settings.use_imperial ?? false
    settings.histogram_type = settings.histogram_type ?? 'Line'
    settings.histogram_relative = settings.histogram_relative ?? true

    return settings as SettingsDictionary
}

export class Settings {
    private readonly settings: SettingsDictionary

    constructor() {
        this.settings = load_settings()
    }

    private readonly observers = new DefaultMap<keyof SettingsDictionary, Set<() => void>>(() => new Set())

    useSettings<K extends keyof SettingsDictionary>(keys: K[]): Pick<SettingsDictionary, K> {
        // eslint-disable-next-line react-hooks/rules-of-hooks -- This is a custom hook
        const [result, setResult] = useState(this.getMultiple(keys))
        // eslint-disable-next-line react-hooks/rules-of-hooks -- This is a custom hook
        useEffect(() => {
            setResult(this.getMultiple(keys)) // So that if `key` changes we change our result immediately
            const observer = (): void => { setResult(this.getMultiple(keys)) }
            keys.forEach(key => this.observers.get(key).add(observer))
            return () => {
                keys.forEach(key => this.observers.get(key).delete(observer))
            }
        }, keys)
        return result
    }

    setSetting<K extends keyof SettingsDictionary>(key: K, newValue: SettingsDictionary[K]): void {
        this.settings[key] = newValue
        localStorage.setItem('settings', JSON.stringify(this.settings))
        this.observers.get(key).forEach((observer) => { observer() })
    }

    updateSetting<K extends keyof SettingsDictionary>(key: K, makeNewValue: (oldValue: SettingsDictionary[K]) => SettingsDictionary[K]): void {
        this.setSetting(key, makeNewValue(this.get(key)))
    }

    get<K extends keyof SettingsDictionary>(key: K): SettingsDictionary[K] {
        return this.settings[key]
    }

    getMultiple<K extends keyof SettingsDictionary>(keys: K[]): Pick<SettingsDictionary, K> {
        return Object.fromEntries(keys.map(key => [key, this.settings[key]])) as Pick<SettingsDictionary, K>
    }

    // Singular settings means we can use observers
    static Context = createContext(new Settings())
}

export function useSetting<K extends keyof SettingsDictionary>(key: K): [SettingsDictionary[K], (newValue: SettingsDictionary[K]) => void] {
    const settings = useContext(Settings.Context)
    return [settings.useSettings([key])[key], (value) => { settings.setSetting(key, value) }]
}

export function useSettings<K extends keyof SettingsDictionary>(keys: K[]): Pick<SettingsDictionary, K> {
    const settings = useContext(Settings.Context)
    return settings.useSettings(keys)
}

export type TableCheckboxSettings = Record<StatisticSettingKey, boolean>

export type BooleanSettings = { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean ? K : never]: boolean }

export function tableCheckboxKeys(partialStatistics: Statistic[] = statistics): StatisticSettingKey[] {
    return partialStatistics.map(statistic => `show_statistic_${statistic.identifier}` as const)
}

export function relatedSettingsKeys(article_type_this: string): RelationshipKey[] {
    const article_types_other = require('../data/type_to_type_category.json') as Record<string, string>
    return Object.keys(article_types_other).map(article_type_other => relationship_key(article_type_this, article_type_other))
}
