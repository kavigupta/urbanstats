
export { MapperSettings, default_settings, parse_color_stat };

import React from "react";
import { RAMPS } from "./ramps.js";
import { FunctionSelector, FunctionColorStat, FilterSelector } from "./function.js";

const setting_name_style = {
    fontWeight: "bold",
    fontSize: "1.2em",
    marginBottom: "0.125em",
}

const setting_sub_name_style = {
    fontWeight: "bold",
    fontSize: "1em",
    marginBottom: "0.125em",
    color: "#444",
}

function default_settings() {
    return {
        geography_kind: undefined,
        filter: {
            enabled: false,
            function: {
                type: "function"
            },
        },
        color_stat: undefined,
        ramp: {
            type: "linear",
            colormap: {
                type: "none",
            }
        }
    }
}

function parse_color_stat(name_to_index, color_stat) {
    if (color_stat === undefined) {
        return new InvalidColorStat();
    }
    const type = color_stat.type;
    if (type === "single") {
        color_stat = color_stat.value;
        if (color_stat in name_to_index) {
            return new SingleColorStat(name_to_index[color_stat], color_stat);
        }
        return new InvalidColorStat();
    }
    if (type == "function") {
        const variables = color_stat.variables.map(variable => {
            return {
                name: variable.name,
                expr: parse_color_stat(name_to_index, variable.expr),
            }
        });
        return new FunctionColorStat(color_stat.name, variables, color_stat.expression);
    }
    return new InvalidColorStat();
}

class SingleColorStat {
    constructor(index, name) {
        this._index = index;
        this._name = name;
    }

    name() {
        return this._name;
    }

    compute(statistics_for_geography) {
        return statistics_for_geography.stats[this._index];
    }
}

class InvalidColorStat {
    name() {
        return "[Invalid]";
    }

    compute(statistics_for_geography) {
        return 0;
    }
}

// ColorStat = (function() {
//     function name_to_index(name_to_index, name) {
//         return name in name_to_index ? name_to_index[name] : -1;
//     }

//     function compute_statistic(stats_for_geography, name_to_index, color_stat) {

//     }

//     function valid_color_stat(name_to_index, color_stat) {
//         return name_to_index(color_stat) !== -1;
//     }

//     function color_stat_name(name_to_index, color_stat) {
//         const index = name_to_index(color_stat);
//         return index === -1 ? undefined : color_stat;
//     }

//     return {
//         compute_statistic: compute_statistic,
//     }
// })();

function DataListSelector({ overall_name, initial_value, names, onChange, no_neutral, header_style }) {
    const names_full = header_style ? names : ["", ...names]
    const set_initial = names_full.includes(initial_value);
    return (
        <div>
            <div>
                <div style={header_style || setting_name_style}>
                    {overall_name}
                </div>
                <select
                    onChange={e => onChange(e.target.value)}
                    style={{ width: "100%" }}
                    value={set_initial ? initial_value : ""}
                >
                    {
                        names_full.map((name, i) => (
                            <option key={i} value={name}>{name}</option>
                        ))
                    }
                </select>
                <div style={{ marginBottom: "0.25em" }} />
            </div>
        </div>
    );
}

class RampColormapSelector extends React.Component {
    // dropdown selector for either a custom ramp or a ramp from a list of presets
    // if custom ramp, then add a text box for the ramp

    constructor(props) {
        super(props);
    }

    get_colormap() {
        return this.props.get_ramp().colormap;
    }

    set_colormap(colormap) {
        this.props.set_ramp({
            ...this.props.get_ramp(),
            colormap: colormap,
        });
    }

    set_selected(name) {
        const colormap = this.get_colormap();
        if (name === "Custom") {
            colormap.type = "custom";
        } else {
            colormap.type = "preset";
            colormap.name = name;
        }
        this.set_colormap(colormap);
    }

    set_custom_colormap(custom_colormap) {
        this.set_colormap({
            ...this.get_colormap(),
            custom_colormap: custom_colormap,
        });
    }

    render() {
        const self = this;
        const options = [
            "",
            "Custom",
            ...Object.keys(RAMPS),
        ];
        return (
            <div>
                <div style={setting_sub_name_style}>
                    {this.props.name}
                </div>
                <select
                    onChange={e =>
                        self.set_selected(e.target.value)
                    }
                    style={{ width: "100%" }}
                    value={
                        this.get_colormap().type === "none" ?
                            "" :
                            this.get_colormap().type === "preset" ?
                                this.get_colormap().name : "Custom"
                    }
                >
                    {
                        options.map((name, i) => (
                            <option key={i} value={name}>{name}</option>
                        ))
                    }
                </select>
                {
                    this.get_colormap().type == "custom" ? <span>
                        <input
                            type="text"
                            style={{ width: "100%" }}
                            placeholder='Custom map, e.g., [[0, "#ff0000"], [1, "#0000ff"]]'
                            value={this.props.get_ramp().colormap.custom_colormap}
                            onChange={e =>
                                self.set_custom_colormap(e.target.value)
                            }
                        />
                    </span> : <div></div>
                }
            </div>
        );
    }
}

function ConstantParametersSelector({ get_ramp, set_ramp }) {
    const ramp = get_ramp();
    return (
        <div style={{ display: "flex" }}>
            <div style={setting_sub_name_style}>
                Lower Bound:
            </div>
            <input
                type="number"
                style={{ width: "5em" }}
                value={ramp.lower_bound}
                onChange={e => set_ramp({
                    ...ramp,
                    lower_bound: e.target.value,
                })}
            />
            <div style={{ width: "0.5em" }} />
            <div style={setting_sub_name_style}>
                Upper Bound:
            </div>
            <input
                type="number"
                style={{ width: "5em" }}
                value={ramp.upper_bound}
                onChange={e => set_ramp({
                    ...ramp,
                    upper_bound: e.target.value,
                })}
            />
        </div>
    );
}



class RampSelector extends React.Component {
    render() {
        return (
            <div>
                <div style={setting_name_style}>
                    Ramp:
                </div>
                <RampColormapSelector
                    name="Colormap:"
                    get_ramp={this.props.get_ramp}
                    set_ramp={this.props.set_ramp}
                />
                <DataListSelector
                    overall_name="Ramp Type:"
                    names={["linear", "constant", "geometric"]}
                    no_neutral={true}
                    header_style={setting_sub_name_style}
                    initial_value={this.props.get_ramp().type}
                    onChange={name => this.props.set_ramp({
                        ...this.props.get_ramp(),
                        type: name,
                    })}
                />
                {
                    this.props.get_ramp().type === "constant" ? <ConstantParametersSelector
                        get_ramp={this.props.get_ramp}
                        set_ramp={this.props.set_ramp}
                    /> : <div></div>
                }
                <div style={{ display: "flex" }}>
                    <div style={setting_sub_name_style}>
                        Reversed:
                    </div>
                    <input
                        type="checkbox"
                        checked={this.props.get_ramp().reversed || false}
                        onChange={e => this.props.set_ramp({
                            ...this.props.get_ramp(),
                            reversed: e.target.checked,
                        })}
                    />
                </div>
            </div>
        )
    }
}

class MapperSettings extends React.Component {


    render() {
        const self = this;
        console.log("rendering MapperSettings")
        console.log("Setting", this.props.get_map_settings())
        return (
            <div>
                <DataListSelector
                    overall_name="Geography Kind:"
                    names={
                        this.props.valid_geographies
                    }
                    initial_value={this.props.get_map_settings().geography_kind}
                    onChange={
                        name => this.props.set_map_settings({
                            ...this.props.get_map_settings(),
                            geography_kind: name
                        })
                    }
                />
                <div style={setting_name_style}>Filter</div>
                <FilterSelector
                    get_filter={() => this.props.get_map_settings().filter}
                    set_filter={filter => this.props.set_map_settings({
                        ...this.props.get_map_settings(),
                        filter: filter,
                    })}
                    names={this.props.names}
                />
                <DataListSelector
                    overall_name="Statistic for Color:"
                    names={["Function", ...this.props.names]}
                    initial_value={this.props.get_map_settings().color_stat?.value}
                    onChange={name =>
                        self.props.set_map_settings({
                            ...self.props.get_map_settings(),
                            color_stat: name != "Function" ? {
                                ...self.props.get_map_settings().color_stat,
                                type: "single",
                                value: name,
                            } : {
                                ...self.props.get_map_settings().color_stat,
                                type: "function",
                                value: "Function",
                                variables: [],
                                expression: "",
                                name: "",
                            }
                        })
                    }
                />
                {
                    this.props.get_map_settings().color_stat?.type == "function" ?
                        <FunctionSelector
                            get_function={() => this.props.get_map_settings().color_stat}
                            set_function={f => this.props.set_map_settings({
                                ...this.props.get_map_settings(),
                                color_stat: f,
                            })}
                            names={this.props.names}
                        />
                        :
                        <div></div>
                }
                <RampSelector
                    get_ramp={() => this.props.get_map_settings().ramp}
                    set_ramp={ramp => this.props.set_map_settings({
                        ...this.props.get_map_settings(),
                        ramp: ramp,
                    })}
                />
            </div>
        )
    }
}