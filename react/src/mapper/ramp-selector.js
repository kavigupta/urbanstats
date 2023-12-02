export { RampColormapSelector };

import React from "react";
import { RAMPS, parse_custom_colormap } from "./ramps.js";

import { setting_name_style, setting_sub_name_style } from "./style.js";
import { interpolate_color } from "../utils/color.js";

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
                        <CustomColormapSelector
                            get_colormap={() => this.get_colormap().custom_colormap}
                            set_colormap={custom_colormap => this.set_custom_colormap(custom_colormap)}
                        />
                    </span> : <div></div>
                }
            </div>
        );
    }
}

function SinglePointSelector({ value, color, get_cell, set_cell, remove_cell }) {
    return <div
        style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            alignContent: "center",
            margin: "0.25em",
        }}
    >
        <input
            type="color"
            value={color}
            onChange={e =>
                set_cell([
                    get_cell()[0],
                    e.target.value,
                ])
            }
        />
        <input
            type="number"
            value={value}
            style={{ width: "4em" }}
            onChange={e =>
                set_cell([
                    parseFloat(e.target.value),
                    get_cell()[1],
                ])
            }
        />
        <button
            onClick={() => remove_cell()}
        >
            -
        </button>
    </div>
}

class CustomColormapSelector extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        // flexbox containing several color tabs
        // each color tab is a vertical flexbox containing a color picker and a text box
        // at the end there is a plus button to add a new color tab
        // each color tab has a minus button to remove itself
        const self = this;
        var colormap_text = this.props.get_colormap();
        var colormap = parse_custom_colormap(colormap_text);
        if (colormap !== undefined) {
            colormap = colormap.sort((a, b) => a[0] - b[0]);
            colormap_text = JSON.stringify(colormap);
        } else {
            colormap = [];
        }
        // colormap :: [[number, string]]
        console.log("cmap", colormap);

        function add_cell(at_index) {
            const new_colormap = colormap.slice();
            var value = 0;
            if (at_index == 0) {
                value = colormap[0][0] - 1;
            } else if (at_index == colormap.length) {
                value = colormap[colormap.length - 1][0] + 1;
            } else {
                value = (colormap[at_index - 1][0] + colormap[at_index][0]) / 2;
            }
            const color = interpolate_color(colormap, value);
            new_colormap.splice(at_index, 0, [value, color]);
            self.props.set_colormap(
                JSON.stringify(new_colormap)
            );
        }

        function AddCellButton({ at_index }) {
            return <button
                onClick={() => add_cell(at_index)}
            >
                +
            </button>
        }

        const color_tabs = <div
            style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "flex-start",
                alignItems: "center",
                alignContent: "flex-start",
            }}
        >
            <AddCellButton at_index={0} key={-1} />
            {
                colormap.flatMap(([value, color], i) => [
                    <SinglePointSelector
                        key={2 * i}
                        value={value}
                        color={color}
                        get_cell={() => colormap[i]}
                        set_cell={cell => {
                            const new_colormap = colormap.slice();
                            new_colormap[i] = cell;
                            self.props.set_colormap(
                                JSON.stringify(new_colormap)
                            );
                        }}
                        remove_cell={() => {
                            const new_colormap = colormap.slice();
                            new_colormap.splice(i, 1);
                            self.props.set_colormap(
                                JSON.stringify(new_colormap)
                            );
                        }
                        }
                    />,
                    <AddCellButton key={2 * i + 1} at_index={i + 1} />
                ])
            }

        </div>
        // then an input textbox
        const input_textbox = <input
            type="text"
            style={{ width: "100%" }}
            placeholder='Custom map, e.g., [[0, "#ff0000"], [1, "#0000ff"]]'
            value={colormap_text}
            onChange={e =>
                this.props.set_colormap(e.target.value)
            }
        />
        return (
            <div>
                <div style={setting_sub_name_style}>
                    Custom Colormap
                </div>
                {color_tabs}
                {input_textbox}
            </div>
        )
    }
}