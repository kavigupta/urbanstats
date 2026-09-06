import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import extra_stats from '../data/extra_stats'
import map_relationship from '../data/map_relationship'
import stat_path_list from '../data/statistic_path_list'
import { dataSources } from '../data/statistics_tree'
import article_types_other from '../data/type_to_type_category'
import { DefaultMap } from '../utils/DefaultMap'
import type { UnitSettings } from '../utils/quantity'
import { useObserverSets } from '../utils/useObserverSets'

import { Theme } from './color-themes'
import { allGroups, allYears, CategoryIdentifier, DataSource, GroupIdentifier, SourceCategoryIdentifier, StatPath, statsTree, Year } from './statistic-tree'

export type RelationshipKey = `related__${string}__${string}`

// a stat can have more than one extra-stat option (e.g. a monthly plot and a distribution), so dedupe stat paths
export const statPathsWithExtra = Array.from(new Set(extra_stats.map(([index]) => stat_path_list[index])))
export type StatPathWithExtra = (typeof statPathsWithExtra)[number]
export type RowExpandedKey<P extends StatPath> = `expanded__${P}`

export type HistogramType = 'Bar' | 'Line' | 'Line (cumulative)'

export type PlotMode = 'monthly_time_series' | 'temperature_histogram'

export type StatGroupKey<G extends GroupIdentifier = GroupIdentifier> = `show_stat_group_${G}`
export type StatCategorySavedIndeterminateKey<C extends CategoryIdentifier = CategoryIdentifier> = `stat_category_saved_indeterminate_${C}`
export type StatYearKey<Y extends Year = Year> = `show_stat_year_${Y}`
// D extends unknown is vacuous, this is a trick to make sure that D['category'] and D['name'] are coupled
// so we don't end up with a cartesian product.
export type StatSourceKey<D extends DataSource = DataSource> = D extends unknown ? `show_stat_source_${D['category']}_${D['name']}` : never

export type TemperatureUnit = 'fahrenheit' | 'celsius'

export type MobileArticlePointers = 'pointer_in_class' | 'pointer_overall'

/* eslint-disable no-restricted-syntax -- These keys are persistent */
export type SettingsDictionary = {
    [relationshipKey: RelationshipKey]: boolean | undefined
    show_historical_cds: boolean
    show_person_circles: boolean
    simple_ordinals: boolean
    use_imperial: boolean
    histogram_type: HistogramType
    histogram_relative: boolean
    plot_mode: PlotMode
    theme: Theme | 'System Theme'
    colorblind_mode: boolean
    clean_background: boolean
    temperature_unit: TemperatureUnit
    mobile_article_pointers: MobileArticlePointers
    juxtastatCompactEmoji: boolean
    syauRequireEnter: boolean
    mapperSettingsColumnProp: number
    randomFilterByCurrentUniverse: boolean
}
/* eslint-enable no-restricted-syntax */
& { [G in GroupIdentifier as StatGroupKey<G>]: boolean }
& { [C in CategoryIdentifier as StatCategorySavedIndeterminateKey<C>]: GroupIdentifier[] }
& { [Y in Year as StatYearKey<Y>]: boolean }
& { [D in DataSource as StatSourceKey<D>]: boolean }
& { [P in StatPathWithExtra as RowExpandedKey<P>]: boolean }
& { [P in Exclude<StatPath, StatPathWithExtra> as RowExpandedKey<P>]?: undefined }

export function relationshipKey(articleType: string, otherType: string): RelationshipKey {
    return `related__${articleType}__${otherType}`
}

export function rowExpandedKey<P extends StatPath>(statpath: P): RowExpandedKey<P> {
    return `expanded__${statpath}`
}

export function sourceEnabledKey<D extends DataSource>(d: D): StatSourceKey<D> {
    // this cast really shouldn't be necessary but for some reason it can't do the coupling
    return `show_stat_source_${d.category}_${d.name}` as StatSourceKey<D>
}

export function checkboxCategoryName(category: SourceCategoryIdentifier): string {
    return `${category} Sources`
}

const defaultCategorySelections = new Set(['main'] as CategoryIdentifier[])

const defaultEnabledYears = new Set<Year>(
    [2020],
)

export const defaultSettingsList = [
    ...map_relationship.map(
        ([article_type, other_type]) => [relationshipKey(article_type, other_type), true] as const,
    ),
    ...allGroups.map(group => [`show_stat_group_${group.id}` as const, defaultCategorySelections.has(group.parent.id)] as const),
    ...statsTree.map(category => [`stat_category_saved_indeterminate_${category.id}` as const, [] as GroupIdentifier[]] as const),
    ...allYears.map(year => [`show_stat_year_${year}` as const, defaultEnabledYears.has(year)] as const),
    ...dataSources
        .flatMap(({ sources }) => sources
            .map(source => [sourceEnabledKey(source), source.is_default] as const)),
    ['show_historical_cds', false] as const,
    ['show_person_circles', true] as const,
    ['simple_ordinals', false] as const,
    ['use_imperial', false] as const,
    ['histogram_type', 'Line'] as const,
    ['histogram_relative', true] as const,
    ['plot_mode', 'monthly_time_series'] as const,
    ['theme', 'System Theme'] as const,
    ['colorblind_mode', false] as const,
    ['clean_background', false] as const,
    ...statPathsWithExtra.map(statPath => [`expanded__${statPath}`, false] as const),
    ['temperature_unit', 'fahrenheit'],
    ['mobile_article_pointers', 'pointer_in_class'],
    ['juxtastatCompactEmoji', false],
    ['syauRequireEnter', false],
    ['mapperSettingsColumnProp', 0.3],
    ['randomFilterByCurrentUniverse', false],
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

    constructor() {
        const savedSettings = localStorage.getItem('settings')
        const loadedSettings = JSON.parse(savedSettings ?? '{}') as Partial<SettingsDictionary>
        this.settings = { ...defaultSettings, ...loadedSettings }
    }

    private readonly settingValueObservers = new DefaultMap<keyof SettingsDictionary, Set<() => void>>(() => new Set())

    useSettings<K extends keyof SettingsDictionary>(keys: K[]): Pick<SettingsDictionary, K> {
        const stringKeys = JSON.stringify(keys)
        const [state, setState] = useState({ counter: 0, stringKeys: '' }) // Start stringKeys at '' so that we pick up changes before useEffect can bind
        useEffect(() => {
            setState(s => s.stringKeys !== stringKeys ? { stringKeys, counter: s.counter + 1 } : s) // So that if `key` changes we change our result immediately, but also we don't set state on first effect
            const observer = (): void => { setState(s => ({ ...s, counter: s.counter + 1 })) }
            keys.forEach(key => this.settingValueObservers.get(key).add(observer))
            return () => {
                keys.forEach(key => this.settingValueObservers.get(key).delete(observer))
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Our dependencies are the keys
        }, [stringKeys])
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Our dependencies are the keys
        return useMemo(() => this.getMultiple(keys), [stringKeys, state.counter])
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

    /** The same two settings `useUnitSettings` reads, for a caller with no hooks to read them. */
    unitSettings(): UnitSettings {
        const { use_imperial: useImperial, temperature_unit: temperatureUnit } = this.getMultiple(['use_imperial', 'temperature_unit'])
        return { useImperial, temperatureUnit }
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
        useObserverSets([this.stagedKeysObservers])
        return this.getStagedKeys()
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
        useObserverSets([this.stagedKeysObservers].concat(keys.map(key => this.settingValueObservers.get(key))))
        return this.getSettingsInfo(keys)
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

export function relatedSettingsKeys(articleTypeThis: string): RelationshipKey[] {
    return Object.keys(article_types_other).map(articleTypeOther => relationshipKey(articleTypeThis, articleTypeOther))
}

export function useSettingInfo<K extends keyof SettingsDictionary>(key: K): SettingInfo<K> {
    const settings = useContext(Settings.Context)
    return settings.useSettingsInfo([key])[key]
}

export function useSettingsInfo<K extends keyof SettingsDictionary>(keys: K[]): { [T in K]: SettingInfo<T> } {
    const settings = useContext(Settings.Context)
    return settings.useSettingsInfo(keys)
}

function useStagedSettingKeys(): (keyof SettingsDictionary)[] | undefined {
    const settings = useContext(Settings.Context)
    return settings.useStagedKeys()
}

export function isStagedChange<K extends keyof SettingsDictionary>(info: SettingInfo<K>): boolean {
    return 'stagedValue' in info && info.stagedValue !== info.persistedValue
}

/**
 * Keyed off the presence of `stagedValue`, since some settings can legitimately be staged as
 * undefined.
 */
export function settingValue<K extends keyof SettingsDictionary>(info: SettingInfo<K>): SettingsDictionary[K] {
    return 'stagedValue' in info ? info.stagedValue! : info.persistedValue
}

export function useIsStaged(): boolean {
    return useStagedSettingKeys() !== undefined
}

/** The units the person looking at the page reads in. */
export function useUnitSettings(): UnitSettings {
    const [useImperial] = useSetting('use_imperial')
    const [temperatureUnit] = useSetting('temperature_unit')
    // memoized, so that a caller putting it in a dependency array does not rebuild every render
    return useMemo(() => ({ useImperial, temperatureUnit }), [useImperial, temperatureUnit])
}
