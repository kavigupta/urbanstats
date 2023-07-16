import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { PageTemplate } from "./page_template/template.js";


class DataCreditPanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        return (
            <div className="serif">
                <div className="text shortname">Data Credit</div>

                <p>
                    Shapes from Census and Zillow, Density, Race, and Vacancy Data from Census.
                    Election Data is from the US Elections Project's Voting and Elections Science Team
                    (<a href="https://twitter.com/VEST_Team">VEST</a>).
                </p>

                <p>
                    We used the American Community Survey 2021 5-year estimates for Education, Generation,
                    Income, Transportation, and Rent data. Generations are defined as follows:
                </p>
                    <ul>
                        <li>Silent: up to 1946</li>
                        <li>Boomer: 1946-1966</li>
                        <li>GenX: 1967-1981</li>
                        <li>Millenial: 1982-1996</li>
                        <li>GenZ: 1997-2011</li>
                        <li>GenAlpha: 2012-2021</li>
                    </ul>
                <p>
                    <b>Note that since these are 2021 estimates, there are some pandemic effects in Transportation etc.</b>
                </p>

            </div>
        );
    }
}

async function loadPage() {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<DataCreditPanel />);
}

loadPage();