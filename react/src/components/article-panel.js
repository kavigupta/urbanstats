export { ArticlePanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { RelatedButton } from "./related-button.js";

class ArticlePanel extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <div className="text shortname">{this.props.shortname}</div>
                <div className="text longname">{this.props.longname}</div>

                <table className="centered_table">
                    <tbody>
                        <StatisticRowRaw is_header={true} />
                        {this.props.rows.map((row, i) => <StatisticRowRaw key={i} {...row} />)}
                    </tbody>
                </table>

                <p></p>

                <Map id="map" longname={this.props.longname} />

                <script src="/scripts/map.js"></script>

                <div className="centered_table">
                    <ul className="linklist">
                        <li className="linklistelfirst">Related</li>
                        {this.props.related.map((row, i) => <RelatedButton key={i} {...row} />)}
                    </ul>
                </div>

                <div className="text description centered_table">Source for {this.props.shortname}'s shape
                    is {this.props.source}. AW (area weighted) density is the standard Population/Area density.
                    PW (population weighted) density with a radius of X is the population-weighted density within
                    X miles of each census block's interior point, as defined by the census. For more information,
                    see <a href="https://kavigupta.org/2021/09/26/Youre-calculating-population-density-incorrectly/">this page</a>.

                    Website by Kavi Gupta. Density Database Version 1.2.0. Last updated 2023-05-21.
                </div>
            </div>
        );
    }
}