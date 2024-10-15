import { createContext, useContext, useEffect, useState } from 'react'

import { DefaultMap } from '../utils/DefaultMap'

import { Theme } from './colors'
import { categories, CategoryIdentifier, StatisticIdentifier, statistics } from './statistic-settings'

export type RelationshipKey = `related__${string}__${string}`
export type RowExpandedKey = `expanded__${string}`
export type HistogramType = 'Bar' | 'Line' | 'Line (cumulative)'

export type StatisticSettingKey = `show_statistic_${StatisticIdentifier}`
export type StatisticCategorySavedIndeterminateKey = `statistic_category_saved_indeterminate_${CategoryIdentifier}`
export type StatisticCategoryExpandedKey = `statistic_category_expanded_${CategoryIdentifier}`

export interface SettingsDictionary {
    [relationshipKey: RelationshipKey]: boolean
    [showStatisticKey: StatisticSettingKey]: boolean
    [savedIndeterminateKey: StatisticCategorySavedIndeterminateKey]: StatisticIdentifier[] // array of child keys
    [expandedKey: StatisticCategoryExpandedKey]: boolean
    [rowExpandedKey: RowExpandedKey]: boolean
    show_historical_cds: boolean
    simple_ordinals: boolean
    use_imperial: boolean
    histogram_type: HistogramType
    histogram_relative: boolean
    theme: Theme
}

export function relationship_key(article_type: string, other_type: string): RelationshipKey {
    return `related__${article_type}__${other_type}`
}

export function row_expanded_key(row_statname: string): RowExpandedKey {
    return `expanded__${row_statname}`
}

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
        const setting_key = `show_statistic_${statistic.identifier}` as const
        if (!(setting_key in settings)) {
            settings[setting_key] = statistic.parents[0].default
        }
    }

    for (const category of categories) {
        const indeterminateKey = `statistic_category_saved_indeterminate_${category.identifier}` as const
        if (!(indeterminateKey in settings)) {
            settings[indeterminateKey] = []
        }
        const expandedKey = `statistic_category_expanded_${category.identifier}` as const
        settings[expandedKey] = settings[expandedKey] ?? false
    }

    settings.show_historical_cds = settings.show_historical_cds ?? false
    settings.simple_ordinals = settings.simple_ordinals ?? false
    settings.use_imperial = settings.use_imperial ?? false
    settings.histogram_type = settings.histogram_type ?? 'Line'
    settings.histogram_relative = settings.histogram_relative ?? true
    settings.theme = settings.theme ?? 'Light Mode'

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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Our dependencies are the keys
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

export function relatedSettingsKeys(article_type_this: string): RelationshipKey[] {
    const article_types_other = require('../data/type_to_type_category.json') as Record<string, string>
    return Object.keys(article_types_other).map(article_type_other => relationship_key(article_type_this, article_type_other))
}
