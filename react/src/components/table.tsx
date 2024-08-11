import React, { useState, useEffect, useRef } from 'react';
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'

import { article_link, statistic_link } from "../navigation/links";
import { loadProtobuf, load_ordering } from '../load_json';
import "./table.css";
import { is_historical_cd } from '../utils/is_historical';
import { display_type } from '../utils/text';
import { ArticleRow } from './load-article';
import { useSetting } from '../page_template/settings';

const table_row_style: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
};

export type StatisticRowRawProps = {
    simple: boolean
    only_columns?: string[]
    _idx: number,
    statistic_style?: React.CSSProperties
    onReplace?: (newValue: string) => void
} & (
        (
            {
                is_header: false, simple: boolean
            } & ArticleRow
        ) | {
            is_header: true
        }
    )

export function StatisticRowRaw(props: StatisticRowRawProps & { index: number, universe: string, longname?: string }) {

    const cell_contents = StatisticRowRawCellContents({ ...props, total_width: 100 });

    return <StatisticRow is_header={props.is_header} index={props.index} contents={cell_contents} />;
}

export function StatisticRowRawCellContents(props: StatisticRowRawProps & { total_width: number, universe: string, longname?: string }) {
    if (props.universe == undefined) {
        throw "StatisticRowRawCellContents: universe is undefined";
    }
    const alignStyle: React.CSSProperties = { textAlign: props.is_header ? "center" : "right" };
    var value_columns: [number, string, React.ReactNode][] = [
        [15,
            "statval",
            <div style={alignStyle}>
                <span className="serif value">{
                    props.is_header
                        ? "Value"
                        : <Statistic
                            statname={props.statname}
                            value={props.statval}
                            is_unit={false}
                            style={props.statistic_style || {}}
                        />}
                </span>
            </div>
        ],
        [10,
            "statval_unit",
            <div className="value_unit">
                <span className="serif value">{
                    props.is_header
                        ? ""
                        : <Statistic
                            statname={props.statname}
                            value={props.statval}
                            is_unit={true}
                        />}
                </span>
            </div>
        ]
    ]
    if (props.is_header) {
        value_columns[0][0] += value_columns[1][0];
        value_columns = [value_columns[0]];
    }

    const cells: [number, string, React.ReactNode][] = [
        [31,
            "statname",
            <span className="serif value">{
                props.is_header ? "Statistic" :
                    <a className="statname_no_link" href={
                        statistic_link(
                            props.universe,
                            props.statname, props.article_type, props.ordinal,
                            20, undefined, props.longname!
                        )
                    }>{props.rendered_statname}</a>
            }
            </span>
        ],
        ...value_columns,
        [
            props.simple ? 8 : 25,
            "statistic_ordinal",
            <span className="serif ordinal">{
                props.is_header
                    ? (props.simple ? right_align("Ord") : "Ordinal")
                    : <Ordinal ordinal={props.ordinal}
                        total={props.total_count_in_class}
                        type={props.article_type}
                        statpath={props.statpath}
                        simple={props.simple}
                        onReplace={props.onReplace}
                        universe={props.universe}
                    />
            }</span>
        ],
        [
            props.simple ? 7 : 17,
            "statistic_percentile",
            <span className="serif ordinal">{
                props.is_header
                    ? (props.simple ? right_align("%ile") : "Percentile")
                    : <Percentile ordinal={props.ordinal}
                        total={props.total_count_in_class}
                        percentile_by_population={props.percentile_by_population}
                        simple={props.simple}
                    />
            }</span>
        ],
        [8,
            "pointer_in_class",
            props.is_header
                ? <span className="serif ordinal">Within Type</span>
                : <span className="serif ordinal" style={{ display: "flex" }}>
                    <PointerButtonsIndex
                        ordinal={props.ordinal}
                        statpath={props.statpath}
                        type={props.article_type}
                        total={props.total_count_in_class}
                        universe={props.universe}
                    />
                </span>
        ],
        [8,
            "pointer_overall",
            props.is_header
                ? <span className="serif ordinal">Overall</span>
                : <span className="serif ordinal" style={{ display: "flex" }}>
                    <PointerButtonsIndex
                        ordinal={props.overallOrdinal}
                        statpath={props.statpath}
                        type="overall"
                        total={props.total_count_overall}
                        universe={props.universe}
                    />
                </span>
        ]
    ];
    var cell_percentages: number[] = [];
    var cell_contents = [];
    for (let i in cells) {
        if (props.only_columns && !props.only_columns.includes(cells[i][1])) {
            continue;
        }
        cell_percentages.push(cells[i][0]);
        cell_contents.push(cells[i][2]);
    }
    // normalize cell percentages
    const sum = cell_percentages.reduce((a, b) => a + b, 0);
    for (let i in cell_percentages) {
        cell_percentages[i] = props.total_width * cell_percentages[i] / sum;
    }

    const contents = cell_contents.map(
        (content, i) => {
            const sty: React.CSSProperties = { width: cell_percentages[i] + "%", padding: "1px" };
            if (props.is_header) {
                sty.textAlign = "center";
            }
            return <div key={100 * props._idx + i} style={sty}>
                {content}
            </div>
        }
    );
    return contents;
}

export function StatisticRow({ is_header, index, contents }: { is_header: boolean, index: number, contents: React.ReactNode }): React.ReactNode {
    return <div key={index} className={is_header ? "tableheader" : index % 2 == 1 ? "oddrow" : ""}
        style={{ alignItems: is_header ? "center" : "last baseline", ...table_row_style }}
    >
        {contents}
    </div>
}


export function Statistic(props: { style?: React.CSSProperties, statname: string, value: number, is_unit: boolean }) {
    const [use_imperial, _] = useSetting("use_imperial");
    const content = (() => {
        {
            const name = props.statname;
            let value = props.value;
            const is_unit = props.is_unit;
            if (name.includes("%") || name.includes("Change")) {
                if (is_unit) {
                    return <span>%</span>;
                }
                return <span>{(value * 100).toFixed(2)}</span>;
            }
            else if (name.includes("Density")) {
                let unit_name = "km";
                if (is_imperial) {
                    unit_name = "mi";
                    value *= 1.60934 * 1.60934;
                }
                let places = 2;
                if (value > 10) {
                    places = 0;
                } else if (value > 1) {
                    places = 1;
                }
                if (is_unit) {
                    return <span>/&nbsp;{unit_name}<sup>2</sup></span>;
                }
                return <span>{value.toFixed(places)}</span>;
            } else if (name.startsWith("Population")) {
                if (value > 1e6) {
                    if (is_unit) {
                        return <span>m</span>;
                    }
                    return <span>{(value / 1e6).toFixed(1)}</span>;
                } else if (value > 1e3) {
                    if (is_unit) {
                        return <span>k</span>;
                    }
                    return <span>{(value / 1e3).toFixed(1)}</span>;
                } else {
                    if (is_unit) {
                        return <span>&nbsp;</span>;
                    }
                    return <span>{value.toFixed(0)}</span>;
                }
            } else if (name == "Area") {
                let unit: string | React.ReactElement = "null";
                if (is_imperial) {
                    value /= 1.60934 * 1.60934;
                    if (value < 1) {
                        unit = <span>acres</span>
                        value *= 640;
                    } else {
                        unit = <span>mi<sup>2</sup></span>;
                    }
                } else {
                    if (value < 0.01) {
                        value *= 1000 * 1000;
                        unit = <span>m<sup>2</sup></span>;
                    } else {
                        unit = <span>km<sup>2</sup></span>;
                    }
                }
                if (is_unit) {
                    return unit;
                } else {
                    if (value > 100) {
                        return <span>{value.toFixed(0)}</span>
                    } else if (value > 10) {
                        return <span>{value.toFixed(1)}</span>
                    } else if (value > 1) {
                        return <span>{value.toFixed(2)}</span>
                    } else {
                        return <span>{value.toFixed(3)}</span>
                    }
                }
            } else if (name.includes("Mean distance")) {
                let unit = <span>km</span>;
                if (is_imperial) {
                    unit = <span>mi</span>
                    value /= 1.60934;
                }
                if (is_unit) {
                    return unit;
                } else {
                    return <span>{value.toFixed(2)}</span>
                }
            } else if (name.includes("Election") || name.includes("Swing")) {
                if (is_unit) {
                    return <span>%</span>;
                }
                return <ElectionResult value={value} />;
            } else if (name.includes("high temp") || name.includes("high heat index") || name.includes("dewpt")) {
                if (is_unit) {
                    return <span>&deg;F</span>;
                }
                return <span>{value.toFixed(1)}</span>;
            } else if (name == "Mean sunny hours") {
                if (is_unit) {
                    return <span>&nbsp;</span>;
                }
                const hours = Math.floor(value);
                const minutes = Math.floor((value - hours) * 60);
                // e.g., 3:05
                return <span>{hours}:{minutes.toString().padStart(2, "0")}</span>;
            } else if (name == "Rainfall" || name == "Snowfall [rain-equivalent]") {
                value *= 100;
                let unit = "cm";
                if (is_imperial) {
                    unit = "in";
                    value /= 2.54;
                }
                if (is_unit) {
                    return <span>{unit}/yr</span>;
                }
                return <span>{value.toFixed(1)}</span>;
            }
            if (is_unit) {
                return <span>&nbsp;</span>;
            }
            return <span>{value.toFixed(3)}</span>;
        }
    })()

    if (props.style) {
        return <span style={props.style}>{content}</span>;
    }
    return content;

}

function ElectionResult(props: { value: number }) {
    if (Number.isNaN(props.value)) {
        return <span>N/A</span>;
    }
    const value = Math.abs(props.value) * 100;
    const places = value > 10 ? 1 : value > 1 ? 2 : value > 0.1 ? 3 : 4;
    const text = value.toFixed(places);
    const party = props.value > 0 ? "D" : "R";
    return <span className={"party_result_" + party}>{party}+{text}</span>;
}

export function Ordinal(props: { ordinal: number, total: number, type: string, statpath: string, onReplace?: (newValue: string) => void, simple: boolean, universe: string }) {
    if (props.universe == undefined) {
        throw "Ordinal: universe is undefined";
    }
    const onNewNumber = async (number: number) => {
        let num = number;
        if (num < 0) {
            // -1 -> props.total, -2 -> props.total - 1, etc.
            num = props.total + 1 + num;
        }
        if (num > props.total) {
            num = props.total;
        }
        if (num <= 0) {
            num = 1;
        }
        const data = await load_ordering(props.universe, props.statpath, props.type);
        props.onReplace?.(data[num - 1])
    }
    const ordinal = props.ordinal;
    const total = props.total;
    const type = props.type;
    if (ordinal > total) {
        return <span></span>
    }
    const en = <EditableNumber
        number={ordinal}
        onNewNumber={onNewNumber}
    />;
    if (props.simple) {
        return right_align(en);
    }
    return <div className="serif" style={{ textAlign: "right" }}>
        {en} of {total} {display_type(props.universe, type)}
    </div>;
}

function EditableNumber(props: { number: number, onNewNumber: (newValue: number) => void }) {
    const contentEditable: React.Ref<HTMLElement> = useRef(null);
    const [html, setHtml] = useState(props.number.toString())

    const handleChange = (evt: ContentEditableEvent) => {
        setHtml(evt.target.value)
    };

    return (
        <ContentEditable
            className="editable_number"
            innerRef={contentEditable}
            html={html}
            disabled={false}
            onChange={handleChange}
            onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key == "Enter") {
                    const number = parseInt(contentEditable.current!.innerText || "");
                    if (!Number.isNaN(number)) {
                        props.onNewNumber(number);
                    }
                    e.preventDefault();
                }
            }}
            tagName='span' // Use a custom HTML tag (uses a div by default)
        />
    )
};

export function Percentile(props: { ordinal: number, total: number, percentile_by_population: number, simple: boolean }) {

    const use_population_percentiles = true
    const ordinal = props.ordinal;
    const total = props.total;
    if (ordinal > total) {
        return <span></span>
    }
    // percentile as an integer
    // used to be keyed by a setting, but now we always use percentile_by_population
    const quantile =
        use_population_percentiles ?
            props.percentile_by_population
            : 1 - ordinal / total;
    const percentile = Math.floor(100 * quantile);
    if (props.simple) {
        return right_align(percentile.toString() + "%");
    }
    // something like Xth percentile
    let text = percentile + "th percentile";
    if (percentile % 10 == 1 && percentile % 100 != 11) {
        text = percentile + "st percentile";
    } else if (percentile % 10 == 2 && percentile % 100 != 12) {
        text = percentile + "nd percentile";
    } else if (percentile % 10 == 3 && percentile % 100 != 13) {
        text = percentile + "rd percentile";
    }
    return <div className="serif" style={{ textAlign: "right" }}>{text}</div>;
}

function PointerButtonsIndex(props: { ordinal: number, statpath: string, type: string, total: number, universe: string }) {
    const get_data = async () => await load_ordering(props.universe, props.statpath, props.type);
    const [settings_show_historical_cds, _] = useSetting("show_historical_cds");
    const show_historical_cds = settings_show_historical_cds || is_historical_cd(props.type);
    return (
        <span style={{ margin: "auto" }}>
            <PointerButtonIndex
                text="<"
                get_data={get_data}
                original_pos={props.ordinal}
                direction={-1}
                total={props.total}
                show_historical_cds={show_historical_cds}
                universe={props.universe}
            />
            <PointerButtonIndex
                text=">"
                get_data={get_data}
                original_pos={props.ordinal}
                direction={+1}
                total={props.total}
                show_historical_cds={show_historical_cds}
                universe={props.universe}
            />
        </span>
    );
}

function PointerButtonIndex(props: { text: string, get_data: () => Promise<string[]>, original_pos: number, direction: number, total: number, show_historical_cds: boolean, universe: string }) {
    const out_of_bounds = (pos: number) => pos < 0 || pos >= props.total
    const onClick = async (pos: number) => {
        {
            const data = await props.get_data();
            while (!out_of_bounds(pos)) {
                const name = data[pos];
                if (!props.show_historical_cds && is_historical_cd(name)) {
                    pos += props.direction;
                    continue;
                }
                document.location = article_link(props.universe, name);
                return;
            }
        }
    }
    let pos = props.original_pos - 1 + + props.direction;
    if (out_of_bounds(pos) || props.original_pos > props.total) {
        return <span className="button">&nbsp;&nbsp;</span>
    } else {
        return (
            <a href="#" className="button" onClick={() => onClick(pos)}>{props.text}</a>
        );
    }
}

function right_align(value: React.ReactNode) {
    return <span
        style={{ float: "right", marginRight: "5px" }}
    >{value}</span>;
}