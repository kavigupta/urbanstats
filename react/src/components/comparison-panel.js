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
import { headerTextClass, subHeaderTextClass } from '../utils/responsive.js';

class ComparisonPanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        const self = this;
        const rows = [];
        const idxs = [];
        for (let i in this.props.datas) {
            const [r, idx] = load_article(this.props.datas[i], this.state.settings);
            rows.push(r);
            idxs.push(idx);
        }

        return (
            <div>
                {/* <div style={{display:"flex"}}>
                    <div style={{width: }}
                </div> */}
                <div className={headerTextClass()}>Comparison</div>
                <div className={subHeaderTextClass()}>{this.props.joined_string}</div>

                <div style={{ display: "flex" }}>
                    {this.cell(true, <div></div>)}
                    {this.props.datas.map(
                        data => this.cell(false, <div className={subHeaderTextClass()}>
                            {data.longname}
                        </div>)
                    )}
                </div>

                {this.stats_table(rows[0])}

                <p></p>

                {this.map(this.props.datas[0])}

            </div>
        );
    }

    cell(is_left, contents) {
        if (is_left) {
            return <div style={{ width: "20%" }}>
                {contents}
            </div>
        }
        const width = (80 / this.props.datas.length) + "%";
        return <div style={{ width: width }}>
            {contents}
        </div>
    }

    stats_table(rows) {
        return <table className="stats_table">
            <tbody>
                <StatisticRowRaw is_header={true} />
                {rows.map((row, i) =>
                    <StatisticRowRaw key={i} index={i} {...row} settings={this.state.settings} />)}
            </tbody>
        </table>
    }

    map(data) {
        return <Map id="map"
            longname={data.longname}
            related={data.related}
            settings={this.state.settings}
            article_type={data.article_type}
            basemap={{ type: "osm" }} />
    }

}

