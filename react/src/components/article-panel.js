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

                    <p />Shapes from Census and Zillow, Demographic and Housing Data from Census, Election Data
                    from the US Elections Project's Voting and Elections Science Team
                    (<a href="https://twitter.com/VEST_Team">VEST</a>). Election Data is approximate and uses
                    VTD estimates when available. Data is precinct-level, disaggregated to the census block level
                    and then aggregated to the geography of interest based oqjn the centroid. Results might not
                    match official results. Data is from the 2016 and 2020 US Presidential general elections. N/A
                    indicates that the statistic is not available for the given geography, possibly because the
                    precinct boundaries in the dataset are slightly inaccurate, or there are no results for
                    the precincts overlapping the geography.

                    <p />Website by Kavi Gupta. Density Database Version 1.3.4. Last updated 2023-05-28.
                </div>
            </div>
        );
    }
}