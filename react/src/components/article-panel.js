export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import { loadJSON } from '../load_json.js';
import "../common.css";
import "./article.css";

class ArticlePanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        const self = this;
        let article_type = this.props.article_type;

        let categories = loadJSON("/index/statistic_category_list.json");

        let modified_rows = [];
        for (let i in this.props.rows) {
            let row = this.props.rows[i];
            // copy row
            row = Object.assign({}, row);
            row.statistic_category = categories[i];
            row.article_type = article_type;
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

