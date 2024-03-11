
export { for_type, load_article };

function for_type(statcol, typ) {
    const counts_by_article_type = require("../data/counts_by_article_type.json");

    return counts_by_article_type.filter(
        (x) =>
            x[0][1] == typ
            && JSON.stringify(x[0][0]) == JSON.stringify(statcol)
    )[0][1];
}

function load_article(data, settings) {
    let article_type = data.articleType;

    const categories = require("../data/statistic_category_list.json");
    const names = require("../data/statistic_name_list.json");
    const paths = require("../data/statistic_path_list.json");
    const stats = require("../data/statistic_list.json");
    const explanation_page = require("../data/explanation_page.json");

    const indices = require("../data/indices_by_type.json")[article_type];

    let modified_rows = [];
    for (let i in data.rows) {
        let row_original = data.rows[i];
        i = indices[i];
        // fresh row object
        let row = {};
        row.statval = row_original.statval;
        row.ordinal = row_original.ordinal;
        row.overallOrdinal = row_original.overallOrdinal;
        row.percentile_by_population = row_original.percentileByPopulation;
        row.statistic_category = categories[i];
        row.statcol = stats[i];
        row.statname = names[i];
        row.statpath = paths[i];
        row.explanation_page = explanation_page[i];
        row.article_type = article_type;

        let count_articles = for_type(row.statcol, article_type);
        let count_articles_overall = for_type(row.statcol, "overall");

        row.total_count_in_class = count_articles;
        row.total_count_overall = count_articles_overall;
        row._index = i;
        modified_rows.push(row);
    }
    const filtered_rows = modified_rows.filter((row) => {
        const key = "show_statistic_" + row.statistic_category;
        return settings[key];
    });

    const filtered_indices = filtered_rows.map(x => x._index)

    return [filtered_rows, filtered_indices];
}