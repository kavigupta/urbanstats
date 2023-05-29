export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { RelatedButton } from "./related-button.js";
import { create_page } from "../page_template/template.js";
import "../common.css";
import "./article.css";

class ArticlePanel extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const main_content = (
            <div>
                <div className="text shortname">{this.props.shortname}</div>
                <div className="text longname">{this.props.longname}</div>

                <table className="stats_table">
                    <tbody>
                        <StatisticRowRaw is_header={true} />
                        {this.props.rows.map((row, i) => <StatisticRowRaw key={i} {...row} />)}
                    </tbody>
                </table>

                <p></p>

                <Map id="map" longname={this.props.longname} />

                <script src="/scripts/map.js"></script>

                <div className="stats_table">
                    <ul className="linklist">
                        <li className="linklistelfirst">Related</li>
                        {this.props.related.map((row, i) => <RelatedButton key={i} {...row} />)}
                    </ul>
                </div>
            </div>
        );
        return create_page(this.props, main_content);
    }
}