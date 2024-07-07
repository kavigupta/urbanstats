import React, { useReducer } from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { PageTemplate } from "./page_template/template";


class AboutPanel extends PageTemplate {
    constructor(props) {
        super(props);
    }

    main_content(responsive) {
        return (
            <div className="serif">
                <div className={responsive.headerTextClass}>About</div>

                <p>
                    Urban Stats is a database of various statistics, computed largely from Census Data but also other
                    sources, for a variety of regions in the United States. The goal of this project is to provide a
                    resource for people to learn about the places they live, and to provide a resource for journalists
                    and researchers to find interesting statistics about places they are studying.
                </p>

                <p>
                    The project is open source, and the code is available on
                    <a href="https://github.com/kavigupta/population-density-metric/">GitHub</a>.
                    Feel free to file an issue or pull request if you have any suggestions or find any bugs.
                </p>

                <p>
                    The project is developed by Kavi Gupta, a PhD student at MIT. You can contact them
                    about the project at urbanstats at kavigupta dot org.
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