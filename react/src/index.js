import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";

import { SearchBox } from './components/search.js';
import { uniform, by_population } from './navigation/random.js';


class IndexPanel extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <div className="centered_table">
                    <a href="/index.html"><img src="/banner.png" className="logo" alt="Density Database Logo" width="100%" /></a>
                </div>

                <div className="text centered_table" style={{ textAlign: "left" }}>
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

                <p></p>

                <table className="centered_table">
                    <tbody>
                        <tr>
                            <td style={{ width: "20%" }}>
                                <div className="text main_page_header" style={{ verticalAlign: "middle", marginRight: "0.2em" }}>Random</div>
                            </td>
                            <td style={{ width: "80%" }}>
                                <table>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <button className="text button_random"
                                                    onClick={uniform}>Uniform</button>
                                            </td>
                                            <td>
                                                <button className="text button_random"
                                                    onClick={by_population}>Weighted by Population</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ width: "20%" }}>
                                <div className="text main_page_header">Search</div>
                            </td>
                            <td style={{ width: "80%" }}>
                                <SearchBox id="q" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

async function loadPage() {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<IndexPanel />);
}

loadPage();