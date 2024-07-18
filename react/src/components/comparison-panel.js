export { ComparisonPanel };

import React from 'react';

import { StatisticRowRaw, StatisticRowRawCellContents, StatisticRow } from "./table";
import { MapGeneric } from "./map.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article';
import { comparisonHeadStyle, headerTextClass, mobileLayout, subHeaderTextClass } from '../utils/responsive';
import { SearchBox } from './search';
import { article_link, sanitize } from '../navigation/links';
import { lighten } from '../utils/color';
import { longname_is_exclusively_american } from '../universe';

const main_columns = ["statval", "statval_unit", "statistic_ordinal", "statistic_percentile"];
const main_columns_across_types = ["statval", "statval_unit"]
const left_bar_margin = 0.02;
const left_margin_pct = 0.18;
const bar_height = "5px";

const COLOR_CYCLE = [
    "#5a7dc3", // blue
    "#f7aa41", // orange
    "#975ac3", // purple
    "#f96d6d", // red
    "#8e8e8e", // grey
    "#c767b0", // pink
    "#b8a32f", // yellow
    "#8ac35a", // green
];

class ComparisonPanel extends PageTemplate {
    constructor(props) {
        super(props);
        this.table_ref = React.createRef();
        this.map_ref = React.createRef();
    }

    has_screenshot_button() {
        return true;
    }

    screencap_elements() {
        return {
            path: sanitize(this.props.joined_string) + ".png",
            overall_width: this.table_ref.current.offsetWidth * 2,
            elements_to_render: [this.table_ref.current, this.map_ref.current],
        }
    }

    has_universe_selector() {
        return true;
    }

    main_content() {
        const self = this;
        var rows = [];
        var idxs = [];
        const exclusively_american = this.props.datas.every(x => longname_is_exclusively_american(x.longname));
        for (let i in this.props.datas) {
            const [r, idx] = load_article(this.state.current_universe, this.props.datas[i], this.state.settings,
                exclusively_american);
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

        return (
            <div>
                <div className={headerTextClass()}>Comparison</div>
                <div className={subHeaderTextClass()}>{this.props.joined_string}</div>
                <div style={{ marginBlockEnd: "16px" }}></div>

                <div style={{ display: "flex" }}>
                    <div style={{ width: (100 * left_margin_pct) + "%" }} />
                    <div style={{ width: (50 * (1 - left_margin_pct)) + "%", marginRight: "1em" }}>
                        <div className="serif" style={comparisonHeadStyle("right")}>Add another region:</div>
                    </div>
                    <div style={{ width: (50 * (1 - left_margin_pct)) + "%" }}>
                        <SearchBox
                            settings={this.state.settings}
                            style={{ ...comparisonHeadStyle(), width: "100%" }}
                            placeholder={"Name"}
                            on_change={(x) => self.add_new(x)}
                        />
                    </div>
                </div>


                <div style={{ marginBlockEnd: "1em" }}></div>

                {this.maybe_scroll(
                    <div ref={this.table_ref}>
                        {this.bars()}
                        <div style={{ display: "flex" }}>
                            {this.cell(true, 0, <div></div>)}
                            {this.props.datas.map(
                                (data, i) => this.cell(false, i, <div>
                                    <HeadingDisplay
                                        longname={data.longname}
                                        include_delete={this.props.datas.length > 1}
                                        on_click={() => self.on_delete(i)}
                                        on_change={(x) => self.on_change(i, x)}
                                        screenshot_mode={this.state.screenshot_mode}
                                        universe={this.state.current_universe}
                                    />
                                </div>)
                            )}
                        </div>
                        {this.bars()}

                        <StatisticRow is_header={true} index={0} contents={header_row}/>

                        {
                            render_rows.map((row, i) =>
                                <StatisticRow key={i} is_header={false} index={i} contents={row} />
                            )
                        }
                    </div>
                )}
                <div className="gap"></div>

                <div ref={this.map_ref}>
                    <ComparisonMap
                        longnames={this.props.datas.map(x => x.longname)}
                        colors={this.props.datas.map((_, i) => this.color(i))}
                        id="map_combined"
                        article_type={undefined}
                        basemap={{ type: "osm" }}
                        universe={this.state.current_universe}
                    />
                </div>
            </div>
        );
    }

    bars() {
        return <div style={{ display: "flex" }}>
            {this.cell(true, 0, <div></div>)}
            {this.props.datas.map(
                (data, i) => <div key={i} style={{
                    width: this.each() + "%",
                    height: bar_height,
                    backgroundColor: this.color(i)
                }} />
            )}
        </div>
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

    max_columns() {
        return mobileLayout() ? 4 : 6;
    }

    maybe_scroll(contents) {
        if (this.width_columns() > this.max_columns()) {
            return <div style={{ overflowX: "scroll" }}>
                <div style={{ width: 100 * this.width_columns() / (this.max_columns() - 0.7) + "%" }}>
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
        const param_vals = Array.from(Array(this.props.datas.length).keys()).map(params);

        var highlight_idx = param_vals.map(x => x.statval).reduce((iMax, x, i, arr) => {
            if (isNaN(x)) {
                return iMax;
            }
            if (iMax == -1) {
                return i;
            }
            return x > arr[iMax] ? i : iMax
        }, -1);

        row_overall.push(
            <div key={"color"} style={{
                width: 100 * left_bar_margin + "%",
                alignSelf: "stretch"
            }}>
                <div style={{
                    backgroundColor: highlight_idx == -1 ? "#fff8f0" : this.color(highlight_idx),
                    height: "100%",
                    width: "50%",
                    margin: "auto"
                }} />
            </div>
        )

        row_overall.push(...StatisticRowRawCellContents(
            {
                ...param_vals[0], only_columns: ["statname"], _idx: -1, simple: true, longname: this.props.datas[0].longname,
                universe: this.state.current_universe,
                total_width: 100 * (left_margin_pct - left_bar_margin)
            }
        ));
        const only_columns = this.all_data_types_same() ? main_columns : main_columns_across_types;

        for (const i in this.props.datas) {
            row_overall.push(...StatisticRowRawCellContents(
                {
                    ...param_vals[i], only_columns: only_columns, _idx: i, simple: true,
                    statistic_style: highlight_idx == i ? { backgroundColor: lighten(this.color(i), 0.7) } : {},
                    onReplace: x => this.on_change(i, x),
                    universe: this.state.current_universe,
                    total_width: this.each()
                }
            ));
        }
        return row_overall;
    }

    color(i) {
        return COLOR_CYCLE[i % COLOR_CYCLE.length];
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
        className={"serif manipulation-button-" + text}
        onClick={on_click}>
        {text}
    </div>
}

function HeadingDisplay({ universe, longname, include_delete, on_click, on_change, screenshot_mode }) {

    const [is_editing, set_is_editing] = React.useState(false);

    const manipulation_buttons = <div style={{ height: manipulation_button_height }}>
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

    return <div>
        {screenshot_mode ? undefined : manipulation_buttons}
        <div style={{ height: "5px" }} />
        <a className="serif" href={article_link(universe, longname)} style={{ textDecoration: "none" }}><div style={comparisonHeadStyle()}>{longname}</div></a>
        {is_editing ?
            <SearchBox
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
            for (const key in empty_row_example[idx]) {
                if (typeof empty_row_example[idx][key] == "number") {
                    empty_row_example[idx][key] = NaN;
                }
            }
            empty_row_example[idx].article_type = "none"; // doesn't matter since we are using simple mode
        }
    }

    var all_idxs = idxs.flat().filter((x, i, a) => a.indexOf(x) == i);
    // sort all_idxs in ascending order numerically
    all_idxs.sort((a, b) => a - b);

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

class ComparisonMap extends MapGeneric {
    constructor(props) {
        super(props);
    }

    buttons() {
        return <div style={{
            display: "flex", backgroundColor: "#fff8f0", padding: "0.5em", borderRadius: "0.5em",
            alignItems: "center"
        }}>
            <span className="serif" style={{ fontSize: "15px", fontWeight: 500 }}>Zoom to:</span>
            <div style={{ width: "0.25em" }} />
            {this.zoom_button(-1, "black", () => this.zoom_to_all())}
            {this.props.longnames.map((longname, i) => {
                return this.zoom_button(i, this.props.colors[i], () => this.zoom_to(longname))
            })}
        </div>
    }

    zoom_button(i, color, onClick) {
        return <div
            key={i}
            style={{
                display: "inline-block", width: "2em", height: "2em",
                backgroundColor: color, borderRadius: "50%", marginLeft: "5px", marginRight: "5px",
                cursor: "pointer"
            }}
            onClick={onClick}
        />
    }

    async compute_polygons() {
        const names = [];
        const styles = [];

        for (const i in this.props.longnames) {
            names.push(this.props.longnames[i]);
            styles.push({ color: this.props.colors[i], fillColor: this.props.colors[i], "fillOpacity": 0.5, "weight": 1 });
        }

        const zoom_index = -1;

        const metas = names.map((x) => { return {} });

        return [names, styles, metas, zoom_index];
    }

    async mapDidRender() {
        console.log("mapDidRender")
        this.zoom_to_all();
    }
}