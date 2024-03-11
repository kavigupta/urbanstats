export { FilterSelector, FunctionSelector, FunctionColorStat };

import React from "react";

import { Expression, Parser, Value } from 'expr-eval';
import { DataListSelector } from "./DataListSelector.js";
import { CheckboxSetting } from "../components/sidebar.js";
import { Regression } from "./regression";
import { ColorStat, ColorStatDescriptor, RegressionDescriptor, StatisticsForGeography } from "./settings";

interface Variable { 
    name: string
    expr: ColorStat
}

class FunctionColorStat implements ColorStat {
    constructor(private readonly _name: string | undefined, private readonly _variables: Variable[], private readonly _regressions: Regression[], private readonly _expr: string) {
    }
    name() {
        return this._name || "[Unnamed function]";
    }

    compute(statistics_for_geography: StatisticsForGeography, vars: Record<string, number[]>) {
        let variables = { ...vars };
        for (const variable of this._variables) {
            variables[variable.name] = variable.expr.compute(statistics_for_geography);
        }
        if (this._expr === "") {
            return statistics_for_geography.map(() => 0);
        }
        for (const regression of this._regressions) {
            const out = regression.compute(statistics_for_geography, variables);
            variables = { ...variables, ...out };
        }
        return statistics_for_geography.map((_, i) => {
            const expr = Parser.parse(this._expr);
            const vars: Value = {};
            for (const key in variables) {
                vars[key] = variables[key][i];
            }
            return expr.evaluate(vars);
        });
    }
}

const operator_style: React.CSSProperties = { width: "2em", minWidth: "2em", textAlign: "center" };

function VariableNameSelector({ variable_name, set_variable_name, placeholder }: { variable_name: string, set_variable_name: (newValue: string) => void, placeholder: string }) {
    // freeform input for variable name
    return <input
        type="text"
        style={{ width: "100%" }}
        placeholder={`e.g., "${placeholder}"`}
        value={variable_name}
        onChange={e => set_variable_name(e.target.value)}
    />;
}

function RegressionSelector(props: { regression: RegressionDescriptor, set_regression: (newValue: RegressionDescriptor) => void, names: string[] }) {
        // Create several rows organized as
        // [stat selector] = [coefficient textbox] * [stat selector]
        //                 + [coefficient textbox] * [stat selector]
        //                 + [coefficient textbox] * [stat selector]
        //                 + [coefficient textbox] (intercept)
        //                 + [coefficient textbox] (residue)

        const set_coefficient_var = (i: number, value: string) => {
            const coefficients = props.regression.var_coefficients;
            props.set_regression({
                ...props.regression,
                var_coefficients: coefficients.map((c, j) => i === j ? value : c),
            });
        }
        const set_intercept_var = (value: string) => {
            props.set_regression({
                ...props.regression,
                var_intercept: value,
            });
        }
        const set_residue_var = (value: string) => {
            props.set_regression({
                ...props.regression,
                var_residue: value,
            });
        }
        const set_dependent_expr = (i: number, value: ColorStatDescriptor) => {
            console.log("set coefficient expr", i, value)
            const dependents = props.regression.dependents;
            props.set_regression({
                ...props.regression,
                dependents: dependents.map((c, j) => i == j ? value : c),
            });
        }

        const remove_dependent_expr = (i: number) => {
            const var_coefficients = props.regression.var_coefficients;
            const dependents = props.regression.dependents;
            props.set_regression({
                ...props.regression,
                var_coefficients: var_coefficients.filter((_, j) => i != j),
                dependents: dependents.filter((_, j) => i != j),
            });
        }

        const rhs_params: { variable_name: string, set_variable_name: (newValue: string) => void, name: string, dependent?: ColorStatDescriptor, set_dependent?: (newValue: ColorStatDescriptor) => void, descriptor?: string }[] = props.regression.dependents.map((dependent, i) => {
            return {
                variable_name: props.regression.var_coefficients[i],
                set_variable_name: (value: string) => set_coefficient_var(i, value),
                name: `m_${i + 1}`,
                dependent: props.regression.dependents[i],
                set_dependent: (value: ColorStatDescriptor) => set_dependent_expr(i, value),
            }
        })

        rhs_params.push({
            variable_name: props.regression.var_intercept,
            set_variable_name: value => set_intercept_var(value),
            name: `b`,
            descriptor: `[intercept]`,
        })
        rhs_params.push({
            variable_name: props.regression.var_residue,
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
                        variable_name={param.variable_name}
                        set_variable_name={param.set_variable_name}
                        placeholder={param.name}
                    />
                </div>
                <div style={operator_style}>
                    {param.dependent === undefined ? "" : <span>&times;</span>}
                </div>
                {
                    param.dependent === undefined ? undefined :
                        <>
                            <StatisticSelector
                                get_statistic={param.dependent}
                                set_statistic={param.set_dependent}
                                names={props.names}
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

export function StatisticSelector({ statistic, set_statistic, names, overall_name, simple }: { statistic: ColorStatDescriptor, set_statistic: (newValue: ColorStatDescriptor) => void, names: string[], overall_name: string, simple: boolean }) {
    return <div style={{ width: "100%" }}>
        <DataListSelector
            overall_name={overall_name}
            names={["Function", ...names]}
            initial_value={statistic.value}
            onChange={name => set_statistic(name != "Function" ? {
                ...statistic,
                type: "single",
                value: name,
            } : {
                ...statistic,
                type: "function",
                value: "Function",
                variables: [],
                expression: "",
                name: "",
            }
            )} />
        {statistic.type == "function" ?
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
