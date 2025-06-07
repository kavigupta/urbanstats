import React, { ReactNode } from 'react'

import statistic_variables_info from '../data/statistic_variables_info'
import { useColors } from '../page_template/colors'
import { StatName } from '../page_template/statistic-tree'
import { defaultConstants } from '../urban-stats-script/constants'
import { Context } from '../urban-stats-script/context'
import { execute, InterpretationError } from '../urban-stats-script/interpreter'
import { parse } from '../urban-stats-script/parser'
import { renderType } from '../urban-stats-script/types-values'
import { firstNonNan } from '../utils/math'

import { DataListSelector } from './DataListSelector'
import { ColorStat, ColorStatDescriptor, FilterSettings, StatisticsForGeography } from './settings'

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
            () => undefined,
            (msg, loc) => { return new InterpretationError(msg, loc) },
            defaultConstants,
            new Map(),
        )
        statistic_variables_info.variableNames.forEach((name, index) => {
            ctx.assignVariable(name, {
                type: { type: 'vector', elementType: { type: 'number' } },
                value: statistics_for_geography.map(stat => stat.stats[index]),
            })
        })

        statistic_variables_info.multiSourceVariables.forEach((content) => {
            const [name, subvars] = content
            const indices = subvars.map(subvar => statistic_variables_info.variableNames.indexOf(subvar))
            const value = statistics_for_geography.map((stat) => {
                return firstNonNan(indices.map(i => stat.stats[i]))
            })
            ctx.assignVariable(name, {
                type: { type: 'vector', elementType: { type: 'number' } },
                value,
            })
        })

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
