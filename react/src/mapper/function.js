export { FilterSelector, FunctionSelector, FunctionColorStat };

import React from "react";

import { Parser } from 'expr-eval';
import { DataListSelector } from "./DataListSelector.js";
import { CheckboxSetting } from "../components/sidebar";

class FunctionColorStat {
    constructor(name, variables, regressions, expr) {
        this._name = name;
        this._variables = variables;
        this._regressions = regressions;
        this._expr = expr;
    }
    name() {
        return this._name || "[Unnamed function]";
    }

    compute(statistics_for_geography, vars) {
        var variables = { ...vars };
        for (const variable of this._variables) {
            variables[variable.name] = variable.expr.compute(statistics_for_geography);
        }
        if (this._expr === "") {
            return statistics_for_geography.map(statistics => 0);
        }
        for (const regression of this._regressions) {
            const out = regression.compute(statistics_for_geography, variables);
            variables = { ...variables, ...out };
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

const operator_style = { width: "2em", minWidth: "2em", textAlign: "center" };

function VariableNameSelector({ get_variable_name, set_variable_name, placeholder }) {
    // freeform input for variable name
    return <input
        type="text"
        style={{ width: "100%" }}
        placeholder={`e.g., "${placeholder}"`}
        value={get_variable_name()}
        onChange={e => set_variable_name(e.target.value)}
    />;
}

class RegressionSelector extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        // Create several rows organized as
        // [stat selector] = [coefficient textbox] * [stat selector]
        //                 + [coefficient textbox] * [stat selector]
        //                 + [coefficient textbox] * [stat selector]
        //                 + [coefficient textbox] (intercept)
        //                 + [coefficient textbox] (residue)

        const self = this;
        function set_coefficient_var(i, value) {
            const coefficients = self.props.get_regression().var_coefficients;
            self.props.set_regression({
                ...self.props.get_regression(),
                var_coefficients: coefficients.map((c, j) => i == j ? value : c),
            });
        }
        function set_intercept_var(value) {
            self.props.set_regression({
                ...self.props.get_regression(),
                var_intercept: value,
            });
        }
        function set_residue_var(value) {
            self.props.set_regression({
                ...self.props.get_regression(),
                var_residue: value,
            });
        }
        function set_dependent_expr(i, value) {
            console.log("set coefficient expr", i, value)
            const dependents = self.props.get_regression().dependents;
            self.props.set_regression({
                ...self.props.get_regression(),
                dependents: dependents.map((c, j) => i == j ? value : c),
            });
        }

        function remove_dependent_expr(i) {
            const var_coefficients = self.props.get_regression().var_coefficients;
            const dependents = self.props.get_regression().dependents;
            self.props.set_regression({
                ...self.props.get_regression(),
                var_coefficients: var_coefficients.filter((_, j) => i != j),
                dependents: dependents.filter((_, j) => i != j),
            });
        }

        const rhs_params = this.props.get_regression().dependents.map((dependent, i) => {
            return {
                get_variable_name: () => self.props.get_regression().var_coefficients[i],
                set_variable_name: value => set_coefficient_var(i, value),
                name: `m_${i + 1}`,
                get_dependent: () => self.props.get_regression().dependents[i],
                set_dependent: value => set_dependent_expr(i, value),
            }
        })

        rhs_params.push({
            get_variable_name: () => self.props.get_regression().var_intercept,
            set_variable_name: value => set_intercept_var(value),
            name: `b`,
            descriptor: `[intercept]`,
        })
        rhs_params.push({
            get_variable_name: () => self.props.get_regression().var_residue,
            set_variable_name: value => set_residue_var(value),
            name: `e`,
            descriptor: `[residue]`,
        })

        const dependents = rhs_params.map((param, i) => (
            <div key={i} style={{ display: "flex" }}>
                {/* Text field!!! free enttry for variable entry */}
                <div style={operator_style}>
                    {i == 0 ? "=" : "+"}
                </div>
                <div style={{ width: "20%" }}>
                    <VariableNameSelector
                        get_variable_name={param.get_variable_name}
                        set_variable_name={param.set_variable_name}
                        placeholder={param.name}
                    />
                </div>
                <div style={operator_style}>
                    {param.get_dependent === undefined ? "" : <span>&times;</span>}
                </div>
                {
                    param.get_dependent === undefined ? undefined :
                        <>
                            <StatisticSelector
                                get_statistic={param.get_dependent}
                                set_statistic={param.set_dependent}
                                names={self.props.names}
                                simple={true}
                            />
                            <button onClick={() => remove_dependent_expr(i)}>
                                -
                            </button>
                        </>
                }
                {
                    param.descriptor === undefined ? undefined :
                        <div>
                            {param.descriptor}
                        </div>
                }
            </div>
        ));

        const rhs_stack = <div style={{ display: "flex", flexDirection: "column" }}>
            {dependents}
            {/*Add a dependent button */}
            <div style={{ width: "100%" }}>
                <button
                    onClick={() => self.props.set_regression({
                        ...self.props.get_regression(),
                        dependents: [...self.props.get_regression().dependents, undefined],
                        var_coefficients: [...self.props.get_regression().var_coefficients, ""],
                    })}
                >
                    Add Dependent
                </button>
            </div>
        </div>;

        const lhs = <StatisticSelector
            get_statistic={() => self.props.get_regression().independent}
            set_statistic={stat => self.props.set_regression({
                ...self.props.get_regression(),
                independent: stat,
            })}
            names={self.props.names}
            simple={true}
        />;

        const main = <div style={{ display: "flex" }}>
            <div style={{ width: "30%" }}>
                {lhs}
            </div>
            <div style={{ width: "70%" }}>
                {rhs_stack}
                <CheckboxSetting
                    name="Weighted by Population"
                    setting_key="weight_by_population"
                    settings={self.props.get_regression()}
                    set_setting={
                        (key, value) => self.props.set_regression({
                            ...self.props.get_regression(),
                            [key]: value,
                        })
                    }
                />
            </div>
        </div>;

        return <div style={{ display: "flex", alignItems: "stretch" }}>
            <div style={{ width: "97%" }}>
                {main}
            </div>
            <div style={{ width: "3%" }}>
                <button style={{ width: "100%", height: "100%" }} onClick={() => self.props.delete_regression()}>
                    -
                </button>
            </div>
        </div>;
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
        const expression = <input
            type="text"
            style={{ width: "100%" }}
            placeholder={self.props.placeholder || 'Expression, e.g., "a + b"'}
            value={func.expression}
            onChange={e => self.props.set_function({
                ...func,
                expression: e.target.value,
            })}
        />;

        if (this.props.simple) {
            return expression;
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
                <RegressionsSelector
                    get_regressions={() => func.regressions}
                    set_regressions={regressions => self.props.set_function({
                        ...func,
                        regressions: regressions,
                    })}
                    names={self.props.names}
                />
                <div style={{ marginBottom: "0.25em" }} />
                {expression}
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

function RegressionsSelector({ get_regressions, set_regressions, names }) {
    const gr = () => get_regressions() || [];

    return <>
        {
            gr().map((regression, i) => (
                <RegressionSelector
                    key={i}
                    get_regression={() => regression}
                    set_regression={r => {
                        console.log("Setting regression", i, "to", r);
                        set_regressions(gr().map((r2, j) => i == j ? r : r2));
                    }}
                    delete_regression={() => set_regressions(gr().filter((r2, j) => i != j))}
                    names={names}
                />
            ))
        }
        {/*Add a regression button */}
        <div style={{ width: "100%" }}>
            <button
                onClick={() => set_regressions([...gr(), {
                    independent: undefined, dependents: [undefined],
                    var_residue: "", var_intercept: "", var_coefficients: [""],
                    weight_by_population: false,
                }])}
            >
                Add Regression
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

export function StatisticSelector({ get_statistic, set_statistic, names, overall_name, simple }) {
    return <div style={{ width: "100%" }}>
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
                names={names}
                simple={simple}
                />
            :
            <div></div>}
    </div>;
}
