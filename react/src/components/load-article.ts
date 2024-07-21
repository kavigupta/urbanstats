import { Settings } from "../page_template/settings";
import { universe_is_american } from "../universe";
import { Article } from "../utils/protos";

export interface ArticleRow {
    statval: number,
    ordinal: number,
    overallOrdinal: number,
    percentile_by_population: number,
    statistic_category: string,
    statcol: string
    statname: string,
    statpath: string,
    explanation_page: string,
    article_type: string,
    total_count_in_class: number,
    total_count_overall: number,
    _index: number,
    rendered_statname: string
}

const index_list_info = require("../data/index_lists.json") as { [key: string]: any };

function lookup_in_compressed_sequence(seq: [number, number][], idx: number) {
    // translation of produce_html_page.py::lookup_in_compressed_sequence
    for (let ptr = 0; ptr < seq.length; ptr += 1) {
        const [value, length] = seq[ptr];
        if (idx < length) {
            return value;
        }
        idx -= length;
    }
    throw new Error("Index out of bounds");
}

export function for_type(universe: string, statcol: string, typ: string) : number {
    const statnames = require("../data/statistic_list.json") as string[];
    const idx = statnames.indexOf(statcol);
    const counts_by_universe = require("../data/counts_by_article_type.json") as { [key: string]: { [key: string]: [number, number][] } };
    const counts_by_type = counts_by_universe[universe][typ];

    return lookup_in_compressed_sequence(counts_by_type, idx);
}

function compute_indices(longname: string, typ: string) {
    // translation of produce_html_page.py::indices

    let lists = index_list_info["index_lists"];
    let result: number[] = [];
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

export function load_article(universe: string, data: Article, settings: Settings, exclusively_american: boolean) {

    // index of universe in data.universes
    const universe_index = data.universes.indexOf(universe);
    let article_type = data.articleType;

    const categories = require("../data/statistic_category_list.json") as string[];
    const names = require("../data/statistic_name_list.json") as string[];
    const paths = require("../data/statistic_path_list.json") as string[];
    const stats = require("../data/statistic_list.json") as string[];
    const explanation_page = require("../data/explanation_page.json") as string[];

    const indices = compute_indices(data.longname, article_type) as number[];

    let modified_rows: ArticleRow[] = data.rows.map((row_original, row_index) => {
        const i = indices[row_index];
        // fresh row object
        return {
            statval: row_original.statval!,
            ordinal: row_original.ordinalByUniverse![universe_index],
            overallOrdinal: row_original.overallOrdinalByUniverse![universe_index],
            percentile_by_population: row_original.percentileByPopulationByUniverse![universe_index],
            statistic_category: categories[i],
            statcol: stats[i],
            statname: names[i],
            statpath: paths[i],
            explanation_page: explanation_page[i],
            article_type: article_type,
            total_count_in_class: for_type(universe, stats[i], article_type),
            total_count_overall: for_type(universe, stats[i], "overall"),
            _index: i,
            rendered_statname: render_statname(i, names[i], exclusively_american)
        } satisfies ArticleRow
    })
    const filtered_rows = modified_rows.filter((row) => {
        if (universe_is_american(universe)) {
            if (index_list_info["index_lists"]["gpw"].includes(indices[row._index])) {
                return false;
            }
        } else {
            if (index_list_info["index_lists"]["usa"].includes(indices[row._index])) {
                return false;
            }
        }
        const key = "show_statistic_" + row.statistic_category;
        return settings[key];
    });

    const filtered_indices = filtered_rows.map(x => x._index)

    return [filtered_rows, filtered_indices] as const;
}

export function render_statname(statindex: number, statname: string, exclusively_american: boolean): string {
    const usa_stat = index_list_info["index_lists"]["usa"].includes(statindex);
    if (!exclusively_american && usa_stat) {
        return statname + " (USA only)";
    }
    return statname;
}