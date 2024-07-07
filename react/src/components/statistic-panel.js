export { StatisticPanel };

import React from 'react';

import { PageTemplate } from "../page_template/template";
import "../common.css";
import "./article.css";
import { headerTextClass, subHeaderTextClass } from '../utils/responsive';
import { article_link, explanation_page_link, sanitize, statistic_link } from '../navigation/links';
import { Percentile, Statistic } from './table.js';
import { display_type } from '../utils/text.js';

const table_style = { display: "flex", flexDirection: "column", padding: "1px" };
const column_names = ["Ordinal", "Name", "Value", "", "Percentile"];
const column_widths = ["15%", "60%", "20%", "10%", "20%"];
const column_styles = [
    { textAlign: "right", paddingRight: "1em" },
    { textAlign: "left" },
    { textAlign: "right" },
    { textAlign: "left" },
    { textAlign: "right" }
];

class StatisticPanel extends PageTemplate {
    constructor(props) {
        super(props);
        this.headers_ref = React.createRef();
        this.table_ref = React.createRef();
        console.log(this.props);
        this.index_range = this.compute_index_range();
    }

    has_screenshot_button() {
        return true;
    }

    screencap_elements() {
        return {
            path: sanitize(this.props.joined_string) + ".png",
            overall_width: this.table_ref.current.offsetWidth * 2,
            elements_to_render: [this.headers_ref.current, this.table_ref.current],
        }
    }

    has_universe_selector() {
        return true;
    }

    is_ascending() {
        return this.props.ordering === "ascending";
    }

    rendered_order() {
        return this.is_ascending() ? "ascending" : "descending";
    }

    swap_ascending_descending() {
        var new_order = this.is_ascending() ? "descending" : "ascending";
        document.location = statistic_link(
            this.state.current_universe,
            this.props.statname, this.props.article_type,
            1, this.props.amount, new_order,
            undefined
        );
    }

    compute_index_range() {
        var start = this.props.start - 1;
        var end = start + this.props.amount;
        if (end + this.props.amount >= this.props.count) {
            end = this.props.count;
        }
        const total = this.props.count;
        const result = Array.from({ length: end - start }, (_, i) => {
            if (this.is_ascending()) {
                return total - i - 1;
            }
            return start + i;
        });
        return result;
    }

    background_color(row_idx) {
        if (row_idx > 0) {
            const name_at_idx = this.props.article_names[this.index_range[row_idx - 1]];
            if (name_at_idx === this.props.highlight) {
                return "#d4b5e2";
            }
        }
        if (row_idx % 2 === 1) {
            return "#f7f1e8";
        }
        return "#fff8f0";
    }

    style(col_idx, row_idx) {
        var style = { ...table_style };
        if (row_idx == 0) {
            // header, add a line at the bottom
            style.borderBottom = "1px solid #000";
            style.fontWeight = 500;
        }
        style.backgroundColor = this.background_color(row_idx);
        style.width = column_widths[col_idx];
        style = { ...style, ...column_styles[col_idx] };
        return style;
    }

    main_content() {
        return <div>
            <div ref={this.headers_ref}>
                <div className={headerTextClass()}>{this.props.statname}</div>
                {/* // TODO plural */}
                <div className={subHeaderTextClass()}>{display_type(this.state.current_universe, this.props.article_type)} ({this.rendered_order()})</div>
            </div>
            <div style={{ marginBlockEnd: "16px" }}></div>
            <div className="serif" ref={this.table_ref}>
                <div style={{ display: "flex" }}>
                    {column_names.map((name, i) => {
                        if (i === 0) {
                            return <div key={name} style={{ ...this.style(i, 0), "display": "flex", "justifyContent": "space-between", "flexDirection": "row" }}>
                                <div>{name}</div>
                                <AscendingVsDescending on_click={() => this.swap_ascending_descending()} is_ascending={this.is_ascending()} />
                            </div>
                        }
                        return <div key={name} style={this.style(i, 0)}>{name}</div>
                    })}
                </div>
                {
                    this.index_range.map((i, row_idx) => <div key={i} style={{
                        display: "flex", alignItems: "baseline", backgroundColor: this.background_color(row_idx + 1)
                    }}>
                        <div style={this.style(0, row_idx + 1)}>{i + 1}</div>
                        <div style={this.style(1, row_idx + 1)}>
                            <a href={article_link(this.state.current_universe, this.props.article_names[i])} style={{ fontWeight: 500, color: "black", textDecoration: "none" }}>{this.props.article_names[i]}</a>
                        </div>
                        <div style={this.style(2, row_idx + 1)} className='value'>
                            <Statistic
                                statname={this.props.statname}
                                value={this.props.data.value[i]}
                                is_unit={false}
                                settings={this.state.settings}
                            />
                        </div>
                        <div style={this.style(3, row_idx + 1)} className='value_unit value'>
                            <Statistic
                                statname={this.props.statname}
                                value={this.props.data.value[i]}
                                is_unit={true}
                                settings={this.state.settings}
                            />
                        </div>
                        <div style={this.style(4, row_idx + 1)}>
                            <Percentile ordinal={this.props.ordinal}
                                total={this.props.total_count_in_class}
                                percentile_by_population={this.props.data.populationPercentile[i]}
                                settings={this.state.settings}
                                simple={this.state.settings.simple_ordinals}
                            />
                        </div>
                    </div>)}
            </div>
            <div style={{ marginBlockEnd: "1em" }}></div>
            {this.pagination()}
        </div>
    }

    pagination() {
        // next and previous buttons, along with the current range (editable to jump to a specific page)
        // also a button to change the number of items per page

        const self = this;

        const current = this.props.start;
        const total = this.props.count;
        const per_page = this.props.amount;
        const prev = Math.max(1, current - per_page);
        const max_pages = Math.floor(total / per_page);
        const max_page_start = (max_pages - 1) * per_page + 1;
        const next = Math.min(max_page_start, current + per_page);
        const current_page = Math.ceil(current / per_page);

        // low-key style for the buttons
        const button_style = {
            backgroundColor: "#f7f1e8",
            border: "1px solid #000",
            padding: "0 0.5em",
            margin: "0.5em"
        };

        const select_page = <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <button onClick={() => this.change_start(prev)} className="serif" style={button_style}>&lt;</button>
            <div>
                <span>Page: </span>
                <input type="string" pattern="[0-9]*"
                    style={{ width: "3em", textAlign: "right" }}
                    className="serif"
                    defaultValue={current_page} onKeyDown={e => {
                        if (e.key === "Enter") {
                            var new_page = e.target.value;
                            if (typeof new_page === "string") {
                                new_page = parseInt(new_page);
                            }
                            if (typeof new_page === "number") {
                                if (new_page < 1) {
                                    new_page = 1;
                                }
                                if (new_page > max_pages) {
                                    new_page = max_pages;
                                }
                                const new_start = (new_page - 1) * per_page + 1;
                                self.change_start(new_start);
                            }
                        }
                    }} />
                <span> of {max_pages}</span>
            </div>
            <button onClick={() => this.change_start(next)} className="serif" style={button_style}>&gt;</button>
        </div>;

        // align the entire div to the center. not flex.
        return <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
            margin: "1em"
        }}>
            <div style={{ width: "25%" }}>
                <div style={{ margin: "auto", textAlign: "center" }}>
                    <a href={explanation_page_link(this.props.explanation_page)}>Data Explanation and Credit</a>
                </div>
            </div>
            <div style={{ width: "50%" }}>
                <div style={{ margin: "auto", textAlign: "center" }}>
                    {select_page}
                </div>
            </div>
            <div style={{ width: "25%" }}>
                <div style={{ margin: "auto", textAlign: "center" }}>
                    <span><select defaultValue={
                        per_page == total ? "All" : per_page
                    } onChange={e => this.change_amount(e.target.value)} className="serif">
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="All">All</option>
                    </select> per page</span>
                </div>
            </div>
        </div>
    }

    change_start(new_start) {
        document.location.href = statistic_link(
            this.state.current_universe,
            this.props.statname, this.props.article_type,
            new_start, this.props.amount, this.props.order, undefined
        );
    }

    change_amount(new_amount) {
        const new_amount_str = new_amount;
        var start = this.props.start;
        if (new_amount === "All") {
            start = 1;
            new_amount = this.props.count;
        }
        if (typeof new_amount === "string") {
            new_amount = parseInt(new_amount);
        }
        if (start > this.props.count - new_amount) {
            start = this.props.count - new_amount + 1;
        }
        if (typeof new_amount === "number") {
            document.location.href = statistic_link(
                this.state.current_universe,
                this.props.statname,
                this.props.article_type,
                start,
                new_amount_str,
                this.props.order,
                undefined
            );
        }
    }
}

function AscendingVsDescending({ on_click, is_ascending }) {
    // either an up or down arrow, depending on the current ordering
    return <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ cursor: "pointer" }} onClick={on_click}>
            {is_ascending ? "▲" : "▼"}
        </div>
    </div>
}