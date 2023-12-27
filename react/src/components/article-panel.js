export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { isMobile } from 'react-device-detect';
import { load_article } from './load-article.js';

class ArticlePanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        const self = this;
        const modified_rows = load_article(this.props);
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
                    article_type={this.props.article_type}
                    basemap={{type: "osm"}} />

                <script src="/scripts/map.js"></script>

                <Related
                    related={this.props.related}
                    settings={this.state.settings}
                    set_setting={(key, value) => self.set_setting(key, value)}
                    article_type={this.props.article_type} />
            </div>
        );
    }
}

