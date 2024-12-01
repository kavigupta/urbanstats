import { createContext, useContext, useEffect, useState } from 'react'

import extra_stats from '../data/extra_stats'
import map_relationship from '../data/map_relationship'
import stat_path_list from '../data/statistic_path_list'
import { dataSources } from '../data/statistics_tree'
import article_types_other from '../data/type_to_type_category'
import { DefaultMap } from '../utils/DefaultMap'

import { Theme } from './colors'
import { allGroups, allYears, CategoryIdentifier, DataSource, GroupIdentifier, SourceCategoryIdentifier, SourceIdentifier, StatPath, statsTree, Year } from './statistic-tree'

export type RelationshipKey = `related__${string}__${string}`

export const statPathsWithExtra = extra_stats.map(([index]) => stat_path_list[index])
export type StatPathWithExtra = (typeof statPathsWithExtra)[number]
export type RowExpandedKey<P extends StatPath> = `expanded__${P}`

export type HistogramType = 'Bar' | 'Line' | 'Line (cumulative)'

export type StatGroupKey<G extends GroupIdentifier = GroupIdentifier> = `show_stat_group_${G}`
export type StatCategorySavedIndeterminateKey<C extends CategoryIdentifier = CategoryIdentifier> = `stat_category_saved_indeterminate_${C}`
export type StatCategoryExpandedKey<C extends CategoryIdentifier = CategoryIdentifier> = `stat_category_expanded_${C}`
export type StatYearKey<Y extends Year = Year> = `show_stat_year_${Y}`
export type StatSourceKey<C extends SourceCategoryIdentifier = SourceCategoryIdentifier, S extends SourceIdentifier = SourceIdentifier> = `show_stat_source_${C}_${S}`

export type TemperatureUnit = 'fahrenheit' | 'celsius'

export type MobileArticlePointers = 'pointer_in_class' | 'pointer_overall'

export type SettingsDictionary = {
    [relationshipKey: RelationshipKey]: boolean | undefined
    show_historical_cds: boolean
    simple_ordinals: boolean
    use_imperial: boolean
    histogram_type: HistogramType
    histogram_relative: boolean
    theme: Theme | 'System Theme'
    colorblind_mode: boolean
    clean_background: boolean
    temperature_unit: TemperatureUnit
    mobile_article_pointers: MobileArticlePointers
}
& { [G in GroupIdentifier as StatGroupKey<G>]: boolean }
& { [C in CategoryIdentifier as StatCategorySavedIndeterminateKey<C>]: GroupIdentifier[] }
& { [C in CategoryIdentifier as StatCategoryExpandedKey<C>]: boolean }
& { [Y in Year as StatYearKey<Y>]: boolean }
& { [D in DataSource as StatSourceKey<D['category'], D['name']>]: boolean }
& { [P in StatPathWithExtra as RowExpandedKey<P>]: boolean }
& { [P in Exclude<StatPath, StatPathWithExtra> as RowExpandedKey<P>]?: undefined }

export function relationship_key(article_type: string, other_type: string): RelationshipKey {
    return `related__${article_type}__${other_type}`
}

export function row_expanded_key<P extends StatPath>(statpath: P): RowExpandedKey<P> {
    return `expanded__${statpath}`
}

export function source_enabled_key<C extends SourceCategoryIdentifier, S extends SourceIdentifier>(d: { category: C, name: S }): StatSourceKey<C, S> {
    return `show_stat_source_${d.category}_${d.name}`
}

export function checkbox_category_name(category: SourceCategoryIdentifier): string {
    return `${category} Sources`
}

const defaultCategorySelections = new Set(['main'] as CategoryIdentifier[])

const defaultEnabledYears = new Set(
    [2020],
)

export const defaultSettingsList = [
    ...map_relationship.map(
        ([article_type, other_type]) => [relationship_key(article_type, other_type), true] as const,
    ),
    ...allGroups.map(group => [`show_stat_group_${group.id}` as const, defaultCategorySelections.has(group.parent.id)] as const),
    ...statsTree.map(category => [`stat_category_saved_indeterminate_${category.id}` as const, [] as GroupIdentifier[]] as const),
    ...statsTree.map(category => [`stat_category_expanded_${category.id}` as const, false] as const),
    ...allYears.map(year => [`show_stat_year_${year}` as const, defaultEnabledYears.has(year)] as const),
    ...dataSources
        .flatMap(({ category, sources }) => sources
            .map(({ source, is_default }) => [source_enabled_key({ category, name: source }), is_default] as const)),
    ['show_historical_cds', false] as const,
    ['simple_ordinals', false] as const,
    ['use_imperial', false] as const,
    ['histogram_type', 'Line'] as const,
    ['histogram_relative', true] as const,
    ['theme', 'System Theme'] as const,
    ['colorblind_mode', false] as const,
    ['clean_background', false] as const,
    ...statPathsWithExtra.map(statPath => [`expanded__${statPath}`, false] as const),
    ['temperature_unit', 'fahrenheit'],
    ['mobile_article_pointers', 'pointer_in_class'],
] as const

// Having a default settings object allows us to statically check that we have default values for all settings
// It also makes visualizing the default setings easier
const defaultSettings = Object.fromEntries(defaultSettingsList) satisfies SettingsDictionary

export interface SettingInfo<K extends keyof SettingsDictionary> {
    persistedValue: SettingsDictionary[K]
    stagedValue?: SettingsDictionary[K]
}

export class Settings {
    /* eslint-disable react-hooks/rules-of-hooks -- This is a custom logic class */
    /**
     * Basic Settings
     */
    private readonly settings: SettingsDictionary

    private constructor() {
        const savedSettings = localStorage.getItem('settings')
        const loadedSettings = JSON.parse(savedSettings ?? '{}') as Partial<SettingsDictionary>
        this.settings = { ...defaultSettings, ...loadedSettings }
    }

    private readonly settingValueObservers = new DefaultMap<keyof SettingsDictionary, Set<() => void>>(() => new Set())

    useSettings<K extends keyof SettingsDictionary>(keys: K[]): Pick<SettingsDictionary, K> {
        const [result, setResult] = useState(this.getMultiple(keys))
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

    setSetting<K extends keyof SettingsDictionary>(key: K, newValue: SettingsDictionary[K], save = true): void {
        if (this.stagedSettings !== undefined && (key in this.stagedSettings)) {
            this.stagedSettings[key] = newValue
        }
        else {
            this.settings[key] = newValue
            if (save) {
                localStorage.setItem('settings', JSON.stringify(this.settings))
            }
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

    getMultiple<const Keys extends readonly (keyof SettingsDictionary)[]>(keys: Keys): Pick<SettingsDictionary, Keys[number]> {
        return Object.fromEntries(keys.map(key => [key, this.get(key)])) as Pick<SettingsDictionary, Keys[number]>
    }

    // Singular settings means we can use observers
    static shared = new Settings()
    static Context = createContext(this.shared)

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
            this.settingValueObservers.get(key).forEach((observer) => { observer() })
        }
    }

    exitStagedMode(action: 'apply' | 'applyWithoutSaving' | 'discard'): void {
        if (this.stagedSettings === undefined) {
            throw new Error('Not in staged mode')
        }
        switch (action) {
            case 'apply':
            case 'applyWithoutSaving':
                for (const [key, value] of Object.entries(this.stagedSettings)) {
                    this.settings[key] = value as never
                    // No need to update observers since these were already the values
                }
                if (action !== 'applyWithoutSaving') {
                    localStorage.setItem('settings', JSON.stringify(this.settings))
                }
                this.stagedSettings = undefined
                this.stagedKeysObservers.forEach((observer) => { observer() })
                break
            case 'discard':
                const stagedSettings = this.stagedSettings
                this.stagedSettings = undefined
                this.stagedKeysObservers.forEach((observer) => { observer() })
                for (const key of Object.keys(stagedSettings)) {
                    // Need to update observers since the setting values have changed
                    this.settingValueObservers.get(key).forEach((observer) => { observer() })
                }
                break
        }
    }

    getStagedKeys(): (keyof SettingsDictionary)[] | undefined {
        if (this.stagedSettings === undefined) {
            return undefined
        }
        return Object.keys(this.stagedSettings)
    }

    private readonly stagedKeysObservers = new Set<() => void>()

    useStagedKeys(): (keyof SettingsDictionary)[] | undefined {
        const [result, setResult] = useState(this.getStagedKeys())
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

    getSettingsInfo<const Keys extends readonly (keyof SettingsDictionary)[]>(keys: Keys): { [Key in Keys[number]]: SettingInfo<Key> } {
        return Object.fromEntries(keys.map(key => [
            key,
            this.getSettingInfo(key),
        ])) as unknown as { [Key in Keys[number]]: SettingInfo<Key> }
    }

    useSettingsInfo<K extends keyof SettingsDictionary>(keys: K[]): { [T in K]: SettingInfo<T> } {
        const [result, setResult] = useState(this.getSettingsInfo(keys))
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
    /* eslint-enable react-hooks/rules-of-hooks */
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
