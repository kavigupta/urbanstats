export { StatisticPanel };

import React from 'react';

import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { headerTextClass, subHeaderTextClass } from '../utils/responsive.js';
import { article_link, sanitize, statistic_link } from '../navigation/links.js';

const table_style = { display: "flex", flexDirection: "column", padding: "0.5em" };
const column_names = ["Ordinal", "Name"];
const column_widths = ["10%", "90%"];
const column_styles = [{ alignItems: "right" }, { alignItems: "left" }];

class StatisticPanel extends PageTemplate {
    constructor(props) {
        super(props);
        this.main_ref = React.createRef();
    }

    has_screenshot_button() {
        return true;
    }

    screencap_elements() {
        return {
            path: sanitize(this.props.joined_string) + ".png",
            overall_width: this.main_ref.current.offsetWidth * 2,
            elements_to_render: [this.main_ref.current],
        }
    }

    is_ascending() {
        return this.props.ordering === "ascending";
    }

    rendered_order() {
        return this.is_ascending() ? "Ascending" : "Descending";
    }

    index_range() {
        var start = this.props.start - 1;
        var end = start + this.props.amount;
        if (end + this.props.amount >= this.props.article_names.elements.length) {
            end = this.props.article_names.elements.length;
        }
        const total = this.props.article_names.elements.length;
        return Array.from({ length: end - start }, (_, i) => {
            if (this.is_ascending()) {
                return total - i - 1;
            }
            return start + i;
        });
    }

    style(col_idx, row_idx) {
        var style = { ...table_style };
        if (row_idx == 0) {
            // header, add a line at the bottom
            style.borderBottom = "1px solid #000";
        }
        if (row_idx % 2 === 1) {
            style.backgroundColor = "#f8f8f8";
        }
        style.width = column_widths[col_idx];
        style = { ...style, ...column_styles[col_idx] };
        return style;
    }

    main_content() {
        return <div ref={this.main_ref}>
            <div className={headerTextClass()}>{this.props.statname}</div>
            {/* // TODO plural */}
            <div className={subHeaderTextClass()}>{this.props.article_type} ({this.rendered_order()})</div>

            <div className="serif">
                <div style={{ display: "flex" }}>
                    {column_names.map((name, i) => <div key={name} style={this.style(i, 0)}>{name}</div>)}
                </div>
                {
                    this.index_range().map((i, row_idx) => <div key={i} style={{ display: "flex" }}>
                        <div style={this.style(0, row_idx + 1)}>{i + 1}</div>
                        <div style={this.style(1, row_idx + 1)}>
                            <a href={article_link(this.props.article_names.elements[i])} style={{ fontWeight: "bold", color: "black", textDecoration: "none" }}>{this.props.article_names.elements[i]}</a>
                        </div>
                    </div>)}
            </div>
            {this.pagination()}
        </div>
    }

    pagination() {
        // next and previous buttons, along with the current range (editable to jump to a specific page)
        // also a button to change the number of items per page

        const self = this;

        const current = this.props.start;
        const total = this.props.article_names.elements.length;
        const per_page = this.props.amount;
        const prev = Math.max(1, current - per_page);
        const next = Math.min(total, current + per_page);
        const max_pages = Math.floor(total / per_page);
        const current_page = Math.ceil(current / per_page);

        return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
                <button onClick={() => this.change_start(prev)}>Previous</button>
                <button onClick={() => this.change_start(next)}>Next</button>
            </div>
            <div>
                <span>Page: </span>
                <input type="number" defaultValue={current_page} onKeyDown={e => {
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
            <div>
                <span>Showing <select defaultValue={per_page} onChange={e => this.change_amount(e.target.value)}>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value={total}>All</option>
                </select> per page</span>
            </div>
        </div>
    }

    change_start(new_start) {
        document.location.href = statistic_link(this.props.statname, this.props.article_type, new_start, this.props.amount, this.props.order);
    }

    change_amount(new_amount) {
        var start = this.props.start;
        if (new_amount === "All") {
            start = 1;
            new_amount = this.props.article_names.elements.length;
        }
        if (typeof new_amount === "string") {
            new_amount = parseInt(new_amount);
        }
        if (start > this.props.article_names.elements.length - new_amount) {
            start = this.props.article_names.elements.length - new_amount + 1;
        }
        if (typeof new_amount === "number") {
            document.location.href = statistic_link(this.props.statname, this.props.article_type, start, new_amount, this.props.order);
        }
    }
}