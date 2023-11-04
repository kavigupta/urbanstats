export { MapperPanel };

import React from 'react';

import { Statistic } from "./table.js";
import { MapGeneric } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./article.css";
import { isMobile } from 'react-device-detect';
import { loadProtobuf } from '../load_json.js';
import { consolidated_shape_link, consolidated_stats_link } from '../navigation/links.js';
import { interpolate_color } from '../utils/color.js';

import { RAMPS, parse_ramp } from "../mapper/ramps.js";
import { MapperSettings, default_settings, parse_color_stat } from "../mapper/settings.js";

import { gunzipSync, gzipSync } from "zlib";

class DisplayedMap extends MapGeneric {
    constructor(props) {
        super(props);
        this.name_to_index = undefined;
    }

    async guarantee_name_to_index() {
        if (this.name_to_index === undefined) {
            const result = (await this.props.underlying_shapes).longnames;
            this.name_to_index = {};
            for (let i in result) {
                this.name_to_index[result[i]] = i;
            }
        }
    }

    async loadShape(name) {
        await this.guarantee_name_to_index();
        const index = this.name_to_index[name];
        const data = (await this.props.underlying_shapes).shapes[index];
        return data;
    }


    async compute_polygons() {
        // reset index
        this.name_to_index = undefined;
        await this.guarantee_name_to_index();

        const line_style = this.props.line_style;

        var stats = (await this.props.underlying_stats);
        // TODO correct this!
        if (this.props.filter !== undefined) {

            const filter_vals = stats.stats.map(x => this.props.filter.compute(x));
            stats = {
                stats: stats.stats.filter((x, i) => filter_vals[i]),
                longnames: stats.longnames.filter((x, i) => filter_vals[i]),
            }
        }
        const stat_vals = stats.stats.map(x => this.props.color_stat.compute(x));
        const names = stats.longnames;
        const [ramp, interpolations] = this.props.ramp.create_ramp(stat_vals);
        this.props.ramp_callback({ ramp: ramp, interpolations: interpolations });
        const colors = stat_vals.map(
            val => interpolate_color(ramp, val)
        );
        const styles = colors.map(
            // no outline, set color fill, alpha=1
            color => ({
                fillColor: color,
                fillOpacity: 1,
                color: line_style.color,
                opacity: 1,
                weight: line_style.weight,
            })
        );
        const metas = stat_vals.map((x) => { return { statistic: x } });
        return [names, styles, metas, -1];
    }

    async mapDidRender() {
        // zoom map to fit united states
        // do so instantly
        this.map.fitBounds([
            [49.3457868, -124.7844079],
            [24.7433195, -66.9513812]
        ], { animate: false });
    }
}


class Colorbar extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const self = this;
        // do this as a table with 10 columns, each 10% wide and
        // 2 rows. Top one is the colorbar, bottom one is the
        // labels.
        if (this.props.ramp === undefined) {
            return <div></div>;
        }
        const steps = 10;
        const min = this.props.ramp.ramp[0][0];
        const max = this.props.ramp.ramp[this.props.ramp.ramp.length - 1][0];
        const range = max - min;
        const values = this.props.ramp.interpolations;

        return (
            <div>
                <table style={{ width: "100%", height: "100%" }}>
                    <tbody>
                        <tr>
                            {
                                values.map((x, i) => (
                                    <td key={i} style={
                                        {
                                            width: "10%", height: "1em",
                                            backgroundColor: interpolate_color(self.props.ramp.ramp, x)
                                        }
                                    }>
                                    </td>
                                ))
                            }
                        </tr>
                        <tr>
                            {
                                values.map((x, i) => (
                                    <td key={i} style={{ width: "10%", height: "1em" }}>
                                        {self.create_value(x)}
                                    </td>
                                ))
                            }
                        </tr>
                    </tbody>
                </table>
                <div className="centered_text">
                    {this.props.name}
                </div>
            </div>
        );
    }
    create_value(stat) {
        return <div className="centered_text">
            <Statistic
                statname={this.props.name}
                value={stat}
                is_unit={false}
                settings={this.props.settings}
            />
            <Statistic
                statname={this.props.name}
                value={stat}
                is_unit={true}
                settings={this.props.settings}
            />
        </div>
    }
}

class MapComponent extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {

        const color_stat = parse_color_stat(this.props.name_to_index, this.props.color_stat);
        const filter = this.props.filter.enabled ? parse_color_stat(this.props.name_to_index, this.props.filter.function) : undefined;

        return (
            <div style={{
                display: "flex",
                flexDirection: "column",
            }}>
                <div style={{ height: "90%", width: "100%" }}>
                    <DisplayedMap
                        id="mapper"
                        color_stat={color_stat}
                        filter={filter}
                        geography_kind={this.props.geography_kind}
                        underlying_shapes={this.props.underlying_shapes}
                        underlying_stats={this.props.underlying_stats}
                        ramp={this.props.ramp}
                        ramp_callback={(ramp) => this.props.set_empirical_ramp(ramp)}
                        ref={this.props.map_ref}
                        line_style={this.props.line_style}
                        basemap={this.props.basemap}
                    />
                </div>
                <div style={{ height: "10%", width: "100%" }}>
                    <Colorbar
                        name={color_stat.name()}
                        ramp={this.props.get_empirical_ramp()}
                        settings={this.props.get_settings()}
                    />
                </div>
            </div>
        )
    }
}

class Export extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const self = this;
        return <div>
            <button onClick={() => {
                self.exportAsSvg()
            }}>Export as SVG</button>
            <button onClick={() => {
                self.exportAsGeoJSON()
            }}>Export as GeoJSON</button>
        </div>
    }

    saveAsFile(filename, data, type) {
        const blob = new Blob([data], { type: type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async exportAsSvg() {
        if (this.props.map_ref.current === null) {
            return;
        }
        const svg = await this.props.map_ref.current.exportAsSvg();
        this.saveAsFile("map.svg", svg, "image/svg+xml");
    }

    async exportAsGeoJSON() {
        if (this.props.map_ref.current === null) {
            return;
        }
        const geojson = await this.props.map_ref.current.exportAsGeoJSON();
        this.saveAsFile("map.geojson", geojson, "application/geo+json");
    }
}

class MapperPanel extends PageTemplate {
    constructor(props) {
        super(props);
        this.names = require("../data/statistic_name_list.json");
        this.valid_geographies = require("../data/mapper/used_geographies.json");
        this.name_to_index = {};
        for (let i in this.names) {
            this.name_to_index[this.names[i]] = i;
        }

        const map_settings = this.get_settings();

        this.state = {
            ...this.state,
            map_settings: map_settings
        };
        this.geography_kind = undefined;
        this.underlying_shapes = undefined;
        this.underlying_stats = undefined;
        this.map_ref = React.createRef();
    }

    get_settings() {
        const params = new URLSearchParams(window.location.search);
        const encoded_settings = params.get("settings");
        var settings = {}
        if (encoded_settings !== null) {
            const jsoned_settings = gunzipSync(Buffer.from(encoded_settings, 'base64')).toString();
            settings = JSON.parse(jsoned_settings);
        }
        default_settings(settings);
        return settings;
    }

    update_geography_kind() {
        const geography_kind = this.state.map_settings.geography_kind;
        if (this.geography_kind !== geography_kind) {
            this.geography_kind = geography_kind;

            if (this.valid_geographies.includes(geography_kind)) {
                this.underlying_shapes = loadProtobuf(
                    consolidated_shape_link(this.geography_kind),
                    "ConsolidatedShapes"
                );
                this.underlying_stats = loadProtobuf(
                    consolidated_stats_link(this.geography_kind),
                    "ConsolidatedStatistics"
                );

            }
        }
    }

    set_map_settings(settings) {
        this.setState({
            map_settings: settings
        });

        const jsoned_settings = JSON.stringify(settings);
        // gzip then base64 encode
        const encoded_settings = gzipSync(jsoned_settings).toString("base64");
        // convert to parameters like ?settings=...
        const params = new URLSearchParams(window.location.search);
        params.set("settings", encoded_settings);
        // window.history.replaceState(null, null, "?" + params.toString());
        // back button should work
        window.history.pushState(null, null, "?" + params.toString());
    }

    get_map_settings() {
        return this.state.map_settings;
    }

    main_content() {
        const ramp = parse_ramp(this.state.map_settings.ramp);
        this.update_geography_kind();
        const geography_kind = this.state.map_settings.geography_kind;
        const color_stat = this.state.map_settings.color_stat;
        const filter = this.state.map_settings.filter;
        const valid = this.valid_geographies.includes(geography_kind);
        return (
            <div>
                <div className={"centered_text " + (isMobile ? "headertext_mobile" : "headertext")}>Urban Stats Mapper</div>
                <MapperSettings
                    names={this.names}
                    valid_geographies={this.valid_geographies}
                    get_map_settings={() => this.get_map_settings()}
                    set_map_settings={(settings) => this.set_map_settings(settings)}
                />
                <Export
                    map_ref={this.map_ref}
                />
                {
                    !valid ? <div>Invalid geography kind</div> :

                        <MapComponent
                            name_to_index={this.name_to_index}
                            underlying_shapes={this.underlying_shapes}
                            underlying_stats={this.underlying_stats}
                            geography_kind={geography_kind}
                            get_settings={() => this.state.settings}
                            ramp={ramp}
                            get_empirical_ramp={() => this.state.empirical_ramp}
                            set_empirical_ramp={(ramp) => this.set_empirical_ramp(ramp)}
                            color_stat={color_stat}
                            filter={filter}
                            map_ref={this.map_ref}
                            line_style={this.state.map_settings.line_style}
                            basemap={this.state.map_settings.basemap}
                        />
                }
            </div>
        );
    }

    componentDidUpdate() {
        const self = this;
        window.onpopstate = e => {
            self.setState({
                map_settings: self.get_settings()
            });
        }
    }

    set_empirical_ramp(ramp) {
        if (JSON.stringify(ramp) != JSON.stringify(this.state.empirical_ramp)) {
            this.setState({ empirical_ramp: ramp });
        }
    }
}

