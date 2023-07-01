export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";

class ArticlePanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        return (
            <div>
                <div className="centered_text shortname">{this.props.shortname}</div>
                <div className="centered_text longname">{this.props.longname}</div>

                <table className="stats_table">
                    <tbody>
                        <StatisticRowRaw is_header={true} />
                        {this.props.rows.map((row, i) => <StatisticRowRaw key={i} index={i} {...row} settings={this.state.settings}/>)}
                    </tbody>
                </table>

                <p></p>

                <Map id="map" longname={this.props.longname} />

                <script src="/scripts/map.js"></script>

                <Related {...this.props.related} settings={this.state.settings}/>
            </div>
        );
    }
}

