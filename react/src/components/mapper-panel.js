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

class DisplayedMap extends MapGeneric {
    constructor(props) {
        super(props);
        this.underlying_shapes = loadProtobuf(
            consolidated_shape_link(this.props.geography_kind),
            "ConsolidatedShapes"
        );
        this.underlying_stats = loadProtobuf(
            consolidated_stats_link(this.props.geography_kind),
            "ConsolidatedStatistics"
        );
        this.name_to_index = undefined;
    }

    async guarantee_name_to_index() {
        if (this.name_to_index === undefined) {
            const result = (await this.underlying_stats).longnames;
            this.name_to_index = {};
            for (let i in result) {
                this.name_to_index[result[i]] = i;
            }
        }
    }

    async loadShape(name) {
        await this.guarantee_name_to_index();
        const index = this.name_to_index[name];
        const data = (await this.underlying_shapes).shapes[index];
        return data;
    }


    async compute_polygons() {
        const stats = (await this.underlying_stats);
        // TODO correct this!
        const names = stats.longnames;
        const stat_vals = stats.stats.map(x => x.stats[this.props.color_stat]);
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
                color: color,
                opacity: 1,
                weight: 0
            })
        );
        return [names, styles, -1];
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

class Ramp {
    create_ramp(values) {
        throw "create_ramp not implemented";
    }
}

class ConstantRamp extends Ramp {
    constructor(kepoints) {
        super();
        this.values = kepoints;
    }

    create_ramp(values) {
        return [this.values, linear_values(this.values[0][0], this.values[this.values.length - 1][0])];
    }
}

class LinearRamp extends Ramp {
    constructor(keypoints) {
        super();
        this.values = keypoints;
    }

    create_ramp(values) {
        values = values.filter(x => !isNaN(x));
        const minimum = Math.min(...values);
        const maximum = Math.max(...values);
        const range = maximum - minimum;
        const ramp_min = Math.min(...this.values.map(([value, color]) => value));
        const ramp_max = Math.max(...this.values.map(([value, color]) => value));
        const ramp_range = ramp_max - ramp_min;
        const ramp = this.values.map(x => [x[0], x[1]]);
        for (let i in ramp) {
            ramp[i][0] = (ramp[i][0] - ramp_min) / ramp_range * range + minimum;
        }
        return [ramp, linear_values(minimum, maximum)];
    }
}

function linear_values(minimum, maximum) {
    const steps = 10;
    const range = maximum - minimum;
    const values = Array(steps).fill(0).map((_, i) => minimum + range * i / (steps - 1));
    return values;
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
        console.log("HI", this.props.ramp)
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
                                values.map(x => (
                                    <td key={x} style={
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
                                values.map(x => (
                                    <td key={x} style={{ width: "10%", height: "1em" }}>
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

class MapperPanel extends PageTemplate {
    constructor(props) {
        super(props);
        this.names = require("../data/statistic_name_list.json");
        this.name_to_index = {};
        for (let i in this.names) {
            this.name_to_index[this.names[i]] = i;
        }
    }

    main_content() {
        const self = this;
        const ramp = new ConstantRamp([
            [-0.25, "#ff0000"], [-0.0001, "#ffdddd"], [0.0001, "#ddddff"], [0.25, "#0000ff"]
        ]);
        const stat_name = "2020 Presidential Election";
        const geography_kind = "Media Market";
        return (
            <div>
                <div className={"centered_text " + (isMobile ? "headertext_mobile" : "headertext")}>Urban Stats Mapper</div>

                {/* 90% vert space on first div, 10% on second */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                }}>
                    <div style={{ height: "90%", width: "100%" }}>
                        <DisplayedMap
                            id="mapper"
                            color_stat={this.name_to_index[stat_name]}
                            geography_kind={geography_kind}
                            ramp={ramp}
                            ramp_callback={(ramp) => self.set_empirical_ramp(ramp)}
                        />
                    </div>
                    <div style={{ height: "10%", width: "100%" }}>
                        <Colorbar name={stat_name} ramp={this.state.empirical_ramp} settings={this.state.settings} />
                    </div>
                </div>


                <script src="/scripts/map.js"></script>

            </div>
        );
    }

    set_empirical_ramp(ramp) {
        if (JSON.stringify(ramp) != JSON.stringify(this.state.empirical_ramp)) {
            this.setState({ empirical_ramp: ramp });
        }
    }
}

