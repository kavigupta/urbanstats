import { createContext, useContext, useEffect, useState } from 'react'

import { DefaultMap } from '../utils/DefaultMap'

import { Theme } from './colors'
import { allGroups, allYears, CategoryIdentifier, GroupIdentifier, statsTree } from './statistic-tree'

export type RelationshipKey = `related__${string}__${string}`
export type RowExpandedKey = `expanded__${string}`
export type HistogramType = 'Bar' | 'Line' | 'Line (cumulative)'

export type StatGroupKey = `show_stat_group_${GroupIdentifier}`
export type StatCategorySavedIndeterminateKey = `stat_category_saved_indeterminate_${CategoryIdentifier}`
export type StatCategoryExpandedKey = `stat_category_expanded_${CategoryIdentifier}`
export type StatYearKey = `show_stat_year_${number}`

export interface SettingsDictionary {
    [relationshipKey: RelationshipKey]: boolean
    [showStatisticKey: StatGroupKey]: boolean
    [savedIndeterminateKey: StatCategorySavedIndeterminateKey]: GroupIdentifier[] // array of child keys
    [expandedKey: StatCategoryExpandedKey]: boolean
    [rowExpandedKey: RowExpandedKey]: boolean
    [statYearKey: StatYearKey]: boolean
    show_historical_cds: boolean
    simple_ordinals: boolean
    use_imperial: boolean
    histogram_type: HistogramType
    histogram_relative: boolean
    theme: Theme | 'System Theme'
}

export function relationship_key(article_type: string, other_type: string): RelationshipKey {
    return `related__${article_type}__${other_type}`
}

export function row_expanded_key(row_statname: string): RowExpandedKey {
    return `expanded__${row_statname}`
}

const defaultCategorySelections = new Set(
    [
        'main',
        'race',
        'election',
    ] as CategoryIdentifier[],
)

const defaultEnabledYears = new Set(
    [2020],
)

const map_relationship = require('../data/map_relationship.json') as [string, string][]

// Having a default settings object allows us to statically check that we have default values for all settings
// It also makes visualizing the default setings easier
const defaultSettings = {
    ...Object.fromEntries(
        map_relationship.map(
            ([article_type, other_type]) => [relationship_key(article_type, other_type), true],
        ),
    ),
    ...Object.fromEntries(allGroups.map(group => [`show_stat_group_${group.id}` as const, defaultCategorySelections.has(group.parent.id)])),
    ...Object.fromEntries(statsTree.map(category => [`stat_category_saved_indeterminate_${category.id}`, []])),
    ...Object.fromEntries(statsTree.map(category => [`stat_category_expanded_${category.id}`, false])),
    ...Object.fromEntries(allYears.map(year => [`show_stat_year_${year}`, defaultEnabledYears.has(year)])),
    show_historical_cds: false,
    simple_ordinals: false,
    use_imperial: false,
    histogram_type: 'Line',
    histogram_relative: true,
    theme: 'System Theme',
} satisfies SettingsDictionary

export function load_settings(): SettingsDictionary {
    const settings = JSON.parse(localStorage.getItem('settings') ?? '{}') as Partial<SettingsDictionary>
    return { ...defaultSettings, ...settings }
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

export function relatedSettingsKeys(article_type_this: string): RelationshipKey[] {
    const article_types_other = require('../data/type_to_type_category.json') as Record<string, string>
    return Object.keys(article_types_other).map(article_type_other => relationship_key(article_type_this, article_type_other))
}
