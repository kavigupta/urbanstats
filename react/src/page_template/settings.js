import { relationship_key } from "../components/related-button.js";


export function load_settings() {
    // backed by local storage
    let settings = JSON.parse(localStorage.getItem("settings")) || {};
    const map_relationship = require("../data/map_relationship.json");
    for (let i in map_relationship) {
        const key = relationship_key(map_relationship[i][0], map_relationship[i][1]);
        if (!(key in settings)) {
            settings[key] = true;
        }
    }
    const statistic_category_metadata = require("../data/statistic_category_metadata.json");
    // list of {key, name, show_checkbox, default}
    const statistic_category_metadata_checkboxes = [];
    for (let i in statistic_category_metadata) {
        const key = statistic_category_metadata[i]["key"];
        const setting_key = "show_statistic_" + key;
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
    return [settings, statistic_category_metadata_checkboxes];
}
