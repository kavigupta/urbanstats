export { ComparisonPanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article.js';
import { headerTextClass, subHeaderTextClass } from '../utils/responsive.js';

class ComparisonPanel extends PageTemplate {
    constructor(props) {
        super(props);
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

        const main_columns = ["statname", "statval", "statval_unit", "statistic_ordinal", "statistic_percentile"];

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

                <div style={{ display: "flex" }}>
                    {this.cell(true, <div></div>)}
                    {rows.map(
                        row => this.cell(false, <div className={subHeaderTextClass()}>
                            {this.stats_table(row, main_columns)}
                        </div>)
                    )}
                </div>

                <div style={{ display: "flex" }}>
                    {this.cell(true, <div></div>)}
                    {this.props.datas.map(
                        data => this.cell(false, <div className={subHeaderTextClass()}>
                            {this.map(data)}
                        </div>)
                    )}
                </div>

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

    stats_table(rows, only_columns) {
        return <table className="stats_table">
            <tbody>
                <StatisticRowRaw is_header={true} only_columns={only_columns} />
                {rows.map((row, i) =>
                    <StatisticRowRaw key={i} index={i} {...row} settings={this.state.settings} only_columns={only_columns} />)}
            </tbody>
        </table>
    }

    map(data) {
        return <Map id={"map_" + data.shortname}
            longname={data.longname}
            related={data.related}
            settings={this.state.settings}
            article_type={data.article_type}
            basemap={{ type: "osm" }} />
    }

    content(data, rows, only_columns) {
        return <>
            {this.stats_table(rows, only_columns)}
            <p></p>
            {this.map(data)}
        </>
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