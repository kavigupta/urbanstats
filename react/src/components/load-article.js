import { universe_is_american } from "../universe";

export { for_type, load_article };

const index_list_info = require("../data/index_lists.json");

function for_type(universe, statcol, typ) {
    const counts_by_article_type = require("../data/counts_by_article_type.json");

    return counts_by_article_type[universe].filter(
        (x) =>
            x[0][1] == typ
            && JSON.stringify(x[0][0]) == JSON.stringify(statcol)
    )[0][1];
}

function compute_indices(longname, typ) {
    // translation of produce_html_page.py::indices

    let lists = index_list_info["index_lists"];
    let result = [];
    result = result.concat(lists["universal"]);
    if (index_list_info["type_to_has_gpw"][typ]) {
        result = result.concat(lists["gpw"]);
    }
    // else {
    if (longname.includes("USA")) {
        result = result.concat(lists["usa"]);
    }
    // sort result by numeric value
    return result.sort((a, b) => a - b);
}

function load_article(universe, data, settings, exclusively_american) {

    // index of universe in data.universes
    const universe_index = data.universes.indexOf(universe);
    console.log("DEF", data.universes, universe, universe_index)
    let article_type = data.articleType;

    const categories = require("../data/statistic_category_list.json");
    const names = require("../data/statistic_name_list.json");
    const paths = require("../data/statistic_path_list.json");
    const stats = require("../data/statistic_list.json");
    const explanation_page = require("../data/explanation_page.json");

    const indices = compute_indices(data.longname, article_type);

    let modified_rows = [];
    for (let i in data.rows) {
        let row_original = data.rows[i];
        i = indices[i];
        // fresh row object
        let row = {};
        row.statval = row_original.statval;
        row.ordinal = row_original.ordinalByUniverse[universe_index];
        row.overallOrdinal = row_original.overallOrdinalByUniverse[universe_index];
        row.percentile_by_population = row_original.percentileByPopulationByUniverse[universe_index];
        row.statistic_category = categories[i];
        row.statcol = stats[i];
        row.statname = names[i];
        row.statpath = paths[i];
        row.explanation_page = explanation_page[i];
        row.article_type = article_type;

        let count_articles = for_type(universe, row.statcol, article_type);
        let count_articles_overall = for_type(universe, row.statcol, "overall");

        row.total_count_in_class = count_articles;
        row.total_count_overall = count_articles_overall;
        row._index = i;
        modified_rows.push(row);
    }
    const filtered_rows = modified_rows.filter((row) => {
        row.rendered_statname = render_statname(row._index, row.statname, exclusively_american);
        if (universe_is_american(universe)) {
            if (index_list_info["index_lists"]["gpw"].includes(indices[row._index])) {
                return false;
            }
        } else {
            if (usa_stat) {
                return false;
            }
        }
        const key = "show_statistic_" + row.statistic_category;
        return settings[key];
    });

    const filtered_indices = filtered_rows.map(x => x._index)

    console.log("ABC");
    console.log(filtered_rows);

    return [filtered_rows, filtered_indices];
}

export function render_statname(statindex, statname, exclusively_american) {
    const usa_stat = index_list_info["index_lists"]["usa"].includes(statindex);
    if (!exclusively_american && usa_stat) {
        return statname + " (USA only)";
    }
    return statname;
}