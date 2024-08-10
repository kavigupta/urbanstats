import { RelationshipKey, relationship_key } from "../components/related-button";
import { createContext, useContext, useEffect, useState } from "react";
import { DefaultMap } from "../utils/DefaultMap";

type StatisticSettingKey = `show_statistic_${string}`

interface StatisticCategoryMetadataCheckbox {
    setting_key: StatisticSettingKey
    name: string
}


interface SettingsDictionary {
    [relationshipKey: RelationshipKey]: boolean;
    [showStatisticKey: StatisticSettingKey]: boolean;
    show_historical_cds: boolean,
    simple_ordinals: boolean,
    use_imperial: boolean
}

export function load_settings() {
    // backed by local storage
    let settings = JSON.parse(localStorage.getItem("settings") ?? "{}") as Partial<SettingsDictionary>;
    const map_relationship = require("../data/map_relationship.json");
    for (let i in map_relationship) {
        const key = relationship_key(map_relationship[i][0], map_relationship[i][1]);
        if (!(key in settings)) {
            settings[key] = true;
        }
    }
    const statistic_category_metadata = require("../data/statistic_category_metadata.json") as { key: string, name: string, show_checkbox: boolean, default: boolean }[];
    // list of {key, name, show_checkbox, default}
    const statistic_category_metadata_checkboxes: StatisticCategoryMetadataCheckbox[] = [];
    for (let i in statistic_category_metadata) {
        const key = statistic_category_metadata[i]["key"];
        const setting_key = `show_statistic_${key}` as const;
        if (!(setting_key in settings)) {
            settings[setting_key] = statistic_category_metadata[i]["default"];
        }
        if (statistic_category_metadata[i]["show_checkbox"]) {
            statistic_category_metadata_checkboxes.push({
                setting_key: setting_key,
                name: statistic_category_metadata[i]["name"],
            });
        }
    }

    settings.show_historical_cds = settings.show_historical_cds ?? false
    settings.simple_ordinals = settings.simple_ordinals ?? false
    settings.use_imperial = settings.use_imperial ?? false

    return [settings as SettingsDictionary, statistic_category_metadata_checkboxes] as const;
}


export type BooleanSettings = { [K in keyof SettingsDictionary as SettingsDictionary[K] extends boolean ? K : never]: boolean }

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
            const observer = () => setResult(this.settings[key])
            this.observers.get(key).add(observer)
            return () => {
                this.observers.get(key).delete(observer)
            }
        }, [key])
        return result
    }

    setSetting<K extends keyof SettingsDictionary>(key: K, newValue: SettingsDictionary[K]): void {
        this.settings[key] = newValue
        this.observers.get(key).forEach(observer => observer())
    }

    get<K extends keyof SettingsDictionary>(key: K): SettingsDictionary[K] {
        return this.settings[key]
    }

    // Singular settings means we can use observers
    static Context = createContext(new Settings())
}

export function useSetting<K extends keyof SettingsDictionary>(key: K): [SettingsDictionary[K], (newValue: SettingsDictionary[K]) => void] {
    const settings = useContext(Settings.Context)
    return [settings.useSetting(key), (value) => settings.setSetting(key, value)]
}

export function useStatisticCategoryMetadataCheckboxes() {
    const settings = useContext(Settings.Context)
    return settings.statistic_category_metadata_checkboxes
}