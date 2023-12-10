export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { isMobile } from 'react-device-detect';

class ArticlePanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        const self = this;
        let article_type = this.props.articleType;

        const categories = require("../data/statistic_category_list.json");
        const names = require("../data/statistic_name_list.json");
        const paths = require("../data/statistic_path_list.json");
        const stats = require("../data/statistic_list.json");
        const counts_by_article_type = require("../data/counts_by_article_type.json");
        const explanation_page = require("../data/explanation_page.json");

        const indices = require("../data/indices_by_type.json")[article_type];

        let modified_rows = [];
        for (let i in this.props.rows) {
            let row_original = this.props.rows[i];
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

            function for_type(typ) {
                return counts_by_article_type.filter(
                    (x) =>
                        x[0][1] == typ
                        && JSON.stringify(x[0][0]) == JSON.stringify(row.statcol)
                    )[0][1];
            }

            let count_articles = for_type(article_type);
            let count_articles_overall = for_type("overall");

            row.total_count_in_class = count_articles;
            row.total_count_overall = count_articles_overall;
            modified_rows.push(row);
        }
        const filtered_rows = modified_rows.filter((row) => {
            const key = "show_statistic_" + row.statistic_category;
            return self.state.settings[key];
        });

        return (
            <div>
                <div className={"centered_text " + (isMobile ? "headertext_mobile" : "headertext")}>{this.props.shortname}</div>
                <div className={"centered_text " + (isMobile ? "subheadertext_mobile" : "subheadertext")}>{this.props.longname}</div>

                <table className="stats_table">
                    <tbody>
                        <StatisticRowRaw is_header={true} />
                        {filtered_rows.map((row, i) =>
                            <StatisticRowRaw key={i} index={i} {...row} settings={this.state.settings} />)}
                    </tbody>
                </table>

                <p></p>

                <Map id="map"
                    longname={this.props.longname}
                    related={this.props.related}
                    settings={this.state.settings}
                    article_type={article_type}
                    basemap={{type: "osm"}} />

                <script src="/scripts/map.js"></script>

                <Related
                    related={this.props.related}
                    settings={this.state.settings}
                    set_setting={(key, value) => self.set_setting(key, value)}
                    article_type={article_type} />
            </div>
        );
    }
}

