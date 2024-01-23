export { ComparisonPanel };

import React from 'react';

import { StatisticRowRaw, statistic_row } from "./table.js";
import { Map, MapGeneric } from "./map.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { load_article } from './load-article.js';
import { comparisonHeadStyle, headerTextClass, mobileLayout, subHeaderTextClass } from '../utils/responsive.js';
import { LightweightSearchbox } from './search.js';
import domtoimage from 'dom-to-image';
import { sanitize } from '../navigation/links.js';

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
                        <ScreencapButton do_screencap={() => this.screencap()} />
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
                                    />
                                </div>)
                            )}
                        </div>
                        {this.bars()}

                        {statistic_row(true, 0, header_row)}

                        {
                            render_rows.map((row, i) =>
                                statistic_row(false, i, row)
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
                    />
                </div>
            </div>
        );
    }

    async screencap() {
        console.log("Exporting");
        const table = this.table_ref.current;
        // remove the elements with class noscreencap. make sure we can add them back later
        // const noscreencap = to_export.getElementsByClassName("noscreencap");
        // const noscreencap_parents = Array.from(noscreencap).map(x => x.parentNode);
        // for (const x of noscreencap) {
        //     x.remove();
        // }

        const png_table = await domtoimage.toPng(table, {
            bgcolor: "white",
            // higher dpi
            height: table.offsetHeight * 2,
            width: table.offsetWidth * 2,
            style: {
                transform: "scale(" + 2 + ")",
                transformOrigin: "top left"
            }
        })

        // // add the elements back
        // for (const i in noscreencap) {
        //     noscreencap_parents[i].appendChild(noscreencap[i]);
        // }

        const map = this.map_ref.current;

        const scale_factor = 2 * table.offsetWidth / map.offsetWidth;

        const png_map = await domtoimage.toPng(map, {
            bgcolor: "white",
            // same width as table
            height: map.offsetHeight * scale_factor,
            width: map.offsetWidth * scale_factor,
            style: {
                transform: "scale(" + scale_factor + ")",
                transformOrigin: "top left"
            }
        })

        // stack the two images

        const canvas = document.createElement("canvas");

        const pad_around = 100;
        const pad_between = 50;

        canvas.width = table.offsetWidth * 2 + pad_around * 2;
        canvas.height = table.offsetHeight * 2 + map.offsetHeight * scale_factor + pad_around * 2 + pad_between;
        const ctx = canvas.getContext("2d");
        const img_table = new Image();
        img_table.src = png_table;
        const img_map = new Image();
        img_map.src = png_map;
        // flood the canvas with white
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // draw the images, but wait for them to load
        await new Promise((resolve, reject) => {
            img_table.onload = () => resolve();
        })
        await new Promise((resolve, reject) => {
            img_map.onload = () => resolve();
        })
        ctx.drawImage(img_table, pad_around, pad_around);
        ctx.drawImage(img_map, pad_around, pad_around + table.offsetHeight * 2 + pad_between);


        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/png");
        a.download = sanitize(this.props.joined_string) + ".png";
        a.click();

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
                <div style={{ width: 100 * this.width_columns() / (this.max_columns() + 0.3) + "%" }}>
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

        // argmax
        var highlight_idx = param_vals.map(x => x.statval).reduce((iMax, x, i, arr) => {
            if (isNaN(x)) {
                return iMax;
            }
            if (iMax == -1) {
                return i;
            }
            return x > arr[iMax] ? i : iMax
        }, -1);

        // add a div with color highlighting the max value
        // and width 100 * left_bar_margin

        row_overall.push(
            <div key={"color"} style={{
                width: 100 * left_bar_margin + "%",
                alignSelf: "stretch"
            }}>
                <div style={{
                    backgroundColor: highlight_idx == -1 ? "white" : this.color(highlight_idx),
                    height: "100%",
                    width: "50%",
                    margin: "auto"
                }} />
            </div>
        )

        row_overall.push(...new StatisticRowRaw(
            { ...param_vals[0], only_columns: ["statname"], _idx: -1, simple: true }
        ).tr_contents(100 * (left_margin_pct - left_bar_margin)));
        const only_columns = this.all_data_types_same() ? main_columns : main_columns_across_types;

        console.log(highlight_idx)
        for (const i in this.props.datas) {
            row_overall.push(...new StatisticRowRaw({
                ...param_vals[i], only_columns: only_columns, _idx: i, simple: true, highlight: highlight_idx == i,
                onReplace: x => this.on_change(i, x)
            }).tr_contents(this.each()));
        }
        return row_overall;
    }

    color(i) {
        return COLOR_CYCLE[i % COLOR_CYCLE.length];
    }

}

function ScreencapButton({ do_screencap }) {
    const button_ref = React.useRef(null);
    // isExporting state
    const [is_exporting, set_is_exporting] = React.useState(false);
    return <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
            className="serif"
            ref={button_ref}
            disabled={is_exporting}
            onClick={() => {
                set_is_exporting(true);
                // in another thread
                setTimeout(async () => {
                    await do_screencap();
                    set_is_exporting(false);
                }, 0);
            }}
        >
            {is_exporting ? "Exporting..." : "Export as screenshot"}
        </button>
    </div>
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

class ComparisonMap extends MapGeneric {
    constructor(props) {
        super(props);

        // this.already_fit_bounds = false;
    }

    buttons() {
        // one button per longname. Should just be a circle with the color of the longname
        return <div style={{
            display: "flex", backgroundColor: "white", padding: "0.5em", borderRadius: "0.5em",
            alignItems: "center"
        }}>
            <span className="serif" style={{ fontSize: "15px" }}><b>Zoom to:</b></span>
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
        // this.already_fit_bounds = this.props.longname;
    }
}