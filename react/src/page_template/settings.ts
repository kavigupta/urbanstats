import { RelationshipKey, relationship_key } from "../components/related-button";

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