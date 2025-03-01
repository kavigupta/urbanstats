import { Parser, Value } from 'expr-eval'
import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../components/sidebar'
import { useColors } from '../page_template/colors'
import { StatName } from '../page_template/statistic-tree'

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

    compute(statistics_for_geography: StatisticsForGeography, vars?: Record<string, number[]>): number[] {
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

const operatorStyle: React.CSSProperties = { width: '2em', minWidth: '2em', textAlign: 'center' }

function VariableNameSelector({ variableName, setVariableName, placeholder }: { variableName: string, setVariableName: (newValue: string) => void, placeholder: string }): ReactNode {
    const colors = useColors()
    // freeform input for variable name
    return (
        <input
            type="text"
            style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain }}
            placeholder={`e.g., "${placeholder}"`}
            value={variableName}
            onChange={(e) => { setVariableName(e.target.value) }}
        />
    )
}

function RegressionSelector(props: { regression: RegressionDescriptor, setRegression: (newValue: RegressionDescriptor) => void, deleteRegression: () => void, names: readonly StatName[] }): ReactNode {
    // Create several rows organized as
    // [stat selector] = [coefficient textbox] * [stat selector]
    //                 + [coefficient textbox] * [stat selector]
    //                 + [coefficient textbox] * [stat selector]
    //                 + [coefficient textbox] (intercept)
    //                 + [coefficient textbox] (residue)

    const setCoefficientVar = (i: number, value: string): void => {
        const coefficients = props.regression.var_coefficients
        props.setRegression({
            ...props.regression,
            var_coefficients: coefficients.map((c, j) => i === j ? value : c),
        })
    }
    const setInterceptVar = (value: string): void => {
        props.setRegression({
            ...props.regression,
            var_intercept: value,
        })
    }
    const setResidueVar = (value: string): void => {
        props.setRegression({
            ...props.regression,
            var_residue: value,
        })
    }
    const setDependentExpr = (i: number, value: ColorStatDescriptor): void => {
        const dependents = props.regression.dependents
        props.setRegression({
            ...props.regression,
            dependents: dependents.map((c, j) => i === j ? value : c),
        })
    }

    const removeDependentExpr = (i: number): void => {
        const varCoefficients = props.regression.var_coefficients
        const dependents = props.regression.dependents
        props.setRegression({
            ...props.regression,
            var_coefficients: varCoefficients.filter((_, j) => i !== j),
            dependents: dependents.filter((_, j) => i !== j),
        })
    }

    const rhsParams: { variableName: string, setVariableName: (newValue: string) => void, name: string, dependent: ColorStatDescriptor | undefined | null, setDependent: (newValue: ColorStatDescriptor) => void, descriptor?: string }[] = props.regression.dependents.map((dependent, i) => {
        return {
            variableName: props.regression.var_coefficients[i],
            setVariableName: (value: string) => { setCoefficientVar(i, value) },
            name: `m_${i + 1}`,
            dependent: props.regression.dependents[i],
            setDependent: (value: ColorStatDescriptor) => { setDependentExpr(i, value) },
        }
    })

    rhsParams.push({
        variableName: props.regression.var_intercept,
        setVariableName: (value) => { setInterceptVar(value) },
        name: `b`,
        descriptor: `[intercept]`,
        dependent: undefined,
        setDependent: () => { throw new Error('Intercept should not have a dependent') },
    })
    rhsParams.push({
        variableName: props.regression.var_residue,
        setVariableName: (value) => { setResidueVar(value) },
        name: `e`,
        descriptor: `[residue]`,
        dependent: undefined,
        setDependent: () => { throw new Error('Residue should not have a dependent') },
    })

    const dependents = rhsParams.map((param, i) => (
        <div key={i} style={{ display: 'flex' }}>
            {/* Text field!!! free enttry for variable entry */}
            <div style={operatorStyle}>
                {i === 0 ? '=' : '+'}
            </div>
            <div style={{ width: '20%' }}>
                <VariableNameSelector
                    variableName={param.variableName}
                    setVariableName={param.setVariableName}
                    placeholder={param.name}
                />
            </div>
            <div style={operatorStyle}>
                <span>&times;</span>
            </div>
            <StatisticSelector
                statistic={param.dependent ?? undefined}
                overallName={undefined}
                setStatistic={param.setDependent}
                names={props.names}
                simple={true}
            />
            <button onClick={() => { removeDependentExpr(i) }}>
                -
            </button>
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

    const rhsStack = (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dependents}
            {/* Add a dependent button */}
            <div style={{ width: '100%' }}>
                <button
                    onClick={() => {
                        props.setRegression({
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
            statistic={props.regression.independent ?? undefined}
            overallName={undefined}
            setStatistic={(stat) => {
                props.setRegression({
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
                {rhsStack}
                <CheckboxSettingCustom
                    name="Weighted by Population"
                    checked={props.regression.weight_by_population}
                    onChange={(value) => {
                        props.setRegression({
                            ...props.regression,
                            weight_by_population: value,
                        })
                    }}
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
                <button style={{ width: '100%', height: '100%' }} onClick={() => { props.deleteRegression() }}>
                    -
                </button>
            </div>
        </div>
    )
}

function VariableSelector(props: { variable: VariableDescriptor, setVariable: (newValue: VariableDescriptor) => void, deleteVariable: () => void, names: readonly StatName[] }): ReactNode {
    const colors = useColors()
    const variable = props.variable
    const namesFull = ['', ...props.names]
    const initialValue = variable.expr !== undefined && namesFull.includes(variable.expr.value) ? variable.expr.value : ''
    return (
        <div style={{ display: 'flex' }}>
            {/* Button that deletes this variable */}
            <button onClick={() => { props.deleteVariable() }}>
                -
            </button>
            <div style={{ width: '0.5em' }} />
            <div style={{ width: '50%' }}>
                <input
                    type="text"
                    style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain }}
                    placeholder='Name, e.g., "a"'
                    value={variable.name}
                    onChange={(e) => {
                        props.setVariable({
                            ...variable,
                            name: e.target.value,
                        })
                    }}
                />
            </div>
            <div style={{ width: '0.5em' }} />
            <select
                onChange={(e) => {
                    props.setVariable({
                        ...variable,
                        expr: {
                            ...variable.expr,
                            type: 'single',
                            value: e.target.value,
                        },
                    })
                }}
                style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain }}
                value={initialValue}
            >
                {
                    namesFull.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                    ))
                }
            </select>
        </div>
    )
}

export function FunctionSelector(props: { function: ColorStatDescriptor, setFunction: (newValue: ColorStatDescriptor) => void, names: readonly StatName[], simple?: boolean, noNameField?: boolean, placeholder?: string }): ReactNode {
    const colors = useColors()
    const func = props.function
    if (func.variables === undefined) {
        func.variables = []
    }
    const expression = (
        <input
            type="text"
            style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain }}
            placeholder={props.placeholder ?? 'Expression, e.g., "a + b"'}
            value={func.expression}
            onChange={(e) => {
                props.setFunction({
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
                props.noNameField
                    ? <div />
                    : (
                            <input
                                type="text"
                                style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain }}
                                placeholder="Name for this function"
                                value={func.name}
                                onChange={(e) => {
                                    props.setFunction({
                                        ...func,
                                        name: e.target.value,
                                    })
                                }}
                            />
                        )
            }
            <VariablesSelector
                getVariables={() => func.variables ?? []}
                setVariables={(variables) => {
                    props.setFunction({
                        ...func,
                        variables,
                    })
                }}
                names={props.names}
            />
            <div style={{ marginBottom: '0.25em' }} />
            <RegressionsSelector
                getRegressions={() => func.regressions ?? []}
                setRegressions={(regressions) => {
                    props.setFunction({
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

function VariablesSelector({ getVariables: getVariables, setVariables: setVariables, names }: { getVariables: () => VariableDescriptor[], setVariables: (newValue: VariableDescriptor[]) => void, names: readonly StatName[] },
): ReactNode {
    return (
        <>
            {
                getVariables().map((variable: VariableDescriptor, i: number) => (
                    <VariableSelector
                        key={i}
                        variable={variable}
                        setVariable={(v: VariableDescriptor) => { setVariables(getVariables().map((v2, j) => i === j ? v : v2)) }}
                        deleteVariable={() => { setVariables(getVariables().filter((v2, j) => i !== j)) }}
                        names={names}
                    />
                ))
            }
            {/* Add a variable button */}
            <div style={{ width: '100%' }}>
                <button
                    onClick={() => {
                        setVariables([...getVariables(), {
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

function RegressionsSelector({ getRegressions, setRegressions, names }: { getRegressions: () => RegressionDescriptor[], setRegressions: (newValue: RegressionDescriptor[]) => void, names: readonly StatName[] }): ReactNode {
    const gr: () => RegressionDescriptor[] = () => getRegressions()

    return (
        <>
            {
                gr().map((regression, i) => (
                    <RegressionSelector
                        key={i}
                        regression={regression}
                        setRegression={(r) => {
                            setRegressions(gr().map((r2, j) => i === j ? r : r2))
                        }}
                        deleteRegression={() => { setRegressions(gr().filter((r2, j) => i !== j)) }}
                        names={names}
                    />
                ))
            }
            {/* Add a regression button */}
            <div style={{ width: '100%' }}>
                <button
                    onClick={() => {
                        setRegressions([...gr(), {
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

export function FilterSelector(props: { filter: FilterSettings, setFilter: (newValue: FilterSettings) => void, names: readonly StatName[] }): ReactNode {
    const colors = useColors()
    const filter = props.filter
    // like FunctionSelector, but has a checkmark for whether the filter is enabled
    return (
        <div>
            <span>
                <input
                    type="checkbox"
                    checked={filter.enabled}
                    onChange={(e) => {
                        props.setFilter({
                            ...filter,
                            enabled: e.target.checked,
                        })
                    }}
                    style={{ backgroundColor: colors.background, color: colors.textMain }}
                />
                {' '}
                Enable Filter?
            </span>
            {
                filter.enabled
                    ? (
                            <FunctionSelector
                                noNameField={true}
                                function={filter.function}
                                setFunction={(f) => {
                                    props.setFilter({
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
export function StatisticSelector({ statistic, setStatistic, names, overallName, simple }: { statistic: ColorStatDescriptor | undefined, setStatistic: (newValue: ColorStatDescriptor) => void, names: readonly StatName[], overallName: string | undefined, simple: boolean }): ReactNode {
    return (
        <div style={{ width: '100%' }}>
            <DataListSelector
                overallName={overallName}
                names={['Function', ...names]}
                initialValue={statistic?.value}
                onChange={(name) => {
                    setStatistic(name !== 'Function'
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
                            setFunction={setStatistic}
                            names={names}
                            simple={simple}
                        />
                    )
                : <div></div>}
        </div>
    )
}
