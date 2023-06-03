import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { create_page } from "./page_template/template.js";


class DataCreditPanel extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const main_content = (
            <div className="serif">
                <div className="text shortname">Data Credit</div>

                <p>
                    Shapes from Census and Zillow, Demographic and Housing Data from Census.
                    Election Data is from the US Elections Project's Voting and Elections Science Team
                    (<a href="https://twitter.com/VEST_Team">VEST</a>).
                </p>

            </div>
        );
        return create_page(this.props, main_content);
    }
}

async function loadPage() {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<DataCreditPanel />);
}

loadPage();