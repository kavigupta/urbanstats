import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import { article_link } from './navigation/links';

import { go, showResults } from "./search.js"
import { loadJSON } from './load_json.js';



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
                                <div className="text main_page_header" style="vertical-align: middle; margin-right: 0.2em;">Random</div>
                            </td>
                            <td style={{ width: "80%" }}>
                                <table>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <button className="text button_random"
                                                    onClick={by_population}>Uniform</button>
                                            </td>
                                            <td>
                                                <button className="text button_random"
                                                    onClick={uniform}>Weighted by Population</button>
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
                                <form autocomplete="off" id="main-form" style="height: 100%; margin-block-end: 0em;">
                                    <input type="text" className="searchbox text shortname" name="q" id="q" />
                                </form>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ width: "20%" }}>
                            </td>
                            <td style={{ width: "80%" }}>
                                <div id="result"></div>
                            </td>

                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }

    componentDidMount() {
        document.getElementById("main-form").onsubmit = go;
        const form = document.getElementById("q");
        form.addEventListener("submit", go);
        form.onkeyup = function () { showResults(this.value) };
    }
}

function by_population() {
    let values = loadJSON("/index/pages.json");
    let populations = loadJSON("/index/population.json");
    var totalWeight = populations.reduce(function (sum, x) {
        return sum + x;
    }, 0);

    // Generate a random number between 0 and the total weight
    var randomValue = Math.random() * totalWeight;

    // Find the destination based on the random value
    var x = null;
    var cumulativeWeight = 0;

    for (var i = 0; i < values.length; i++) {
        cumulativeWeight += populations[i];

        if (randomValue < cumulativeWeight) {
            x = values[i];
            break;
        }
    }

    document.location = article_link(x);
}

function uniform() {
    let values = loadJSON("/index/pages.json");
    var randomIndex = Math.floor(Math.random() * values.length);
    let x = values[randomIndex];
    document.location = article_link(x);
}

async function loadPage() {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<IndexPanel />);
}

loadPage();