import { Parser, Value } from 'expr-eval'
import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../components/sidebar'
import { useColors } from '../page_template/colors'
import { StatName } from '../page_template/statistic-tree'
import { defaultConstants } from '../urban-stats-script/constants'
import { Context } from '../urban-stats-script/context'
import { Effect, execute, InterpretationError } from '../urban-stats-script/interpreter'
import { parse } from '../urban-stats-script/parser'
import { renderType } from '../urban-stats-script/types-values'

import { DataListSelector } from './DataListSelector'
import { ColorStat, ColorStatDescriptor, FilterSettings, RegressionDescriptor, StatisticsForGeography } from './settings'

interface VariableDescriptor {
    name: string
    expr: ColorStatDescriptor | undefined
}

export class USSColorStat implements ColorStat {
    constructor(private readonly _nameToIndex: ReadonlyMap<string, number>, private readonly _name: string | undefined, private readonly _uss: string) {
    }

    name(): string {
        return this._name ?? '[Unnamed function]'
    }

    compute(statistics_for_geography: StatisticsForGeography): number[] {
        // let variables = { ...vars }
        // for (const variable of this._variables) {
        //     variables[variable.name] = variable.expr.compute(statistics_for_geography)
        // }
        // if (this._expr === '') {
        //     return statistics_for_geography.map(() => 0)
        // }
        // for (const regression of this._regressions) {
        //     const out = regression.compute(statistics_for_geography, variables)
        //     variables = { ...variables, ...out }
        // }
        // return statistics_for_geography.map((_, i) => {
        //     const expr = Parser.parse(this._expr)
        //     const statVars: Value = {}
        //     for (const key of Object.keys(variables)) {
        //         statVars[key] = variables[key][i]
        //     }
        //     return expr.evaluate(statVars) as number
        // })
        const ctx = new Context(
            (eff: Effect) => { },
            (msg, loc) => { return new InterpretationError(msg, loc) },
            defaultConstants,
            new Map(),
        )
        const remapNames = new Map<string, string>(
            [
                ['Population', 'population'],
                ['PW Density (r=1km)', 'pw_density_1km'],
            ],
        )
        for (const [name, index] of this._nameToIndex.entries()) {
            const id = remapNames.get(name)
            if (id === undefined) {
                continue
            }
            ctx.assignVariable(id, {
                type: { type: 'vector', elementType: { type: 'number' } },
                value: statistics_for_geography.map(stat => stat.stats[index]),
            })
        }

        let result
        try {
            const stmts = parse(this._uss)
            if (stmts.type === 'error') {
                console.error('Error parsing USS expression:', stmts.errors)
                return statistics_for_geography.map(() => NaN)
            }
            result = execute(stmts, ctx)
        }
        catch (e) {
            console.error('Error parsing USS expression:', e)
            return statistics_for_geography.map(() => NaN)
        }
        // TODO do this properly via a parameter
        if (renderType(result.type) !== '[number]' && renderType(result.type) !== '[boolean]') {
            console.error('USS expression did not return a vector of numbers or booleans:', result)
            return statistics_for_geography.map(() => NaN)
        }
        return result.value as number[]
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

export function FunctionSelector(props: { function: ColorStatDescriptor, setFunction: (newValue: ColorStatDescriptor) => void, names: readonly StatName[], simple?: boolean, noNameField?: boolean, placeholder?: string }): ReactNode {
    const colors = useColors()
    const func = props.function
    const expression = (
        <input
            type="text"
            style={{ width: '100%', backgroundColor: colors.background, color: colors.textMain }}
            placeholder={props.placeholder ?? 'Expression, e.g., "a + b"'}
            value={func.uss}
            onChange={(e) => {
                props.setFunction({
                    ...func,
                    uss: e.target.value,
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
            {expression}
        </div>
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
                                uss: '',
                            }
                        : {
                                ...statistic,
                                type: 'function',
                                value: 'Function',
                                uss: '',
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
