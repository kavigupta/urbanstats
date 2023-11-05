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
                <VariablesSelector
                    get_variables={() => func.variables}
                    set_variables={variables => self.props.set_function({
                        ...func,
                        variables: variables,
                    })}
                    names={self.props.names}
                />
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

function VariablesSelector({ get_variables, set_variables, names }) {
    return <>
        {
            get_variables().map((variable, i) => (
                <VariableSelector
                    key={i}
                    get_variable={() => variable}
                    set_variable={v => set_variables(get_variables().map((v2, j) => i == j ? v : v2))}
                    delete_variable={() => set_variables(get_variables().filter((v2, j) => i != j))}
                    names={names}
                />
            ))
        }
        {/*Add a variable button */}
        <div style={{ width: "100%" }}>
            <button
                onClick={() => set_variables([...get_variables(), {
                    name: "",
                    expr: "",
                }])}
            >
                Add Variable
            </button>
        </div>
    </>
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

export function StatisticSelector({ get_statistic, set_statistic, names, overall_name }) {
    return <>
        <DataListSelector
            overall_name={overall_name}
            names={["Function", ...names]}
            initial_value={get_statistic()?.value}
            onChange={name => set_statistic(name != "Function" ? {
                ...get_statistic(),
                type: "single",
                value: name,
            } : {
                ...get_statistic(),
                type: "function",
                value: "Function",
                variables: [],
                expression: "",
                name: "",
            }
            )} />
        {get_statistic()?.type == "function" ?
            <FunctionSelector
                get_function={() => get_statistic()}
                set_function={f => set_statistic(f)}
                names={names} />
            :
            <div></div>}
    </>;
}
