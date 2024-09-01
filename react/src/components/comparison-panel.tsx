import React, { useRef } from 'react';

import { StatisticRowRawCellContents, StatisticRow } from "./table";
import { MapGeneric, MapGenericProps } from "./map";
import { PageTemplate } from "../page_template/template";
import "../common.css";
import "./article.css";
import { ArticleRow, load_article } from './load-article';
import { comparisonHeadStyle, headerTextClass, mobileLayout, subHeaderTextClass } from '../utils/responsive';
import { SearchBox } from './search';
import { article_link, sanitize } from '../navigation/links';
import { lighten } from '../utils/color';
import { longname_is_exclusively_american, useUniverse } from '../universe';
import { row_expanded_key, useSetting, useTableCheckboxSettings } from '../page_template/settings';
import { WithPlot } from './plots';
import { Article } from "../utils/protos";

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

export function ComparisonPanel(props: { joined_string: string, universes: string[], names: string[], datas: Article[] }) {
    const table_ref = useRef<HTMLDivElement>(null);
    const map_ref = useRef(null);

    const screencap_elements = () => ({
            path: sanitize(props.joined_string) + ".png",
            overall_width: table_ref.current!.offsetWidth * 2,
            elements_to_render: [table_ref.current!, map_ref.current!],
        })

    if (props.names == undefined) {
        throw new Error("ComparisonPanel: names not set");
    }

    const left_margin = () => {
        return 100 * left_margin_pct;
    }

    const cell = (is_left: boolean, i: number, contents: React.ReactNode) => {
        if (is_left) {
            return <div key={i} style={{ width: left_margin() + "%" }}>
                {contents}
            </div>
        }
        const width = each(props.datas) + "%";
        return <div key={i} style={{ width: width }}>
            {contents}
        </div>
    }

    const bars = () => {
        return <div style={{ display: "flex" }}>
            {cell(true, 0, <div></div>)}
            {props.datas.map(
                (data, i) => <div key={i} style={{
                    width: each(props.datas) + "%",
                    height: bar_height,
                    backgroundColor: color(i)
                }} />
            )}
        </div>
    }

    const max_columns = () => {
        return mobileLayout() ? 4 : 6;
    }

    const width_columns = () => {
        // 1.5 columns each if all data types are the same, otherwise 1 column each
        // + 1 for the left margin
        return (all_data_types_same(props.datas) ? 1.5 : 1) * props.datas.length + 1;
    }

    const maybe_scroll = (contents: React.ReactNode) => {
        if (width_columns() > max_columns()) {
            return <div style={{ overflowX: "scroll" }}>
                <div style={{ width: 100 * width_columns() / (max_columns() - 0.7) + "%" }}>
                    {contents}
                </div>
            </div>
        }
        return contents;
    }

    return <PageTemplate screencap_elements={screencap_elements} has_universe_selector={true} universes={props.universes}>{ (template_info) => 
        <div>
            <div className={headerTextClass()}>Comparison</div>
            <div className={subHeaderTextClass()}>{props.joined_string}</div>
            <div style={{ marginBlockEnd: "16px" }}></div>

            <div style={{ display: "flex" }}>
                <div style={{ width: (100 * left_margin_pct) + "%" }} />
                <div style={{ width: (50 * (1 - left_margin_pct)) + "%", marginRight: "1em" }}>
                    <div className="serif" style={comparisonHeadStyle("right")}>Add another region:</div>
                </div>
                <div style={{ width: (50 * (1 - left_margin_pct)) + "%" }}>
                    <SearchBox
                        style={{ ...comparisonHeadStyle(), width: "100%" }}
                        placeholder={"Name"}
                        on_change={(x) => add_new(props.names, x)}
                        autoFocus={false}
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
                                    on_click={() => on_delete(props.names, i)}
                                    on_change={(x) => on_change(props.names, i, x)}
                                    screenshot_mode={template_info.screenshot_mode}
                                />
                            </div>)
                        )}
                    </div>
                    {bars()}

                    <ComparsionPageRows
                        names={props.names}
                        datas={props.datas}
                    />
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
    }</PageTemplate>
}

function color(i: number) {
    return COLOR_CYCLE[i % COLOR_CYCLE.length];
}


function on_change(names: string[] | undefined, i: number, x: string) {
    if (names == undefined) {
        throw new Error("names is undefined");
    }
    const new_names = [...names];
    new_names[i] = x;
    go(new_names);
}

function on_delete(names: string[], i: number) {
    const new_names = [...names];
    new_names.splice(i, 1);
    go(new_names);
}

function add_new(names: string[], x: string) {
    const new_names = [...names];
    new_names.push(x);
    go(new_names);
}

function go(names: string[]) {
    const window_info = new URLSearchParams(window.location.search);
    window_info.set("longnames", JSON.stringify(names));
    window.location.search = window_info.toString();
}

function each(datas: Article[]) {
    return 100 * (1 - left_margin_pct) / datas.length;
}

function all_data_types_same(datas: Article[]) {
    return datas.every(x => x.articleType == datas[0].articleType)
}


function ComparsionPageRows({ names, datas }: { names: string[], datas: Article[] }) {
    const curr_universe = useUniverse();
    let rows: ArticleRow[][] = [];
    const idxs: number[][] = [];
    const exclusively_american = datas.every(x => longname_is_exclusively_american(x.longname));
    for (const i in datas) {
        const [r, idx] = load_article(curr_universe, datas[i], useTableCheckboxSettings(),
            exclusively_american);
        rows.push(r);
        idxs.push(idx);
    }

    rows = insert_missing(rows, idxs);

    const header_row = <ComparisonRow
        params={() => { return { is_header: true } }}
        datas={datas}
        names={names}
    />;
    return (
        <>
            <StatisticRow is_header={true} index={0} contents={header_row} />

            {
                rows[0].map((_, row_idx) => 
                    <ComparisonRowBody
                        key={row_idx}
                        rows={rows}
                        row_idx={row_idx}
                        datas={datas}
                        names={names}
                    />
                )
            }
        </>
    )
}

function ComparisonRowBody({rows, row_idx, datas, names}: {
    rows: ArticleRow[][],
    row_idx: number,
    datas: Article[],
    names: string[]
}) {
    const [expanded, setExpanded] = useSetting(row_expanded_key(rows[0][row_idx].statname));
    const contents = <ComparisonRow
        params={data_idx => {
            return {
                key: row_idx, index: row_idx, ...rows[data_idx][row_idx], is_header: false
            }
        }}
        datas={datas}
        names={names}
    />;
    const plot_props = rows.map((row, data_idx) => ({...row[row_idx], color: color(data_idx), shortname: datas[data_idx].shortname}));
    return <WithPlot plot_props={plot_props} expanded={expanded} key={row_idx}>
        <StatisticRow key={row_idx} is_header={false} index={row_idx} contents={contents} />
    </WithPlot>
}

function ComparisonRow({ names, params, datas }: {
    names: string[],
    params: (i: number) => { is_header: true } | ({ is_header: false, key: number, index: number } & ArticleRow),
    datas: Article[],
}) {
    if (names == undefined) {
        throw new Error("ComparisonRow: names is undefined");
    }
    const row_overall = [];
    const param_vals = Array.from(Array(datas.length).keys()).map(params);

    const highlight_idx = param_vals.map(x => 'statval' in x ? x.statval: NaN).reduce((iMax, x, i, arr) => {
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
                backgroundColor: highlight_idx == -1 ? "#fff8f0" : color(highlight_idx),
                height: "100%",
                width: "50%",
                margin: "auto"
            }} />
        </div>
    )

    row_overall.push(...StatisticRowRawCellContents(
        {
            ...param_vals[0], only_columns: ["statname"], _idx: -1, simple: true, longname: datas[0].longname,
            total_width: 100 * (left_margin_pct - left_bar_margin),
        }
    ));
    const only_columns = all_data_types_same(datas) ? main_columns : main_columns_across_types;

    for (const i of datas.keys()) {
        row_overall.push(...StatisticRowRawCellContents(
            {
                ...param_vals[i], only_columns: only_columns, _idx: i, simple: true,
                statistic_style: highlight_idx == i ? { backgroundColor: lighten(color(i), 0.7) } : {},
                onReplace: x => on_change(names, i, x),
                total_width: each(datas),
            }
        ));
    }
    return row_overall;
}

const manipulation_button_height = "24px";

function ManipulationButton({ color, on_click, text }: { color: string, on_click: () => void, text: React.ReactNode }) {
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

function HeadingDisplay({ longname, include_delete, on_click, on_change, screenshot_mode }: { longname: string, include_delete: boolean, on_click: () => void, on_change: (q: string) => void, screenshot_mode: boolean }) {

    const [is_editing, set_is_editing] = React.useState(false);
    const curr_universe = useUniverse();

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
        <a className="serif" href={article_link(curr_universe, longname)} style={{ textDecoration: "none" }}><div style={comparisonHeadStyle()}>{longname}</div></a>
        {is_editing ?
            <SearchBox
                autoFocus={true}
                style={{ ...comparisonHeadStyle(), width: "100%" }}
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
            for (const key of Object.keys(empty_row_example[idx]) as (keyof ArticleRow)[]) {
                if (typeof empty_row_example[idx][key] === "number") {
                    // @ts-expect-error Typescript is fucking up this assignment
                    empty_row_example[idx][key] = NaN;
                } else if (key == "extra_stat") {
                    empty_row_example[idx][key] = undefined;
                }
            }
            empty_row_example[idx].article_type = "none"; // doesn't matter since we are using simple mode
        }
    }

    const all_idxs = idxs.flat().filter((x, i, a) => a.indexOf(x) == i);
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

class ComparisonMap extends MapGeneric<MapGenericProps & { longnames: string[], colors: string[] }> {

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

    async compute_polygons(): Promise<Readonly<[string[], Record<string, unknown>[], Record<string, unknown>[], number]>> {
        const names = [];
        const styles = [];

        for (const i in this.props.longnames) {
            names.push(this.props.longnames[i]);
            styles.push({ color: this.props.colors[i], fillColor: this.props.colors[i], "fillOpacity": 0.5, "weight": 1 });
        }

        const zoom_index = -1;

        const metas = names.map(() => { return {} });

        return [names, styles, metas, zoom_index];
    }

    async mapDidRender() {
        console.log("mapDidRender")
        this.zoom_to_all();
    }
}