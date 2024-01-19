export { ComparisonPanel };

import React from 'react';

import { StatisticRowRaw, statistic_row } from "./table.js";
import { Map } from "./map.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article.js';
import { headerTextClass, subHeaderTextClass } from '../utils/responsive.js';

const main_columns = ["statval", "statval_unit", "statistic_ordinal", "statistic_percentile"];
const left_margin = 20;

class ComparisonPanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    each() {
        return (100 - left_margin) / this.props.datas.length;
    }

    main_content() {
        const self = this;
        var rows = [];
        var idxs = [];
        for (let i in this.props.datas) {
            const [r, idx] = load_article(this.props.datas[i], this.state.settings);
            rows.push(r);
            idxs.push(idx);
        }

        rows = insert_missing(rows, idxs);

        const header_row = this.produce_row(i => {return { is_header: true }});
        const render_rows = rows[0].map((_, row_idx) =>
            this.produce_row(data_idx => {
                return {
                    key: row_idx, index: row_idx, ...rows[data_idx][row_idx], settings: this.state.settings
                }
            })
        );

        return (
            <div>
                {/* <div style={{display:"flex"}}>
                    <div style={{width: }}
                </div> */}
                <div className={headerTextClass()}>Comparison</div>
                <div className={subHeaderTextClass()}>{this.props.joined_string}</div>

                <div style={{ display: "flex" }}>
                    {this.cell(true, 0, <div></div>)}
                    {this.props.datas.map(
                        (data, i) => this.cell(false, i, <div className={subHeaderTextClass()}>
                            {data.longname}
                        </div>)
                    )}
                </div>

                {statistic_row(true, 0, header_row)}

                {
                    render_rows.map((row, i) =>
                        statistic_row(false, i, row)
                    )
                }

                <div style={{ display: "flex" }}>
                    {this.cell(true, 0, <div></div>)}
                    {this.props.datas.map(
                        (data, i) => this.cell(false, i, <div>
                            {this.map(i, data)}
                        </div>)
                    )}
                </div>

            </div>
        );
    }

    cell(is_left, i, contents) {
        if (is_left) {
            return <div key={i} style={{ width: "20%" }}>
                {contents}
            </div>
        }
        const width = (80 / this.props.datas.length) + "%";
        return <div key={i} style={{ width: width }}>
            {contents}
        </div>
    }

    produce_row(params) {
        const row_overall = [];
        row_overall.push(...new StatisticRowRaw({ ...params(0), only_columns: ["statname"], _idx: -1, simple: true }).tr_contents(left_margin));
        for (const i in this.props.datas) {
            row_overall.push(...new StatisticRowRaw({ ...params(i), only_columns: main_columns, _idx: i, simple: true }).tr_contents(this.each()));
        }
        return row_overall;
    }

    map(i, data) {
        return <Map id={"map_" + i}
            longname={data.longname}
            related={data.related}
            settings={this.state.settings}
            article_type={data.article_type}
            basemap={{ type: "osm" }} />
    }

}

function insert_missing(rows, idxs) {
    const empty_row_example = {};
    for (const data_i in rows) {
        for (const row_i in rows[data_i]) {
            const idx = idxs[data_i][row_i];
            empty_row_example[idx] = JSON.parse(JSON.stringify(rows[data_i][row_i]));
            // set all numeric values to nan
            for (const key in empty_row_example[idx]) {
                if (typeof empty_row_example[idx][key] == "number") {
                    empty_row_example[idx][key] = NaN;
                }
            }
            // TODO
            empty_row_example[idx].article_type = "none";
        }
    }

    const all_idxs = idxs.flat().filter((x, i, a) => a.indexOf(x) == i).sort();
    const new_rows_all = [];
    for (const data_i in rows) {
        const new_rows = [];
        for (const idx of all_idxs) {
            if (idxs[data_i].includes(idx)) {
                const index_to_pull = idxs[data_i].findIndex(x => x == idx);
                new_rows.push(rows[data_i][index_to_pull]);
            } else {
                new_rows.push(empty_row_example[idx]);
            }
        }
        new_rows_all.push(new_rows);
    }
    return new_rows_all;
}