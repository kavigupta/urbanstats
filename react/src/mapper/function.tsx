import { Parser, Value } from 'expr-eval'
import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../components/sidebar'

import { DataListSelector } from './DataListSelector'
import { Regression } from './regression'
import { ColorStat, ColorStatDescriptor, FilterSettings, RegressionDescriptor, StatisticsForGeography } from './settings'

interface VariableDescriptor {
    name: string
    expr: ColorStatDescriptor | undefined
}

interface Variable {
    name: string
    expr: ColorStat
}

export class FunctionColorStat implements ColorStat {
    constructor(private readonly _name: string | undefined, private readonly _variables: Variable[], private readonly _regressions: Regression[], private readonly _expr: string) {
    }

    name(): string {
        return this._name ?? '[Unnamed function]'
    }

    compute(statistics_for_geography: StatisticsForGeography, vars: Record<string, number[]>): number[] {
        let variables = { ...vars }
        for (const variable of this._variables) {
            variables[variable.name] = variable.expr.compute(statistics_for_geography)
        }
        if (this._expr === '') {
            return statistics_for_geography.map(() => 0)
        }
        for (const regression of this._regressions) {
            const out = regression.compute(statistics_for_geography, variables)
            variables = { ...variables, ...out }
        }
        return statistics_for_geography.map((_, i) => {
            const expr = Parser.parse(this._expr)
            const statVars: Value = {}
            for (const key of Object.keys(variables)) {
                statVars[key] = variables[key][i]
            }
            return expr.evaluate(statVars) as number
        })
    }
}

const operator_style: React.CSSProperties = { width: '2em', minWidth: '2em', textAlign: 'center' }

function VariableNameSelector({ variable_name, set_variable_name, placeholder }: { variable_name: string, set_variable_name: (newValue: string) => void, placeholder: string }): ReactNode {
    // freeform input for variable name
    return (
        <input
            type="text"
            style={{ width: '100%' }}
            placeholder={`e.g., "${placeholder}"`}
            value={variable_name}
            onChange={(e) => { set_variable_name(e.target.value) }}
        />
    )
}

function RegressionSelector(props: { regression: RegressionDescriptor, set_regression: (newValue: RegressionDescriptor) => void, delete_regression: () => void, names: string[] }): ReactNode {
    // Create several rows organized as
    // [stat selector] = [coefficient textbox] * [stat selector]
    //                 + [coefficient textbox] * [stat selector]
    //                 + [coefficient textbox] * [stat selector]
    //                 + [coefficient textbox] (intercept)
    //                 + [coefficient textbox] (residue)

    const set_coefficient_var = (i: number, value: string): void => {
        const coefficients = props.regression.var_coefficients
        props.set_regression({
            ...props.regression,
            var_coefficients: coefficients.map((c, j) => i === j ? value : c),
        })
    }
    const set_intercept_var = (value: string): void => {
        props.set_regression({
            ...props.regression,
            var_intercept: value,
        })
    }
    const set_residue_var = (value: string): void => {
        props.set_regression({
            ...props.regression,
            var_residue: value,
        })
    }
    const set_dependent_expr = (i: number, value: ColorStatDescriptor): void => {
        const dependents = props.regression.dependents
        props.set_regression({
            ...props.regression,
            dependents: dependents.map((c, j) => i === j ? value : c),
        })
    }

    const remove_dependent_expr = (i: number): void => {
        const var_coefficients = props.regression.var_coefficients
        const dependents = props.regression.dependents
        props.set_regression({
            ...props.regression,
            var_coefficients: var_coefficients.filter((_, j) => i !== j),
            dependents: dependents.filter((_, j) => i !== j),
        })
    }

    const rhs_params: { variable_name: string, set_variable_name: (newValue: string) => void, name: string, dependent?: ColorStatDescriptor, set_dependent: (newValue: ColorStatDescriptor) => void, descriptor?: string }[] = props.regression.dependents.map((dependent, i) => {
        return {
            variable_name: props.regression.var_coefficients[i],
            set_variable_name: (value: string) => { set_coefficient_var(i, value) },
            name: `m_${i + 1}`,
            dependent: props.regression.dependents[i],
            set_dependent: (value: ColorStatDescriptor) => { set_dependent_expr(i, value) },
        }
    })

    rhs_params.push({
        variable_name: props.regression.var_intercept,
        set_variable_name: (value) => { set_intercept_var(value) },
        name: `b`,
        descriptor: `[intercept]`,
        set_dependent: () => { throw new Error('Intercept should not have a dependent') },
    })
    rhs_params.push({
        variable_name: props.regression.var_residue,
        set_variable_name: (value) => { set_residue_var(value) },
        name: `e`,
        descriptor: `[residue]`,
        set_dependent: () => { throw new Error('Residue should not have a dependent') },
    })

    const dependents = rhs_params.map((param, i) => (
        <div key={i} style={{ display: 'flex' }}>
            {/* Text field!!! free enttry for variable entry */}
            <div style={operator_style}>
                {i === 0 ? '=' : '+'}
            </div>
            <div style={{ width: '20%' }}>
                <VariableNameSelector
                    variable_name={param.variable_name}
                    set_variable_name={param.set_variable_name}
                    placeholder={param.name}
                />
            </div>
            <div style={operator_style}>
                {param.dependent === undefined ? '' : <span>&times;</span>}
            </div>
            {
                param.dependent === undefined
                    ? undefined
                    : (
                            <>
                                <StatisticSelector
                                    statistic={param.dependent}
                                    overall_name={undefined}
                                    set_statistic={param.set_dependent}
                                    names={props.names}
                                    simple={true}
                                />
                                <button onClick={() => { remove_dependent_expr(i) }}>
                                    -
                                </button>
                            </>
                        )
            }
            {
                param.descriptor === undefined
                    ? undefined
                    : (
                            <div>
                                {param.descriptor}
                            </div>
                        )
            }
        </div>
    ))

    const rhs_stack = (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dependents}
            {/* Add a dependent button */}
            <div style={{ width: '100%' }}>
                <button
                    onClick={() => {
                        props.set_regression({
                            ...props.regression,
                            dependents: [...props.regression.dependents, undefined],
                            var_coefficients: [...props.regression.var_coefficients, ''],
                        })
                    }}
                >
                    Add Dependent
                </button>
            </div>
        </div>
    )

    const lhs = (
        <StatisticSelector
            statistic={props.regression.independent}
            overall_name={undefined}
            set_statistic={(stat) => {
                props.set_regression({
                    ...props.regression,
                    independent: stat,
                })
            }}
            names={props.names}
            simple={true}
        />
    )

    const main = (
        <div style={{ display: 'flex' }}>
            <div style={{ width: '30%' }}>
                {lhs}
            </div>
            <div style={{ width: '70%' }}>
                {rhs_stack}
                <CheckboxSettingCustom
                    name="Weighted by Population"
                    setting_key="weight_by_population"
                    settings={props.regression}
                    set_setting={
                        (key, value) => {
                            props.set_regression({
                                ...props.regression,
                                [key]: value,
                            })
                        }
                    }
                />
            </div>
        </div>
    )

    return (
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
            <div style={{ width: '97%' }}>
                {main}
            </div>
            <div style={{ width: '3%' }}>
                <button style={{ width: '100%', height: '100%' }} onClick={() => { props.delete_regression() }}>
                    -
                </button>
            </div>
        </div>
    )
}

function VariableSelector(props: { variable: VariableDescriptor, set_variable: (newValue: VariableDescriptor) => void, delete_variable: () => void, names: string[] }): ReactNode {
    const variable = props.variable
    const names_full = ['', ...props.names]
    const initial_value = variable.expr !== undefined && names_full.includes(variable.expr.value) ? variable.expr.value : ''
    return (
        <div style={{ display: 'flex' }}>
            {/* Button that deletes this variable */}
            <button onClick={() => { props.delete_variable() }}>
                -
            </button>
            <div style={{ width: '0.5em' }} />
            <div style={{ width: '50%' }}>
                <input
                    type="text"
                    style={{ width: '100%' }}
                    placeholder='Name, e.g., "a"'
                    value={variable.name}
                    onChange={(e) => {
                        props.set_variable({
                            ...variable,
                            name: e.target.value,
                        })
                    }}
                />
            </div>
            <div style={{ width: '0.5em' }} />
            <select
                onChange={(e) => {
                    props.set_variable({
                        ...variable,
                        expr: {
                            ...variable.expr,
                            type: 'single',
                            value: e.target.value,
                        },
                    })
                }}
                style={{ width: '100%' }}
                value={initial_value}
            >
                {
                    names_full.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                    ))
                }
            </select>
        </div>
    )
}

export function FunctionSelector(props: { function: ColorStatDescriptor, set_function: (newValue: ColorStatDescriptor) => void, names: string[], simple?: boolean, no_name_field?: boolean, placeholder?: string }): ReactNode {
    const func = props.function
    if (func.variables === undefined) {
        func.variables = []
    }
    const expression = (
        <input
            type="text"
            style={{ width: '100%' }}
            placeholder={props.placeholder ?? 'Expression, e.g., "a + b"'}
            value={func.expression}
            onChange={(e) => {
                props.set_function({
                    ...func,
                    expression: e.target.value,
                })
            }}
        />
    )

    if (props.simple) {
        return expression
    }

    return (
        <div style={{ paddingLeft: '1em' }}>
            {
                props.no_name_field
                    ? <div />
                    : (
                            <input
                                type="text"
                                style={{ width: '100%' }}
                                placeholder="Name for this function"
                                value={func.name}
                                onChange={(e) => {
                                    props.set_function({
                                        ...func,
                                        name: e.target.value,
                                    })
                                }}
                            />
                        )
            }
            <VariablesSelector
                get_variables={() => func.variables ?? []}
                set_variables={(variables) => {
                    props.set_function({
                        ...func,
                        variables,
                    })
                }}
                names={props.names}
            />
            <div style={{ marginBottom: '0.25em' }} />
            <RegressionsSelector
                get_regressions={() => func.regressions ?? []}
                set_regressions={(regressions) => {
                    props.set_function({
                        ...func,
                        regressions,
                    })
                }}
                names={props.names}
            />
            <div style={{ marginBottom: '0.25em' }} />
            {expression}
        </div>
    )
}

function VariablesSelector({ get_variables, set_variables, names }: { get_variables: () => VariableDescriptor[], set_variables: (newValue: VariableDescriptor[]) => void, names: string[] },
): ReactNode {
    return (
        <>
            {
                get_variables().map((variable: VariableDescriptor, i: number) => (
                    <VariableSelector
                        key={i}
                        variable={variable}
                        set_variable={(v: VariableDescriptor) => { set_variables(get_variables().map((v2, j) => i === j ? v : v2)) }}
                        delete_variable={() => { set_variables(get_variables().filter((v2, j) => i !== j)) }}
                        names={names}
                    />
                ))
            }
            {/* Add a variable button */}
            <div style={{ width: '100%' }}>
                <button
                    onClick={() => {
                        set_variables([...get_variables(), {
                            name: '',
                            expr: undefined,
                        }])
                    }}
                >
                    Add Variable
                </button>
            </div>
        </>
    )
}

function RegressionsSelector({ get_regressions, set_regressions, names }: { get_regressions: () => RegressionDescriptor[], set_regressions: (newValue: RegressionDescriptor[]) => void, names: string[] }): ReactNode {
    const gr: () => RegressionDescriptor[] = () => get_regressions()

    return (
        <>
            {
                gr().map((regression, i) => (
                    <RegressionSelector
                        key={i}
                        regression={regression}
                        set_regression={(r) => {
                            set_regressions(gr().map((r2, j) => i === j ? r : r2))
                        }}
                        delete_regression={() => { set_regressions(gr().filter((r2, j) => i !== j)) }}
                        names={names}
                    />
                ))
            }
            {/* Add a regression button */}
            <div style={{ width: '100%' }}>
                <button
                    onClick={() => {
                        set_regressions([...gr(), {
                            independent: undefined, dependents: [undefined],
                            var_residue: '', var_intercept: '', var_coefficients: [''],
                            weight_by_population: false,
                        }])
                    }}
                >
                    Add Regression
                </button>
            </div>
        </>
    )
}

export function FilterSelector(props: { filter: FilterSettings, set_filter: (newValue: FilterSettings) => void, names: string[] }): ReactNode {
    const filter = props.filter
    // like FunctionSelector, but has a checkmark for whether the filter is enabled
    return (
        <div>
            <span>
                <input
                    type="checkbox"
                    checked={filter.enabled}
                    onChange={(e) => {
                        props.set_filter({
                            ...filter,
                            enabled: e.target.checked,
                        })
                    }}
                />
                {' '}
                Enable Filter?
            </span>
            {
                filter.enabled
                    ? (
                            <FunctionSelector
                                no_name_field={true}
                                function={filter.function}
                                set_function={(f) => {
                                    props.set_filter({
                                        ...filter,
                                        function: f,
                                    })
                                }}
                                names={props.names}
                                placeholder={'Filter expression, e.g., "(a > 0 and b < 0) or b > 10"'}
                            />
                        )
                    : <div />
            }
        </div>
    )
}
export function StatisticSelector({ statistic, set_statistic, names, overall_name, simple }: { statistic: ColorStatDescriptor | undefined, set_statistic: (newValue: ColorStatDescriptor) => void, names: string[], overall_name: string | undefined, simple: boolean }): ReactNode {
    return (
        <div style={{ width: '100%' }}>
            <DataListSelector
                overall_name={overall_name}
                names={['Function', ...names]}
                initial_value={statistic?.value}
                onChange={(name) => {
                    set_statistic(name !== 'Function'
                        ? {
                                ...statistic,
                                type: 'single',
                                value: name,
                            }
                        : {
                                ...statistic,
                                type: 'function',
                                value: 'Function',
                                variables: [],
                                expression: '',
                                name: '',
                            },
                    )
                }}
            />
            {statistic?.type === 'function'
                ? (
                        <FunctionSelector
                            function={statistic}
                            set_function={set_statistic}
                            names={names}
                            simple={simple}
                        />
                    )
                : <div></div>}
        </div>
    )
}
