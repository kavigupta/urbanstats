import { useState } from 'react';
import React from 'react';

import ReactDOM from 'react-dom/client';
import "../../html_templates/style.css";

class MainPanel extends React.Component {
    constructor(props) {
        super(props);
        // this.state = {
        //     longname: null,
        //     shortname: null,
        //     source: null,
        //     rows: [],
        //     related: [],
        // };
        // console.log(props);
        // this.setState(props);
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

                    <p />Website by Kavi Gupta. Density Database Version 1.3.2. Last updated 2023-05-21.
                </div>
            </div>
        );
    }
}

class StatisticRowRaw extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <tr className={this.props.is_header ? "tableheader" : ""}>
                <td style={{ width: "31%" }}>
                    <span className="text value">{
                        this.props.is_header ? "Statistic" : this.props.statname}
                    </span>
                </td>
                <td style={{ width: "15%" }}>
                    <span className="text value">{
                        this.props.is_header
                            ? "Value"
                            : <Statistic statname={this.props.statname} value={this.props.statval} />}</span>
                </td>
                <td style={{ width: "25%" }}>
                    <span className="text ordinal">{
                        this.props.is_header
                            ? "Ordinal"
                            : <Ordinal ordinal={this.props.ordinal}
                                total={this.props.total_in_class}
                                type={this.props.row_type} />
                    }</span>
                </td>
                <td style={{ width: "17%" }}>
                    <span className="text ordinal">{
                        this.props.is_header
                            ? "Percentile"
                            : <Percentile ordinal={this.props.ordinal}
                                total={this.props.total_in_class} />
                    }</span>
                </td>
                <td style={{ width: "8%" }}>
                    <span className="text ordinal">{
                        this.props.is_header
                            ? "Within Type"
                            : <PointerButtons pointers={this.props.ba_within_type} />}</span>
                </td>
                <td style={{ width: "8%" }}>
                    <span className="text ordinal">{
                        this.props.is_header
                            ? "Overall"
                            : <PointerButtons pointers={this.props.ba_overall} />}</span>
                </td>
            </tr>
        );
    }
}


class Statistic extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const name = this.props.statname;
        const value = this.props.value;
        if (name.includes("Density")) {
            let places = 2;
            if (value > 10) {
                places = 0;
            } else if (value > 1) {
                places = 1;
            }
            return <span>{value.toFixed(places)}/km< sup>2</sup></span>;
        } else if (name == "Population") {
            if (value > 1e6) {
                return <span>{(value / 1e6).toFixed(1)}m</span>;
            } else if (value > 1e3) {
                return <span>{(value / 1e3).toFixed(1)}k</span>;
            } else {
                return <span>{value.toFixed(0)}</span>;
            }
        } else if (name.includes("%")) {
            return <span>{(value * 100).toFixed(2)}%</span>;
        } else if (name.includes("Election")) {
            return <ElectionResult value={value} />;
        }
        return <span>{value.toFixed(3)}</span>;
    }
}

class ElectionResult extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        // check if value is NaN
        if (this.props.value != this.props.value) {
            return <span>N/A</span>;
        }
        const value = Math.abs(this.props.value) * 100;
        const places = value > 10 ? 1 : value > 1 ? 2 : value > 0.1 ? 3 : 4;
        const text = value.toFixed(places);
        const party = this.props.value > 0 ? "D" : "R";
        return <span className={"party_result_" + party}>{party}+{text}</span>;
    }
}

class Ordinal extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const ordinal = this.props.ordinal;
        const total = this.props.total;
        const type = this.props.type;
        return <span>{ordinal} of {total} {this.pluralize(type)}</span>;
    }

    pluralize(type) {
        if (type.endsWith("y")) {
            return type.slice(0, -1) + "ies";
        }
        return type + "s";
    }
}

class Percentile extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const ordinal = this.props.ordinal;
        const total = this.props.total;
        // percentile as an integer
        const percentile = Math.floor(100 - 100 * ordinal / total);
        // something like Xth percentile
        let text = percentile + "th percentile";
        if (percentile % 10 == 1 && percentile % 100 != 11) {
            text = percentile + "st percentile";
        } else if (percentile % 10 == 2 && percentile % 100 != 12) {
            text = percentile + "nd percentile";
        } else if (percentile % 10 == 3 && percentile % 100 != 13) {
            text = percentile + "rd percentile";
        }
        return <span>{text}</span>;
    }
}

class PointerButtons extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <span>
                <PointerButton text="<" longname={this.props.pointers[0]} />
                <PointerButton text=">" longname={this.props.pointers[1]} />
            </span>
        );
    }
}

class PointerButton extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        if (this.props.longname == null) {
            return <span className="button">&nbsp;&nbsp;</span>
        } else {
            return <a className="button" href={link(this.props.longname)}>{this.props.text}</a>
        }
    }
}

class RelatedButton extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const classes = `button b_${this.props.row_type.toLowerCase()}`
        return (
            <li className="linklistel">
                <a
                    className={classes}
                    href={link(this.props.longname)}>{this.props.shortname}
                </a>
            </li>
        );
    }
}

class Map extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div id={this.props.id} className="centered_table map"></div>
        );
    }

    async componentDidMount() {
        var osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            osmAttrib = '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            osm = L.tileLayer(osmUrl, { maxZoom: 20, attribution: osmAttrib });
        const map = new L.Map(this.props.id, { layers: [osm], center: new L.LatLng(0, 0), zoom: 0 });
        // get the current name of the url and replace with dat
        const url = "/shape/" + sanitize(this.props.longname) + '.json';
        // https://stackoverflow.com/a/35970894/1549476
        const polygons = await fetch(url)
            .then(res => res.json());
        let group = new L.featureGroup();
        for (let i = 0; i < polygons.length; i++) {
            let polygon = polygons[i];
            polygon = new L.Polygon(polygon);
            map.addLayer(polygon);
            group.addLayer(polygon);
        }
        map.fitBounds(group.getBounds(), { "animate": false });
    }
}

function link(longname) {
    return "/article.html?longname=" + sanitize(longname);
}

function sanitize(longname) {
    let x = longname;
    x = x.replace("/", " slash ");
    return x;
}

async function loadPage() {
    const window_info = new URLSearchParams(window.location.search);

    const longname = window_info.get("longname");
    const JSON5 = require("json5");
    const text = await fetch(`/data/${sanitize(longname)}.json`).then(res => res.text());
    const data = JSON5.parse(text);
    document.title = data.shortname;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<MainPanel longname={longname} {...data} />);
}

loadPage();