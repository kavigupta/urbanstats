import React, { useState, useEffect, useRef } from 'react';
import ContentEditable from 'react-contenteditable'

export { StatisticRowRaw };
import { article_link, ordering_link } from "../navigation/links.js";
import { loadProtobuf } from '../load_json.js';
import "./table.css";
import { is_historical_cd } from '../utils/is_historical.js';


class StatisticRowRaw extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <tr className={this.props.is_header ? "tableheader" : this.props.index % 2 == 1 ? "oddrow" : ""}>
                <td style={{ width: "31%" }}>
                    <span className="serif value">{
                        this.props.is_header ? "Statistic" : this.props.statname}
                    </span>
                </td>
                <td className="value_numeric" style={{ width: "10%" }}>
                    <span className="serif value">{
                        this.props.is_header
                            ? "Value"
                            : <Statistic
                                statname={this.props.statname}
                                value={this.props.statval}
                                is_unit={false}
                                settings={this.props.settings}
                            />}
                    </span>
                </td>
                <td className="value_unit" style={{ width: "5%" }}>
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
                </td>
                <td style={{ width: "25%" }}>
                    <span className="serif ordinal">{
                        this.props.is_header
                            ? "Ordinal"
                            : <Ordinal ordinal={this.props.ordinal}
                                total={this.props.total_count_in_class}
                                type={this.props.article_type}
                                statname={this.props.statname}
                            />
                    }</span>
                </td>
                <td style={{ width: "17%" }}>
                    <span className="serif ordinal">{
                        this.props.is_header
                            ? "Percentile"
                            : <Percentile ordinal={this.props.ordinal}
                                total={this.props.total_count_in_class}
                                percentile_by_population={this.props.percentile_by_population}
                                settings={this.props.settings}
                            />
                    }</span>
                </td>
                <td style={{ width: "8%" }}>
                    <span className="serif ordinal">{
                        this.props.is_header
                            ? "Within Type"
                            : <PointerButtonsIndex
                                ordinal={this.props.ordinal}
                                statname={this.props.statname}
                                type={this.props.article_type}
                                total={this.props.total_count_in_class}
                                settings={this.props.settings}
                            />}</span>
                </td>
                <td style={{ width: "8%" }}>
                    <span className="serif ordinal">{
                        this.props.is_header
                            ? "Overall"
                            : <PointerButtonsIndex
                                ordinal={this.props.overallOrdinal}
                                statname={this.props.statname}
                                type="overall"
                                total={this.props.total_count_overall}
                                settings={this.props.settings}
                            />}</span>
                </td>
            </tr>
        );
    }
}


class Statistic extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
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
        } else if (name == "Population") {
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
        } else if (name.includes("%")) {
            if (is_unit) {
                return <span>%</span>;
            }
            return <span>{(value * 100).toFixed(2)}</span>;
        } else if (name.includes("Election")) {
            if (is_unit) {
                return <span>%</span>;
            }
            return <ElectionResult value={value} />;
        }
        if (is_unit) {
            return <span></span>;
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
        return <span>
            <EditableNumber
                number={ordinal}
                onNewNumber={num => self.onNewNumber(num)}
            /> of {total} {this.pluralize(type)}
        </span>;
    }

    pluralize(type) {
        if (type.endsWith("y")) {
            return type.slice(0, -1) + "ies";
        }
        return type + "s";
    }

    async onNewNumber(number) {
        let num = number;
        const link = ordering_link(this.props.statname, this.props.type);
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
        document.location = article_link(data[num - 1]);
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
        const link = ordering_link(this.props.statname, this.props.type);
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
