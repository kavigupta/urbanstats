export { FilterSelector, FunctionSelector, FunctionColorStat };

import React from "react";

import { Parser } from 'expr-eval';
import { DataListSelector } from "./DataListSelector.js";

class FunctionColorStat {
    constructor(name, variables, expr) {
        this._name = name;
        this._variables = variables;
        this._expr = expr;
    }
    name() {
        return this._name || "[Unnamed function]";
    }

    compute(statistics_for_geography) {
        const variables = {};
        for (const variable of this._variables) {
            variables[variable.name] = variable.expr.compute(statistics_for_geography);
        }
        if (this._expr === "") {
            return statistics_for_geography.map(statistics => 0);
        }
        return statistics_for_geography.map((_, i) => {
            const expr = Parser.parse(this._expr);
            const vars = {};
            for (const key in variables) {
                vars[key] = variables[key][i];
            }
            return expr.evaluate(vars);
        });
    }
}

class VariableSelector extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const self = this;
        const variable = this.props.get_variable();
        const names_full = ["", ...this.props.names];
        const initial_value = names_full.includes(variable.expr.value) ? variable.expr.value : "";
        return (
            <div style={{ display: "flex" }}>
                {/* Button that deletes this variable */}
                <button onClick={() => self.props.delete_variable()}>
                    -
                </button>
                <div style={{ width: "0.5em" }} />
                <div style={{ width: "50%" }}>
                    <input
                        type="text"
                        style={{ width: "100%" }}
                        placeholder='Name, e.g., "a"'
                        value={variable.name}
                        onChange={e => self.props.set_variable({
                            ...variable,
                            name: e.target.value,
                        })}
                    />
                </div>
                <div style={{ width: "0.5em" }} />
                <select
                    onChange={e =>
                        self.props.set_variable({
                            ...variable,
                            expr: {
                                ...variable.expr,
                                type: "single",
                                value: e.target.value,
                            },
                        })
                    }
                    style={{ width: "100%" }}
                    value={initial_value}
                >
                    {
                        names_full.map((name, i) => (
                            <option key={i} value={name}>{name}</option>
                        ))
                    }
                </select>
            </div>
        );
    }
}

class FunctionSelector extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const self = this;
        const func = this.props.get_function();
        if (func.variables === undefined) {
            func.variables = [];
        }
        return (
            <div style={{ paddingLeft: "1em" }}>
                {
                    this.props.no_name_field ? <div /> : <input
                        type="text"
                        style={{ width: "100%" }}
                        placeholder='Name for this function'
                        value={func.name}
                        onChange={e => self.props.set_function({
                            ...func,
                            name: e.target.value,
                        })}
                    />
                }
                {
                    func.variables.map((variable, i) => (
                        <VariableSelector
                            key={i}
                            get_variable={() => variable}
                            set_variable={v => self.props.set_function({
                                ...func,
                                variables: func.variables.map((v2, j) => i == j ? v : v2),
                            })}
                            delete_variable={() => self.props.set_function({
                                ...func,
                                variables: func.variables.filter((v2, j) => i != j),
                            })}
                            names={self.props.names}
                        />
                    ))
                }
                {/*Add a variable button */}
                <div style={{ width: "100%" }}>
                    <button
                        onClick={() => self.props.set_function({
                            ...func,
                            variables: [...func.variables, {
                                name: "",
                                expr: "",
                            }]
                        })}
                    >
                        Add Variable
                    </button>
                </div>
                <div style={{ marginBottom: "0.25em" }} />
                <input
                    type="text"
                    style={{ width: "100%" }}
                    placeholder={self.props.placeholder || 'Expression, e.g., "a + b"'}
                    value={func.expression}
                    onChange={e => self.props.set_function({
                        ...func,
                        expression: e.target.value,
                    })}
                />
            </div>
        );
    }
}

class FilterSelector extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const self = this;
        const filter = this.props.get_filter();
        // like FunctionSelector, but has a checkmark for whether the filter is enabled
        return (
            <div>
                <span>
                    <input
                        type="checkbox"
                        checked={filter.enabled}
                        onChange={e => self.props.set_filter({
                            ...filter,
                            enabled: e.target.checked,
                        })}
                    /> Enable Filter?
                </span>
                {
                    filter.enabled ? <FunctionSelector
                        no_name_field={true}
                        get_function={() => filter.function}
                        set_function={f => self.props.set_filter({
                            ...filter,
                            function: f,
                        })}
                        names={self.props.names}
                        placeholder={'Filter expression, e.g., "(a > 0 and b < 0) or b > 10"'}
                    /> : <div />
                }
            </div>
        );
    }
}

export function StatisticSelector({ get_map_settings, set_map_settings, names }) {
    return <>
        <DataListSelector
            overall_name="Statistic for Color:"
            names={["Function", ...names]}
            initial_value={get_map_settings().color_stat?.value}
            onChange={name => self.props.set_map_settings({
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
            })} />
        {get_map_settings().color_stat?.type == "function" ?
            <FunctionSelector
                get_function={() => get_map_settings().color_stat}
                set_function={f => set_map_settings({
                    ...get_map_settings(),
                    color_stat: f,
                })}
                names={names} />
            :
            <div></div>}
    </>;
}
