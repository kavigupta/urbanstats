export { ComparisonPanel };

import React from 'react';

import { StatisticRowRaw, statistic_row } from "./table.js";
import { Map } from "./map.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article.js';
import { comparisonHeadStyle, headerTextClass, subHeaderTextClass } from '../utils/responsive.js';
import { LightweightSearchbox } from './search.js';

const main_columns = ["statval", "statval_unit", "statistic_ordinal", "statistic_percentile"];
const main_columns_across_types = ["statval", "statval_unit"]
const left_margin_pct = 0.2;

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

        const header_row = this.produce_row(i => { return { is_header: true } });
        const render_rows = rows[0].map((_, row_idx) =>
            this.produce_row(data_idx => {
                return {
                    key: row_idx, index: row_idx, ...rows[data_idx][row_idx], settings: this.state.settings
                }
            })
        );

        console.log(this.width_columns())

        return (
            <div>
                <div className={headerTextClass()}>Comparison</div>
                <div className={subHeaderTextClass()}>{this.props.joined_string}</div>

                <div style={{ marginBlockEnd: "1em" }}></div>

                <div style={{ display: "flex" }}>
                    <div style={{ width: (100 * left_margin_pct) + "%" }}>
                    </div>
                    <div style={{ width: (50 * (1 - left_margin_pct)) + "%", marginRight: "1em" }}>
                        <div style={comparisonHeadStyle("right")}>Add another region:</div>
                    </div>
                    <div style={{ width: (50 * (1 - left_margin_pct)) + "%" }}>
                        <LightweightSearchbox
                            settings={this.state.settings}
                            style={{ ...comparisonHeadStyle(), width: "100%" }}
                            placeholder={"Name"}
                            on_change={(x) => self.add_new(x)}
                        />
                    </div>
                </div>


                <div style={{ marginBlockEnd: "1em" }}></div>

                {this.maybe_scroll(
                    <>
                        <div style={{ display: "flex" }}>
                            {this.cell(true, 0, <div></div>)}
                            {this.props.datas.map(
                                (data, i) => this.cell(false, i, <div>
                                    <HeadingDisplay
                                        longname={data.longname}
                                        include_delete={this.props.datas.length > 1}
                                        on_click={() => self.on_delete(i)}
                                        on_change={(x) => self.on_change(i, x)}
                                    />
                                </div>)
                            )}
                        </div>

                        {statistic_row(true, 0, header_row)}

                        {
                            render_rows.map((row, i) =>
                                statistic_row(false, i, row)
                            )
                        }

                        <div className="gap"></div>

                        <div style={{ display: "flex" }}>
                            {this.cell(true, 0, <div></div>)}
                            {this.props.datas.map(
                                (data, i) => this.cell(false, i, <div>
                                    {this.map(i, data)}
                                </div>)
                            )}
                        </div>
                    </>
                )}

            </div>
        );
    }

    on_change(i, x) {
        const new_names = [...this.props.names];
        new_names[i] = x;
        this.go(new_names);
    }

    on_delete(i) {
        const new_names = [...this.props.names];
        new_names.splice(i, 1);
        this.go(new_names);
    }

    add_new(x) {
        const new_names = [...this.props.names];
        new_names.push(x);
        this.go(new_names);
    }

    go(names) {
        const window_info = new URLSearchParams(window.location.search);
        window_info.set("longnames", JSON.stringify(names));
        window.location.search = window_info.toString();
    }

    maybe_scroll(contents) {
        if (this.width_columns() > 4) {
            // make this scrollable. Total scroll width should be 100% * (width_columns / 4)
            return <div style={{ overflowX: "scroll" }}>
                <div style={{ width: 100 * this.width_columns() / 4.5 + "%" }}>
                    {contents}
                </div>
            </div>
        }
        return contents;
    }

    cell(is_left, i, contents) {
        if (is_left) {
            return <div key={i} style={{ width: this.left_margin() + "%" }}>
                {contents}
            </div>
        }
        const width = this.each() + "%";
        return <div key={i} style={{ width: width }}>
            {contents}
        </div>
    }

    width_columns() {
        // 1.5 columns each if all data types are the same, otherwise 1 column each
        // + 1 for the left margin
        return (this.all_data_types_same() ? 1.5 : 1) * this.props.datas.length + 1;
    }

    each() {
        return 100 * (1 - left_margin_pct) / this.props.datas.length;
    }

    left_margin() {
        return 100 * left_margin_pct;
    }

    all_data_types_same() {
        return this.props.datas.every(x => x.articleType == this.props.datas[0].articleType)
    }

    produce_row(params) {
        const row_overall = [];
        row_overall.push(...new StatisticRowRaw({ ...params(0), only_columns: ["statname"], _idx: -1, simple: true }).tr_contents(this.left_margin()));
        const only_columns = this.all_data_types_same() ? main_columns : main_columns_across_types;
        for (const i in this.props.datas) {
            row_overall.push(...new StatisticRowRaw({ ...params(i), only_columns: only_columns, _idx: i, simple: true }).tr_contents(this.each()));
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

const manipulation_button_height = "24px";

function ManipulationButton({ color, on_click, text }) {
    return <div
        style={{
            height: manipulation_button_height,
            lineHeight: manipulation_button_height,
            cursor: "pointer",
            paddingLeft: "0.5em", paddingRight: "0.5em",
            borderRadius: "0.25em",
            verticalAlign: "middle",
            backgroundColor: color,
        }}
        className="serif"
        onClick={on_click}>
        {text}
    </div>
}

function HeadingDisplay({ longname, include_delete, on_click, on_change }) {

    const [is_editing, set_is_editing] = React.useState(false);

    return <div>
        <div style={{ height: manipulation_button_height }}>
            <div style={{ display: "flex", justifyContent: "flex-end", height: "100%" }}>
                <ManipulationButton color="#e6e9ef" on_click={() => set_is_editing(!is_editing)} text="replace" />
                {!include_delete ? null :
                    <>
                        <div style={{ width: "5px" }} />
                        <ManipulationButton color="#e6e9ef" on_click={on_click} text="delete" />
                    </>
                }
                <div style={{ width: "5px" }} />
            </div>
        </div>
        <div style={{ height: "5px" }} />
        <div style={comparisonHeadStyle()}>{longname}</div>
        {is_editing ?
            <LightweightSearchbox
                autoFocus={true}
                settings={{}}
                style={{ ...comparisonHeadStyle(), width: "100%" }}
                placeholder={"Replacement"}
                on_change={on_change}
            />
            : null}
    </div>
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