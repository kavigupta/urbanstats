import React, { useState, useEffect, useRef } from 'react';
import ContentEditable from 'react-contenteditable'

export { StatisticRowRaw, Statistic, statistic_row, Percentile };
import { article_link, ordering_link, statistic_link } from "../navigation/links.js";
import { loadProtobuf } from '../load_json.js';
import "./table.css";
import { is_historical_cd } from '../utils/is_historical.js';
import { pluralize } from '../utils/text.js';

const table_row_style = {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
};

class StatisticRowRaw extends React.Component {
    constructor(props) {
        super(props);
    }

    cells() {
        return [
            [31,
                "statname",
                <span className="serif value">{
                    this.props.is_header ? "Statistic" :
                        <a className="statname_no_link" href={
                            statistic_link(
                                this.props.statname, this.props.article_type, this.props.ordinal,
                                20, undefined, this.props.longname
                            )
                        }>{this.props.statname}</a>
                }
                </span>
            ],
            [15,
                "statval",
                <div className="value_numeric">
                    <span className="serif value">{
                        this.props.is_header
                            ? "Value"
                            : <Statistic
                                statname={this.props.statname}
                                value={this.props.statval}
                                is_unit={false}
                                settings={this.props.settings}
                                style={this.props.statistic_style || {}}
                            />}
                    </span>
                </div>
            ],
            [10,
                "statval_unit",
                <div className="value_unit">
                    <span className="serif value">{
                        this.props.is_header
                            ? ""
                            : <Statistic
                                statname={this.props.statname}
                                value={this.props.statval}
                                is_unit={true}
                                settings={this.props.settings}
                            />}
                    </span>
                </div>
            ],
            [
                this.props.simple ? 8 : 25,
                "statistic_ordinal",
                <span className="serif ordinal">{
                    this.props.is_header
                        ? (this.props.simple ? right_align("Ord") : "Ordinal")
                        : <Ordinal ordinal={this.props.ordinal}
                            total={this.props.total_count_in_class}
                            type={this.props.article_type}
                            statpath={this.props.statpath}
                            simple={this.props.simple}
                            onReplace={this.props.onReplace}
                        />
                }</span>
            ],
            [
                this.props.simple ? 7 : 17,
                "statistic_percentile",
                <span className="serif ordinal">{
                    this.props.is_header
                        ? (this.props.simple ? right_align("%ile") : "Percentile")
                        : <Percentile ordinal={this.props.ordinal}
                            total={this.props.total_count_in_class}
                            percentile_by_population={this.props.percentile_by_population}
                            settings={this.props.settings}
                            simple={this.props.simple}
                        />
                }</span>
            ],
            [8,
                "pointer_in_class",
                <span className="serif ordinal">{
                    this.props.is_header
                        ? "Within Type"
                        : <PointerButtonsIndex
                            ordinal={this.props.ordinal}
                            statpath={this.props.statpath}
                            type={this.props.article_type}
                            total={this.props.total_count_in_class}
                            settings={this.props.settings}
                        />}</span>
            ],
            [8,
                "pointer_overall",
                <span className="serif ordinal">{
                    this.props.is_header
                        ? "Overall"
                        : <PointerButtonsIndex
                            ordinal={this.props.overallOrdinal}
                            statpath={this.props.statpath}
                            type="overall"
                            total={this.props.total_count_overall}
                            settings={this.props.settings}
                        />}</span>
            ]
        ]
    }

    cell_contents(total_width) {
        var cell_percentages = [];
        var cell_contents = [];
        const cells = this.cells();
        for (let i in cells) {
            if (this.props.only_columns && !this.props.only_columns.includes(cells[i][1])) {
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
            <div key={100 * this.props._idx + i} style={{ width: cell_percentages[i] + "%", padding: "1px" }}>
                {content}
            </div>
        );
        return contents;
    }

    render() {
        return statistic_row(this.props.is_header, this.props.index, this.cell_contents(100));
    }
}

function statistic_row(is_header, index, contents) {
    return <div key={index} className={is_header ? "tableheader" : index % 2 == 1 ? "oddrow" : ""} style={table_row_style}>
        {contents}
    </div>
}


class Statistic extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const content = this.render_content();
        if (this.props.style) {
            return <span style={this.props.style}>{content}</span>;
        }
        return content;
    }

    render_content() {
        const name = this.props.statname;
        let value = this.props.value;
        const is_unit = this.props.is_unit;
        if (name.includes("Density")) {
            const is_imperial = this.props.settings.use_imperial;
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
                    return <span>&nbsp;</span>;
                }
                return <span>{value.toFixed(0)}</span>;
            }
        } else if (name == "Area") {
            const is_imperial = this.props.settings.use_imperial;
            let unit = "null";
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
            const is_imperial = this.props.settings.use_imperial;
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
                return <span>&nbsp;</span>;
            }
            const hours = Math.floor(value);
            const minutes = Math.floor((value - hours) * 60);
            // e.g., 3:05
            return <span>{hours}:{minutes.toString().padStart(2, "0")}</span>;
        } else if (name == "Rainfall" || name == "Snowfall [rain-equivalent]") {
            const is_imperial = this.props.settings.use_imperial;
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
}

class ElectionResult extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        // check if value is NaN
        if (this.props.value != this.props.value) {
            return <span>N/A</span>;
        }
        const value = Math.abs(this.props.value) * 100;
        const places = value > 10 ? 1 : value > 1 ? 2 : value > 0.1 ? 3 : 4;
        const text = value.toFixed(places);
        const party = this.props.value > 0 ? "D" : "R";
        return <span className={"party_result_" + party}>{party}+{text}</span>;
    }
}

class Ordinal extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const ordinal = this.props.ordinal;
        const total = this.props.total;
        const type = this.props.type;
        const self = this;
        if (ordinal > total) {
            return <span></span>
        }
        const en = <EditableNumber
            number={ordinal}
            onNewNumber={num => self.onNewNumber(num)}
        />;
        if (this.props.simple) {
            return right_align(en);
        }
        return <span>
            {en} of {total} {pluralize(type)}
        </span>;
    }

    async onNewNumber(number) {
        let num = number;
        const link = ordering_link(this.props.statpath, this.props.type);
        if (num < 0) {
            // -1 -> this.props.total, -2 -> this.props.total - 1, etc.
            num = this.props.total + 1 + num;
        }
        if (num > this.props.total) {
            num = this.props.total;
        }
        if (num <= 0) {
            num = 1;
        }
        const data = (await loadProtobuf(link, "StringList")).elements;
        this.props.onReplace(data[num - 1])
    }
}

class EditableNumber extends React.Component {
    constructor(props) {
        super(props);
        this.contentEditable = React.createRef();
        this.state = {
            html: this.props.number.toString(),
        };
    }
    handleChange = evt => {
        this.setState({ html: evt.target.value });
    };
    render() {
        const self = this;
        return (
            <ContentEditable
                className="editable_number"
                innerRef={this.contentEditable}
                html={this.state.html} // innerHTML of the editable div
                disabled={false}       // use true to disable editing
                onChange={this.handleChange} // handle innerHTML change
                onKeyDown={(e) => {
                    if (e.key == "Enter") {
                        const number = parseInt(self.state.html);
                        if (number != NaN) {
                            self.props.onNewNumber(number);
                        }
                        e.preventDefault();
                    }
                }}
                tagName='span' // Use a custom HTML tag (uses a div by default)
            />
        )
    }
};

class Percentile extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const ordinal = this.props.ordinal;
        const total = this.props.total;
        if (ordinal > total) {
            return <span></span>
        }
        // percentile as an integer
        const quantile =
            this.props.settings.use_population_percentiles ?
                this.props.percentile_by_population
                : 1 - ordinal / total;
        const percentile = Math.floor(100 * quantile);
        if (this.props.simple) {
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
}

class PointerButtonsIndex extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const link = ordering_link(this.props.statpath, this.props.type);
        const show_historical_cds = this.props.settings.show_historical_cds || is_historical_cd(this.props.type);
        return (
            <span>
                <PointerButtonIndex
                    text="<"
                    link={link}
                    original_pos={this.props.ordinal}
                    direction={-1}
                    total={this.props.total}
                    show_historical_cds={show_historical_cds}
                />
                <PointerButtonIndex
                    text=">"
                    link={link}
                    original_pos={this.props.ordinal}
                    direction={+1}
                    total={this.props.total}
                    show_historical_cds={show_historical_cds}
                />
            </span>
        );
    }
}

class PointerButtonIndex extends React.Component {
    constructor(props) {
        super(props);
    }

    out_of_bounds(pos) {
        return pos < 0 || pos >= this.props.total
    }

    render() {
        let pos = this.props.original_pos - 1 + + this.props.direction;
        const self = this;
        if (self.out_of_bounds(pos) || this.props.original_pos > this.props.total) {
            return <span className="button">&nbsp;&nbsp;</span>
        } else {
            return (
                <a href="#" className="button" onClick={() => self.onClick(pos)}>{this.props.text}</a>
            );
        }
    }
    async onClick(pos) {
        {
            const link = this.props.link;
            const data = (await loadProtobuf(link, "StringList")).elements;
            while (!this.out_of_bounds(pos)) {
                const name = data[pos];
                if (!this.props.show_historical_cds && is_historical_cd(name)) {
                    pos += this.props.direction;
                    continue;
                }
                document.location = article_link(name);
                return;
            }
        }
    }
}

function right_align(value) {
    return <span
        style={{ float: "right", marginRight: "5px" }}
    >{value}</span>;
}