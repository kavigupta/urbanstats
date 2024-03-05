import React, { useState, useEffect, useRef } from 'react';
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'

import { article_link, explanation_page_link, ordering_link } from "../navigation/links.js";
import { loadProtobuf } from '../load_json.js';
import "./table.css";
import { is_historical_cd } from '../utils/is_historical.js';
import { ArticleRow } from "./load-article.js";
import { useSetting } from "../page_template/settings.js";

const table_row_style: React.CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
};

type StatisticRowRawProps = {    
    simple: boolean
    only_columns?: string[]
    _idx: number,
    index: number
} & ({
    is_header: false
    row: ArticleRow
    statistic_style?: React.CSSProperties
    simple: boolean
    onReplace: (newValue: string) => void
} | {
    is_header: true
})

export function StatisticRowRaw(props: StatisticRowRawProps) {
    const cells: [number, string, React.ReactNode][] = [
            [31,
                "statname",
                <span className="serif value">{
                    props.is_header ? "Statistic" :
                        <a className="statname_no_link" href={explanation_page_link(props.row.explanation_page)}>{props.row.statname}</a>
                }
                </span>
            ],
            [15,
                "statval",
                <div className="value_numeric">
                    <span className="serif value">{
                        props.is_header
                            ? "Value"
                            : <Statistic
                                statname={props.row.statname}
                                value={props.row.statval}
                                is_unit={false}
                                style={props.statistic_style}
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
                                statname={props.row.statname}
                                value={props.row.statval}
                                is_unit={true}
                            />}
                    </span>
                </div>
            ],
            [
                props.simple ? 8 : 25,
                "statistic_ordinal",
                <span className="serif ordinal">{
                    props.is_header
                        ? (props.simple ? right_align("Ord") : "Ordinal")
                        : <Ordinal ordinal={props.row.ordinal}
                            total={props.row.total_count_in_class}
                            type={props.row.article_type}
                            statpath={props.row.statpath}
                            simple={props.simple}
                            onReplace={props.onReplace}
                        />
                }</span>
            ],
            [
                props.simple ? 7 : 17,
                "statistic_percentile",
                <span className="serif ordinal">{
                    props.is_header
                        ? (props.simple ? right_align("%ile") : "Percentile")
                        : <Percentile ordinal={props.row.ordinal}
                            total={props.row.total_count_in_class}
                            percentile_by_population={props.row.percentile_by_population}
                            simple={props.simple}
                        />
                }</span>
            ],
            [8,
                "pointer_in_class",
                <span className="serif ordinal">{
                    props.is_header
                        ? "Within Type"
                        : <PointerButtonsIndex
                            ordinal={props.row.ordinal}
                            statpath={props.row.statpath}
                            type={props.row.article_type}
                            total={props.row.total_count_in_class}
                        />}</span>
            ],
            [8,
                "pointer_overall",
                <span className="serif ordinal">{
                    props.is_header
                        ? "Overall"
                        : <PointerButtonsIndex
                            ordinal={props.row.overallOrdinal}
                            statpath={props.row.statpath}
                            type="overall"
                            total={props.row.total_count_overall}
                        />}</span>
            ]
        ]

    const cell_contents = (total_width: number) => {
        const cell_percentages: number[] = [];
        const cell_contents = [];
        for (let i in cells) {
            if (props.only_columns?.includes(cells[i][1])) {
                continue;
            }
            cell_percentages.push(cells[i][0]);
            cell_contents.push(cells[i][2]);
        }
        // normalize cell percentages
        const sum = cell_percentages.reduce((a, b) => a + b, 0);
        for (let i in cell_percentages) {
            cell_percentages[i] = total_width * cell_percentages[i] / sum;
        }
        const contents = cell_contents.map((content, i) =>
            <div key={100 * props._idx + i} style={{ width: cell_percentages[i] + "%", padding: "1px" }}>
                {content}
            </div>
        );
        return contents;
    }

    return <StatisticRow is_header={props.is_header} index={props.index} contents={cell_contents(100)} />;
}

export function StatisticRow({ is_header, index, contents } : { is_header: boolean, index: number, contents: React.ReactNode }): React.ReactNode {
    return <div key={index} className={is_header ? "tableheader" : index % 2 == 1 ? "oddrow" : ""} style={table_row_style}>
        {contents}
    </div>
}


export function Statistic(props: { style?: React.CSSProperties, statname: string, value: number, is_unit: boolean }) {

    const [is_imperial] = useSetting('use_imperial')

    const content = (() => {
        {
            const name = props.statname;
            let value = props.value;
            const is_unit = props.is_unit;
            if (name.includes("Density")) {
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
            } else if (name == "Population" || name == "Population [GHS-POP]") {
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
                        return <span></span>;
                    }
                    return <span>{value.toFixed(0)}</span>;
                }
            } else if (name == "Area") {
                let unit;
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
            } else if (name.includes("%")) {
                if (is_unit) {
                    return <span>%</span>;
                }
                return <span>{(value * 100).toFixed(2)}</span>;
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
                    return <span></span>;
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
                return <span></span>;
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

function Ordinal(props: { ordinal: number, total: number, type: string, statpath: string, onReplace?: (newValue: string) => void, simple: boolean }) {
    const pluralize = (type: string) => {
        if (type.endsWith("y")) {
            return type.slice(0, -1) + "ies";
        }
        return type + "s";
    }

    const onNewNumber = async (number: number) => {
        let num = number;
        const link = ordering_link(props.statpath, props.type);
        if (num < 0) {
            // -1 -> this.props.total, -2 -> this.props.total - 1, etc.
            num = props.total + 1 + num;
        }
        if (num > props.total) {
            num = props.total;
        }
        if (num <= 0) {
            num = 1;
        }
        const data = (await loadProtobuf(link, "StringList")).elements;
        props.onReplace?.(data[num - 1])
    }

    if (props.ordinal > props.total) {
        return <span></span>
    }
    const en = <EditableNumber
        number={props.ordinal}
        onNewNumber={onNewNumber}
    />;
    if (props.simple) {
        return right_align(en);
    }
    return <span>
        {en} of {props.total} {pluralize(props.type)}
    </span>;
}

function EditableNumber(props: { number: number, onNewNumber: (newValue: number) => void }) {

    const contentEditable = useRef(null);
    const [html, setHtml] = useState(props.number.toString())

    const handleChange = (evt: ContentEditableEvent) => {
        setHtml(evt.target.value)
    };

    return (
        <ContentEditable
            className="editable_number"
            innerRef={contentEditable}
            html={html} // innerHTML of the editable div
            disabled={false}       // use true to disable editing
            onChange={handleChange} // handle innerHTML change
            onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key == "Enter") {
                    const number = parseInt(html);
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

function Percentile({ ordinal, total, simple, percentile_by_population }: { ordinal: number, total: number, simple: boolean, percentile_by_population: number }) {

    const [use_population_percentiles] = useSetting('use_population_percentiles')

    if (ordinal > total) {
        return <span></span>
    }
    // percentile as an integer
    const quantile =
        use_population_percentiles ?
            percentile_by_population
            : 1 - ordinal / total;
    const percentile = Math.floor(100 * quantile);
    if (simple) {
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
    return <span>{text}</span>;
}

function PointerButtonsIndex(props: { statpath: string, type: string, ordinal: number, total: number }) {
    const link = ordering_link(props.statpath, props.type);
    const [show_historical_cds] = useSetting('show_historical_cds') || is_historical_cd(props.type);
    return (
        <span>
            <PointerButtonIndex
                text="<"
                link={link}
                original_pos={props.ordinal}
                direction={-1}
                total={props.total}
                show_historical_cds={show_historical_cds}
            />
            <PointerButtonIndex
                text=">"
                link={link}
                original_pos={props.ordinal}
                direction={+1}
                total={props.total}
                show_historical_cds={show_historical_cds}
            />
        </span>
    );
}

function PointerButtonIndex(props: { total: number, link: string, show_historical_cds: boolean, direction: -1 | 1, original_pos: number, text: string }) {

    const out_of_bounds = (pos: number) => pos < 0 || pos >= props.total

    const onClick = async (pos: number) => {
        {
            const link = props.link;
            const data = (await loadProtobuf(link, "StringList")).elements;
            while (!out_of_bounds(pos)) {
                const name = data[pos];
                if (!props.show_historical_cds && is_historical_cd(name)) {
                    pos += props.direction;
                    continue;
                }
                document.location = article_link(name);
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