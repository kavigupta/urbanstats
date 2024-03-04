import { Settings } from "../page_template/settings";
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
    _index: number
}

export function load_article(data: Article, settings: Settings) {
    let article_type = data.articleType;

    const categories = require("../data/statistic_category_list.json") as string[];
    const names = require("../data/statistic_name_list.json") as string[];
    const paths = require("../data/statistic_path_list.json") as string[];
    const stats = require("../data/statistic_list.json") as string[];
    const counts_by_article_type = require("../data/counts_by_article_type.json") as [[string, string], number][];
    const explanation_page = require("../data/explanation_page.json") as string[];

    const indices = require("../data/indices_by_type.json")[article_type] as number[];

    let modified_rows: ArticleRow[] = data.rows.map((row_original, row_index) => {
        const i = indices[row_index];

        function for_type(typ: string) {
            return counts_by_article_type.filter(
                (x) =>
                    x[0][1] == typ
                    && JSON.stringify(x[0][0]) == JSON.stringify(stats[i])
            )[0][1];
        }

        return {
            statval: row_original.statval!,
            ordinal: row_original.ordinal!,
            overallOrdinal: row_original.overallOrdinal!,
            percentile_by_population: row_original.percentileByPopulation!,
            statistic_category: categories[i],
            statcol: stats[i],
            statname: names[i],
            statpath: paths[i],
            explanation_page: explanation_page[i],
            article_type,
            total_count_in_class: for_type(article_type),
            total_count_overall: for_type("overall"),
            _index: i,
        } satisfies ArticleRow
    })

    const filtered_rows = modified_rows.filter((row) => {
        const key = `show_statistic_${row.statistic_category}` as const;
        return settings.get(key);
    });

    const filtered_indices = filtered_rows.map(x => x._index)

    return [filtered_rows, filtered_indices] as const;
}