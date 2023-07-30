export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";

class ArticlePanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        const self = this;
        let article_type = this.props.articleType;

        const categories = require("../data/statistic_category_list.json");
        const names = require("../data/statistic_name_list.json");
        const counts_by_article_type = require("../data/counts_by_article_type.json");
        let count_articles = counts_by_article_type.filter((x) => x[0] == article_type)[0][1];
        let count_articles_overall = counts_by_article_type.filter((x) => x[0] == "overall")[0][1];

        let modified_rows = [];
        for (let i in this.props.rows) {
            let row_original = this.props.rows[i];
            // fresh row object
            let row = {};
            row.statval = row_original.statval;
            row.ordinal = row_original.ordinal;
            row.overallOrdinal = row_original.overallOrdinal;
            row.percentile_by_population = row_original.percentileByPopulation;
            row.statistic_category = categories[i];
            row.statname = names[i];
            row.article_type = article_type;
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
                <div className="centered_text shortname">{this.props.shortname}</div>
                <div className="centered_text longname">{this.props.longname}</div>

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
                    article_type={article_type} />

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

