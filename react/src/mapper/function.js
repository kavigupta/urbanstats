export { FunctionSelector, FunctionColorStat };

import React from "react";

import { Parser } from 'expr-eval';

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
            return 0;
        }
        const expr = Parser.parse(this._expr);
        return expr.evaluate(variables);
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
        return (
            <div>
                <input
                    type="text"
                    style={{ width: "100%" }}
                    placeholder='Name for this function'
                    value={func.name}
                    onChange={e => self.props.set_function({
                        ...func,
                        name: e.target.value,
                    })}
                />
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
                    placeholder='Expression, e.g., "a + b"'
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

