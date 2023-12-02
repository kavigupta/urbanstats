import React from "react";
import { setting_name_style } from "./style.js";

export function DataListSelector({ overall_name, initial_value, names, onChange, no_neutral, header_style }) {
    const names_full = no_neutral ? names : ["", ...names];
    const set_initial = names_full.includes(initial_value);
    const actual_selector = <select
        onChange={e => onChange(e.target.value)}
        style={{ width: "100%" }}
        value={set_initial ? initial_value : ""}
    >
        {names_full.map((name, i) => (
            <option key={i} value={name}>{name}</option>
        ))}
    </select>;
    if (overall_name === undefined) return actual_selector;
    return (
        <div>
            <div>
                <div style={header_style || setting_name_style}>
                    {overall_name}
                </div>
                {actual_selector}
                <div style={{ marginBottom: "0.25em" }} />
            </div>
        </div>
    );
}
