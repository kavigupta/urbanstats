import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";

import { SearchBox } from './components/search.js';
import { uniform, by_population } from './navigation/random.js';
import { PageTemplate } from './page_template/template';


class IndexPanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        return (
            <div>
                <div className="centered_table">
                    <a href="/index.html"><img src="/banner.png" className="logo" alt="Density Database Logo" width="100%" /></a>
                </div>

                <div className="centered_text centered_table" style={{ textAlign: "left" }}>
                    <p>The Density Database is a database of various statistics related to density, housing, and race
                        in the United States for a variety of regions. It is intended to be a resource for journalists,
                        researchers, and anyone else who is interested in these topics. The data is collected from the
                        US Census Bureau's 2020 census; and shapefiles for each region of interest are obtained from
                        the US Census Bureau's TIGER/Line database; except for the shapefiles for neighborhoods, which
                        are obtained from <a href="https://catalog.data.gov/dataset/neighborhoods-us-2017-zillow-segs">Zillow</a>.

                        Election Data is from the <a href="https://www.electproject.org/home">US Elections Project's</a>
                        Voting and Elections Science Team
                        (<a href="https://twitter.com/VEST_Team">VEST</a>).
                    </p>
                    <p>Website by Kavi Gupta (<a href="https://kavigupta.org">kavigupta.org</a>, <a
                        href="https://twitter.com/notkavi">@notkavi</a>)</p>
                </div>
            </div>
        );
    }
}

async function loadPage() {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<IndexPanel />);
}

loadPage();