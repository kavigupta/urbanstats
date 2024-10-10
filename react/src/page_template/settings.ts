import { createContext, useContext, useEffect, useState } from 'react'

import { DefaultMap } from '../utils/DefaultMap'

export type StatisticSettingKey = `show_statistic_${string}`
export type RelationshipKey = `related__${string}__${string}`
export type RowExpandedKey = `expanded__${string}`
export type HistogramType = 'Bar' | 'Line' | 'Line (cumulative)'
export type Theme = 'Light Mode' | 'Dark Mode'

interface StatisticCategoryMetadataCheckbox {
    setting_key: StatisticSettingKey
    name: string
}

export interface SettingsDictionary {
    [relationshipKey: RelationshipKey]: boolean
    [showStatisticKey: StatisticSettingKey]: boolean
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

export interface Colors {
    background: string
    highlight: string
    textMain: string
    textPointer: string
    borderShadow: string
    borderNonShadow: string
}

export const colorThemes: Record<Theme, Colors> = {
    'Light Mode': {
        background: '#fff8f0',
        highlight: '#d4b5e2',
        textMain: '#000000',
        textPointer: '#222222',
        borderShadow: '#333333',
        borderNonShadow: '#cccccc',
    },
    'Dark Mode': {
        background: '#1e1e1e',
        highlight: '#d4b5e2',
        textMain: '#ffffff',
        textPointer: '#ffffff',
        borderShadow: '#cccccc',
        borderNonShadow: '#333333',
    },
}

export function load_settings(): [SettingsDictionary, StatisticCategoryMetadataCheckbox[]] {
    // backed by local storage
    const settings = JSON.parse(localStorage.getItem('settings') ?? '{}') as Partial<SettingsDictionary>
    const map_relationship = require('../data/map_relationship.json') as [string, string][]
    for (const [article_type, other_type] of map_relationship) {
        const key = relationship_key(article_type, other_type)
        if (!(key in settings)) {
            settings[key] = true
        }
    }
    const statistic_category_metadata = require('../data/statistic_category_metadata.json') as { key: string, name: string, show_checkbox: boolean, default: boolean }[]
    // list of {key, name, show_checkbox, default}
    const statistic_category_metadata_checkboxes: StatisticCategoryMetadataCheckbox[] = []
    for (const { key, default: defaultSetting, show_checkbox, name } of statistic_category_metadata) {
        const setting_key = `show_statistic_${key}` as const
        if (!(setting_key in settings)) {
            settings[setting_key] = defaultSetting
        }
        if (show_checkbox) {
            statistic_category_metadata_checkboxes.push({ setting_key, name })
        }
    }

    settings.show_historical_cds = settings.show_historical_cds ?? false
    settings.simple_ordinals = settings.simple_ordinals ?? false
    settings.use_imperial = settings.use_imperial ?? false
    settings.histogram_type = settings.histogram_type ?? 'Line'
    settings.histogram_relative = settings.histogram_relative ?? true
    settings.theme = settings.theme ?? 'Light Mode'

    return [settings as SettingsDictionary, statistic_category_metadata_checkboxes]
}

export type BooleanSettings = { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean ? K : never]: boolean }

/* eslint-disable react-hooks/rules-of-hooks -- We do kind of hacky things with hooks and iteration. But they mostly work because the keys don't change.  */
export class Settings {
    private readonly settings: SettingsDictionary
    readonly statistic_category_metadata_checkboxes: StatisticCategoryMetadataCheckbox[]

    constructor() {
        [this.settings, this.statistic_category_metadata_checkboxes] = load_settings()
    }

    private readonly observers = new DefaultMap<keyof SettingsDictionary, Set<() => void>>(() => new Set())

    useSetting<K extends keyof SettingsDictionary>(key: K): SettingsDictionary[K] {
        const [result, setResult] = useState(this.settings[key])
        useEffect(() => {
            setResult(this.settings[key]) // So that if `key` changes we change our result immediately
            const observer = (): void => { setResult(this.settings[key]) }
            this.observers.get(key).add(observer)
            return () => {
                this.observers.get(key).delete(observer)
            }
        }, [key])
        return result
    }

    setSetting<K extends keyof SettingsDictionary>(key: K, newValue: SettingsDictionary[K]): void {
        this.settings[key] = newValue
        localStorage.setItem('settings', JSON.stringify(this.settings))
        this.observers.get(key).forEach((observer) => { observer() })
    }

    get<K extends keyof SettingsDictionary>(key: K): SettingsDictionary[K] {
        return this.settings[key]
    }

    // Singular settings means we can use observers
    static Context = createContext(new Settings())
}

export function useSetting<K extends keyof SettingsDictionary>(key: K): [SettingsDictionary[K], (newValue: SettingsDictionary[K]) => void] {
    const settings = useContext(Settings.Context)
    return [settings.useSetting(key), (value) => { settings.setSetting(key, value) }]
}

export type TableCheckboxSettings = Record<StatisticSettingKey, boolean>

export function useTableCheckboxSettings(): BooleanSettings {
    const categories = require('../data/statistic_category_list.json') as string[]
    const result = {} as BooleanSettings
    for (const category of categories) {
        const key = `show_statistic_${category}` as const
        result[key] = useSetting(key)[0]
    }
    return result
}

export function useRelatedCheckboxSettings(article_type_this: string): Record<RelationshipKey, boolean> {
    const article_types_other = require('../data/type_to_type_category.json') as Record<string, string>
    const result = {} as Record<RelationshipKey, boolean>
    for (const article_type_other of Object.keys(article_types_other)) {
        const key = relationship_key(article_type_this, article_type_other)
        result[key] = useSetting(key)[0]
    }
    return result
}

export function useStatisticCategoryMetadataCheckboxes(): StatisticCategoryMetadataCheckbox[] {
    const settings = useContext(Settings.Context)
    return settings.statistic_category_metadata_checkboxes
}
/* eslint-enable react-hooks/rules-of-hooks */

export function useColors(): Colors {
    const [theme] = useSetting('theme')
    return colorThemes[theme]
}
