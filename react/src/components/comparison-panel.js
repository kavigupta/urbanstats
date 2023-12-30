export { ComparisonPanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { isMobile } from 'react-device-detect';
import { load_article } from './load-article.js';

class ComparisonPanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        const self = this;
        const [rows_1, idxs_1] = load_article(this.props.data_1, this.state.settings);
        const [rows_2, idxs_2] = load_article(this.props.data_2, this.state.settings);

        return (
            <div>
                {/* <div style={{display:"flex"}}>
                    <div style={{width: }}
                </div> */}
                <div className={"centered_text " + (isMobile ? "headertext_mobile" : "headertext")}>{this.props.data_1.shortname}</div>
                <div className={"centered_text " + (isMobile ? "subheadertext_mobile" : "subheadertext")}>{this.props.data_1.longname}</div>

                <table className="stats_table">
                    <tbody>
                        <StatisticRowRaw is_header={true} />
                        {rows_1.map((row, i) =>
                            <StatisticRowRaw key={i} index={i} {...row} settings={this.state.settings} />)}
                    </tbody>
                </table>

                <p></p>

                <Map id="map"
                    longname={this.props.data_1.longname}
                    related={this.props.data_1.related}
                    settings={this.state.settings}
                    article_type={this.props.data_1.article_type}
                    basemap={{ type: "osm" }} />

                <script src="/scripts/map.js"></script>

                <Related
                    related={this.props.data_1.related}
                    settings={this.state.settings}
                    set_setting={(key, value) => self.set_setting(key, value)}
                    article_type={this.props.data_1.article_type} />
            </div>
        );
    }
}

