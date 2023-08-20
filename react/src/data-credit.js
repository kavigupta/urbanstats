import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { PageTemplate } from "./page_template/template.js";
import { isMobile } from 'react-device-detect';


class DataCreditPanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content() {
        return (
            <div className="serif">
                <div className={"centered_text " + (isMobile ? "headertext_mobile" : "headertext")}>Data Credit</div>

                <p>
                    Shapefiles on States, MSAs, CSAs, Counties, County subdivisions, Cities (CDPs),
                        Zip Codes (ZCTAs), Native Reservations, Native Reservation Subdivisions,
                        School Districts, Congressional Districts, and State Legislative Districts
                        are from the 2020 Census.
                </p>
                <p>
                    Shapefiles on Judicial Districts are from the HIFLD Open Data Portal.
                    Neighborhood shapefiles are from the 2017 Zillow Neighborhood Boundaries.
                    Shapefiles on Census Tracts, Census Block Groups, and Census Blocks are from the 2010 Census.
                    Shapefiles on historical congressional districts are mostly from UCLA with some
                    additions from thee Data Gov portal and the NC legislature. Media market
                    shapefiles are from <a href="https://datablends.us/2021/01/14/a-useful-dma-shapefile-for-tableau-and-alteryx/">Kenneth C Black</a>.
                </p>
                <p>
                    Density, Race, and Vacancy Data from Census.
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

                <p>
                    Hospital data is from HIFLD via <a href="https://www.kaggle.com/datasets/carlosaguayo/usa-hospitals">Kaggle</a>
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