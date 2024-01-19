export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article.js';
import { headerTextClass, subHeaderTextClass } from '../utils/responsive.js';

class ArticlePanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        const self = this;
        const [filtered_rows, _] = load_article(this.props, this.state.settings);

        return (
            <div>
                <div className={headerTextClass()}>{this.props.shortname}</div>
                <div className={subHeaderTextClass()}>{this.props.longname}</div>

                <div className="stats_table">
                    <StatisticRowRaw _idx={-1} is_header={true} />
                    {filtered_rows.map((row, i) =>
                        <StatisticRowRaw _idx={i} key={i} index={i} {...row} settings={this.state.settings} />)}
                </div>

                <p></p>

                <Map id="map"
                    longname={this.props.longname}
                    related={this.props.related}
                    settings={this.state.settings}
                    article_type={this.props.article_type}
                    basemap={{ type: "osm" }} />

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

