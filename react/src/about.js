import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { PageTemplate } from "./page_template/template.js";


class AboutPanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        return (
            <div className="serif">
                <div className="text shortname">About</div>

                <p>
                    AW (area weighted) density is the standard Population/Area density.
                    PW (population weighted) density with a radius of X is the population-weighted density within
                    X miles of each census block's interior point, as defined by the census. For more information,
                    see <a href="https://kavigupta.org/2021/09/26/Youre-calculating-population-density-incorrectly/">this page</a>.
                </p>

                <p>
                    Election Data is approximate and uses
                    VTD estimates when available. Data is precinct-level, disaggregated to the census block level
                    and then aggregated to the geography of interest based on the centroid. Results might not
                    match official results. Data is from the 2016 and 2020 US Presidential general elections. N/A
                    indicates that the statistic is not available for the given geography, possibly because the
                    precinct boundaries in the dataset are slightly inaccurate, or there are no results for
                    the precincts overlapping the geography.
                </p>
            </div>
        );
    }
}

async function loadPage() {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<AboutPanel />);
}

loadPage();