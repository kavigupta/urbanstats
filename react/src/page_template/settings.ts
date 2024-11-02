import { createContext, useContext, useEffect, useState } from 'react'

import { DefaultMap } from '../utils/DefaultMap'

import { Theme } from './colors'
import { fromVector } from './settings-vector'
import { allGroups, allYears, CategoryIdentifier, GroupIdentifier, statsTree } from './statistic-tree'

export type RelationshipKey = `related__${string}__${string}`
export type RowExpandedKey = `expanded__${string}`
export type HistogramType = 'Bar' | 'Line' | 'Line (cumulative)'

export type StatGroupKey = `show_stat_group_${GroupIdentifier}`
export type StatCategorySavedIndeterminateKey = `stat_category_saved_indeterminate_${CategoryIdentifier}`
export type StatCategoryExpandedKey = `stat_category_expanded_${CategoryIdentifier}`
export type StatYearKey = `show_stat_year_${number}`

export interface SettingsDictionary {
    [relationshipKey: RelationshipKey]: boolean | undefined
    [showStatisticKey: StatGroupKey]: boolean
    [savedIndeterminateKey: StatCategorySavedIndeterminateKey]: GroupIdentifier[] // array of child keys
    [expandedKey: StatCategoryExpandedKey]: boolean
    [rowExpandedKey: RowExpandedKey]: boolean | undefined
    [statYearKey: StatYearKey]: boolean
    show_historical_cds: boolean
    simple_ordinals: boolean
    use_imperial: boolean
    histogram_type: HistogramType
    histogram_relative: boolean
    theme: Theme | 'System Theme'
    colorblind_mode: boolean
    clean_background: boolean
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
    colorblind_mode: false,
    clean_background: false,
} satisfies SettingsDictionary

export interface SettingInfo<K extends keyof SettingsDictionary> {
    persistedValue: SettingsDictionary[K]
    stagedValue?: SettingsDictionary[K]
}

export class Settings {
    /**
     * Basic Settings
     */
    private readonly settings: SettingsDictionary

    constructor() {
        const savedSettings = localStorage.getItem('settings')
        if (savedSettings === null) {
            this.settings = { ...defaultSettings }
            // Try loading from a link vector, if it exists
            const settingsVector = new URL(window.location.href).searchParams.get('s')
            if (settingsVector !== null) {
                const settingsFromQueryParams = fromVector(settingsVector, this)
                for (const [key, value] of Object.entries(settingsFromQueryParams)) {
                    this.settings[key as keyof SettingsDictionary] = value as never
                }
            }
        }
        else {
            const loadedSettings = JSON.parse(savedSettings) as Partial<SettingsDictionary>
            this.settings = { ...defaultSettings, ...loadedSettings }
        }
    }

    private readonly settingValueObservers = new DefaultMap<keyof SettingsDictionary, Set<() => void>>(() => new Set())

    useSettings<K extends keyof SettingsDictionary>(keys: K[]): Pick<SettingsDictionary, K> {
        // eslint-disable-next-line react-hooks/rules-of-hooks -- This is a custom hook
        const [result, setResult] = useState(this.getMultiple(keys))
        // eslint-disable-next-line react-hooks/rules-of-hooks -- This is a custom hook
        useEffect(() => {
            setResult(this.getMultiple(keys)) // So that if `key` changes we change our result immediately
            const observer = (): void => { setResult(this.getMultiple(keys)) }
            keys.forEach(key => this.settingValueObservers.get(key).add(observer))
            return () => {
                keys.forEach(key => this.settingValueObservers.get(key).delete(observer))
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Our dependencies are the keys
        }, keys)
        return result
    }

    setSetting<K extends keyof SettingsDictionary>(key: K, newValue: SettingsDictionary[K]): void {
        if (this.stagedSettings !== undefined && (key in this.stagedSettings)) {
            this.stagedSettings[key] = newValue
        }
        else {
            this.settings[key] = newValue
            localStorage.setItem('settings', JSON.stringify(this.settings))
        }
        this.settingValueObservers.get(key).forEach((observer) => { observer() })
    }

    updateSetting<K extends keyof SettingsDictionary>(key: K, makeNewValue: (oldValue: SettingsDictionary[K]) => SettingsDictionary[K]): void {
        this.setSetting(key, makeNewValue(this.get(key)))
    }

    get<K extends keyof SettingsDictionary>(key: K): SettingsDictionary[K] {
        if (this.stagedSettings !== undefined && (key in this.stagedSettings)) {
            return this.stagedSettings[key]!
        }
        return this.settings[key]
    }

    getMultiple<K extends keyof SettingsDictionary>(keys: K[]): Pick<SettingsDictionary, K> {
        return Object.fromEntries(keys.map(key => [key, this.get(key)])) as Pick<SettingsDictionary, K>
    }

    // Singular settings means we can use observers
    static Context = createContext(new Settings())

    /**
     * Staged Mode
     *
     * Allows the settings to enter a temporary mode where a subset of settings are not saved, and can be diffed with the saved settings
     */
    private stagedSettings?: Partial<SettingsDictionary>

    /**
     * Starts a "staging" mode for a subset of keys that are contained in this object with the values from this object
     */
    enterStagedMode(stagedSettings: Partial<SettingsDictionary>): void {
        if (this.stagedSettings !== undefined) {
            throw new Error('Already in staged mode')
        }
        this.stagedSettings = { ...stagedSettings }
        this.stagedKeysObservers.forEach((observer) => { observer() })
        for (const key of Object.keys(stagedSettings)) {
            // Need to update observers since the setting values have changed
            this.settingValueObservers.get(key as keyof SettingsDictionary).forEach((observer) => { observer() })
        }
    }

    exitStagedMode(action: 'apply' | 'discard'): void {
        if (this.stagedSettings === undefined) {
            throw new Error('Not in staged mode')
        }
        switch (action) {
            case 'apply':
                for (const [key, value] of Object.entries(this.stagedSettings)) {
                    this.settings[key as keyof SettingsDictionary] = value as never
                    // No need to update observers since these were already the values
                }
                localStorage.setItem('settings', JSON.stringify(this.settings))
                this.stagedSettings = undefined
                this.stagedKeysObservers.forEach((observer) => { observer() })
                break
            case 'discard':
                const stagedSettings = this.stagedSettings
                this.stagedSettings = undefined
                this.stagedKeysObservers.forEach((observer) => { observer() })
                for (const key of Object.keys(stagedSettings)) {
                    // Need to update observers since the setting values have changed
                    this.settingValueObservers.get(key as keyof SettingsDictionary).forEach((observer) => { observer() })
                }
                break
        }
    }

    getStagedKeys(): (keyof SettingsDictionary)[] | undefined {
        if (this.stagedSettings === undefined) {
            return undefined
        }
        return Object.keys(this.stagedSettings) as (keyof SettingsDictionary)[]
    }

    private readonly stagedKeysObservers = new Set<() => void>()

    useStagedKeys(): (keyof SettingsDictionary)[] | undefined {
        // eslint-disable-next-line react-hooks/rules-of-hooks -- This is a custom hook
        const [result, setResult] = useState(this.getStagedKeys())
        // eslint-disable-next-line react-hooks/rules-of-hooks -- This is a custom hook
        useEffect(() => {
            setResult(this.getStagedKeys())
            const observer = (): void => {
                setResult(this.getStagedKeys())
            }
            this.stagedKeysObservers.add(observer)
            return () => {
                this.stagedKeysObservers.delete(observer)
            }
        }, [])
        return result
    }

    getSettingInfo<K extends keyof SettingsDictionary>(key: K): SettingInfo<K> {
        if (this.stagedSettings !== undefined && (key in this.stagedSettings)) {
            return {
                stagedValue: this.stagedSettings[key],
                persistedValue: this.settings[key],
            }
        }
        return {
            persistedValue: this.settings[key],
        }
    }

    getSettingsInfo<K extends keyof SettingsDictionary>(keys: K[]): { [T in K]: SettingInfo<T> } {
        return Object.fromEntries(keys.map(key => [
            key,
            this.getSettingInfo(key),
        ])) as { [T in K]: SettingInfo<T> }
    }

    useSettingsInfo<K extends keyof SettingsDictionary>(keys: K[]): { [T in K]: SettingInfo<T> } {
        // eslint-disable-next-line react-hooks/rules-of-hooks -- This is a custom hook
        const [result, setResult] = useState(this.getSettingsInfo(keys))
        // eslint-disable-next-line react-hooks/rules-of-hooks -- This is a custom hook
        useEffect(() => {
            setResult(this.getSettingsInfo(keys)) // So that if `key` changes we change our result immediately
            const observer = (): void => { setResult(this.getSettingsInfo(keys)) }
            keys.forEach(key => this.settingValueObservers.get(key).add(observer))
            this.stagedKeysObservers.add(observer)
            return () => {
                keys.forEach(key => this.settingValueObservers.get(key).delete(observer))
                this.stagedKeysObservers.delete(observer)
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Our dependencies are the keys
        }, keys)
        return result
    }
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

export function useSettingInfo<K extends keyof SettingsDictionary>(key: K): SettingInfo<K> {
    const settings = useContext(Settings.Context)
    return settings.useSettingsInfo([key])[key]
}

export function useSettingsInfo<K extends keyof SettingsDictionary>(keys: K[]): { [T in K]: SettingInfo<T> } {
    const settings = useContext(Settings.Context)
    return settings.useSettingsInfo(keys)
}

export function useStagedSettingKeys(): (keyof SettingsDictionary)[] | undefined {
    const settings = useContext(Settings.Context)
    return settings.useStagedKeys()
}
