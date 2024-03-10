import React, { useContext, useRef } from 'react';

import { StatisticRowRaw, StatisticRow, StatisticRowRawProps, StatisticRowRawCellContents } from "./table.js";
import { MapGeneric, MapGenericProps } from "./map.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { ArticleRow, load_article } from './load-article.js';
import { useResponsive } from '../utils/responsive.js';
import { SearchBox } from './search.js';
import { article_link, sanitize } from '../navigation/links.js';
import { lighten } from '../utils/color.js';
import { Article } from "../utils/protos.js";
import { Settings } from "../page_template/settings.js";

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

export function ComparisonPanel(props: { joined_string: string, names: string[], datas: Article[] }) {
        const table_ref = useRef<HTMLDivElement>(null);
        const map_ref = useRef(null);

    const screencap_elements = {
            path: sanitize(props.joined_string) + ".png",
            overall_width: table_ref.current?.offsetWidth! * 2,
            elements_to_render: [table_ref.current!, map_ref.current!],
        }

        const settings = useContext(Settings.Context)


        let rows: ArticleRow[][] = [];
        var idxs = [];
        for (const article of props.datas) {
            const [r, idx] = load_article(article, settings);
            rows.push(r);
            idxs.push(idx);
        }

        rows = insert_missing(rows, idxs);


    const produce_row = (params: (i: number) => { is_header: true } | { is_header: false, key: number, index: number, row: ArticleRow }) => {
        const row_overall = [];
        const param_vals = Array.from(Array(props.datas.length).keys()).map(params);

        var highlight_idx = param_vals.filter(x => x.is_header === false).reduce<number>((iMax, x, i, arr) => {
            return x > arr[iMax] ? i : iMax
        }, -1);

        row_overall.push(
            <div key={"color"} style={{
                width: 100 * left_bar_margin + "%",
                alignSelf: "stretch"
            }}>
                <div style={{
                    backgroundColor: highlight_idx == -1 ? "white" : color(highlight_idx),
                    height: "100%",
                    width: "50%",
                    margin: "auto"
                }} />
            </div>
        )

        row_overall.push(<StatisticRowRawCellContents {...param_vals[0]} only_columns={['statname']} _idx={-1} simple={true} total_width={100 * (left_margin_pct - left_bar_margin)} />)
        const only_columns = all_data_types_same() ? main_columns : main_columns_across_types;

        for (let i = 0; i < props.datas.length; i ++) {
            row_overall.push(<StatisticRowRawCellContents {...param_vals[i]} only_columns={only_columns} _idx={i} simple={true} statistic_style={highlight_idx === i ? { backgroundColor: lighten(color(i), 0.7) } : {}} onReplace={x => on_change(i, x)} total_width={each()}/>)
        }
        return row_overall;
    }

        const header_row = produce_row(i => { return { is_header: true } });
        const render_rows = rows[0].map((_, row_idx) =>
            produce_row(data_idx => {
                return {
                    is_header: false, key: row_idx, index: row_idx, row: rows[data_idx][row_idx]
                }
            })
        );

        const responsive = useResponsive()

        
    const bars = () => {
        return <div style={{ display: "flex" }}>
            {cell(true, 0, <div></div>)}
            {props.datas.map(
                (data, i) => <div key={i} style={{
                    width: each() + "%",
                    height: bar_height,
                    backgroundColor: color(i)
                }} />
            )}
        </div>
    }

    const on_change = (i: number, x: string) => {
        const new_names = [...props.names];
        new_names[i] = x;
        go(new_names);
    }

    const on_delete= (i: number) => {
        const new_names = [...props.names];
        new_names.splice(i, 1);
        go(new_names);
    }

    const add_new = (x: string) => {
        const new_names = [...props.names];
        new_names.push(x);
        go(new_names);
    }

    const go = (names: string[]) => {
        const window_info = new URLSearchParams(window.location.search);
        window_info.set("longnames", JSON.stringify(names));
        window.location.search = window_info.toString();
    }

    const maybe_scroll = (contents: React.ReactNode) => {
        const max_columns = responsive.mobileLayout ? 4 : 6;
        if (width_columns() > max_columns) {
            return <div style={{ overflowX: "scroll" }}>
                <div style={{ width: 100 * width_columns() / (max_columns - 0.7) + "%" }}>
                    {contents}
                </div>
            </div>
        }
        return contents;
    }

    const cell = (is_left: boolean, i: number, contents: React.ReactNode) => {
        if (is_left) {
            return <div key={i} style={{ width: left_margin() + "%" }}>
                {contents}
            </div>
        }
        const width = each() + "%";
        return <div key={i} style={{ width: width }}>
            {contents}
        </div>
    }

    const width_columns = () => {
        // 1.5 columns each if all data types are the same, otherwise 1 column each
        // + 1 for the left margin
        return (all_data_types_same() ? 1.5 : 1) * props.datas.length + 1;
    }

    const each = () => {
        return 100 * (1 - left_margin_pct) / props.datas.length;
    }

    const left_margin = () => {
        return 100 * left_margin_pct;
    }

    const all_data_types_same = () => {
        return props.datas.every(x => x.articleType == props.datas[0].articleType)
    }

    const color = (i: number) => {
        return COLOR_CYCLE[i % COLOR_CYCLE.length];
    }

    const mainContent = (screenshot_mode: boolean) => (
        <div>
            <div className={responsive.headerTextClass}>Comparison</div>
            <div className={responsive.subHeaderTextClass}>{props.joined_string}</div>

            <div style={{ marginBlockEnd: "1em" }}></div>

            <div style={{ display: "flex" }}>
                <div style={{ width: (100 * left_margin_pct) + "%" }} />
                <div style={{ width: (50 * (1 - left_margin_pct)) + "%", marginRight: "1em" }}>
                    <div style={responsive.comparisonHeadStyle("right")}>Add another region:</div>
                </div>
                <div style={{ width: (50 * (1 - left_margin_pct)) + "%" }}>
                    <SearchBox
                        style={{ ...responsive.comparisonHeadStyle(), width: "100%" }}
                        placeholder={"Name"}
                        on_change={(x) => add_new(x)}
                    />
                </div>
            </div>


            <div style={{ marginBlockEnd: "1em" }}></div>

            {maybe_scroll(
                <div ref={table_ref}>
                    {bars()}
                    <div style={{ display: "flex" }}>
                        {cell(true, 0, <div></div>)}
                        {props.datas.map(
                            (data, i) => cell(false, i, <div>
                                <HeadingDisplay
                                    longname={data.longname}
                                    include_delete={props.datas.length > 1}
                                    on_click={() => on_delete(i)}
                                    on_change={(x) => on_change(i, x)}
                                    screenshot_mode={screenshot_mode}
                                />
                            </div>)
                        )}
                    </div>
                    {bars()}

                    <StatisticRow is_header={true} index={0} contents={header_row} />

                    {
                        render_rows.map((row, i) =>
                        <StatisticRow is_header={false} index={i} contents={row} />
                        )
                    }
                </div>
            )}
            <div className="gap"></div>

            <div ref={map_ref}>
                <ComparisonMap
                    longnames={props.datas.map(x => x.longname)}
                    colors={props.datas.map((_, i) => color(i))}
                    id="map_combined"
                    basemap={{ type: "osm" }}
                />
            </div>
        </div>
    );


    return <PageTemplate mainContent={mainContent} screencapElements={screencap_elements} />
}

const manipulation_button_height = "24px";

function ManipulationButton({ color, on_click, text }: { color: string, on_click: () => void, text: string}) {
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

function HeadingDisplay({ longname, include_delete, on_click, on_change, screenshot_mode }: { longname: string, include_delete: boolean, on_click: () => void, on_change: (newValue: string) => void, screenshot_mode: boolean }) {

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

    const responsive = useResponsive()

    return <div>
        {screenshot_mode ? undefined : manipulation_buttons}
        <div style={{ height: "5px" }} />
        <a href={article_link(longname)} style={{ textDecoration: "none" }}><div style={responsive.comparisonHeadStyle()}>{longname}</div></a>
        {is_editing ?
            <SearchBox
                autoFocus={true}
                style={{ ...responsive.comparisonHeadStyle(), width: "100%" }}
                placeholder={"Replacement"}
                on_change={on_change}
            />
            : null}
    </div>
}

function insert_missing(rows: ArticleRow[][], idxs: number[][]) {
    const empty_row_example: Record<number, ArticleRow> = {};
    for (const data_i in rows) {
        for (const row_i in rows[data_i]) {
            const idx = idxs[data_i][row_i];
            empty_row_example[idx] = JSON.parse(JSON.stringify(rows[data_i][row_i]));
            let key: keyof ArticleRow
            for (key in empty_row_example[idx]) {
                if (typeof empty_row_example[idx][key] === "number") {
                    empty_row_example[idx][key] = NaN as never; // Typescript being weird
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

interface ComparisonMapProps extends MapGenericProps {
    longnames: string[],
    colors: string[]
}

class ComparisonMap extends MapGeneric<ComparisonMapProps> {
    constructor(props: ComparisonMapProps) {
        super(props);
    }

    buttons() {
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

    zoom_button(i: number, color: string, onClick: () => void) {
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

        return [names, styles, metas, zoom_index] as const;
    }

    async mapDidRender() {
        console.log("mapDidRender")
        this.zoom_to_all();
    }
}