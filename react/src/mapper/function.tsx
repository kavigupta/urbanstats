import React, { ReactNode, useCallback } from 'react'

import statistic_variables_info from '../data/statistic_variables_info'
import { useColors } from '../page_template/colors'
import { StatName } from '../page_template/statistic-tree'
import { Editor } from '../urban-stats-script/Editor'
import { defaultConstants } from '../urban-stats-script/constants'
import { Context } from '../urban-stats-script/context'
import { execute, InterpretationError } from '../urban-stats-script/interpreter'
import { allIdentifiers, locationOfLastExpression, parse, UrbanStatsASTStatement } from '../urban-stats-script/parser'
import { USSValue } from '../urban-stats-script/types-values'
import { firstNonNan } from '../utils/math'

import { DataListSelector } from './DataListSelector'
import { ColorStat, ColorStatDescriptor, FilterSettings, StatisticsForGeography } from './settings'

export class USSColorStat implements ColorStat {
    constructor(private readonly _nameToIndex: ReadonlyMap<string, number>, private readonly _name: string | undefined, private readonly _uss: string) {
    }

    name(): string {
        return this._name ?? '[Unnamed function]'
    }

    compute(statisticsForGeography: StatisticsForGeography): number[] {
        let result
        try {
            const stmts = parse(this._uss)
            if (stmts.type === 'error') {
                console.error('Error parsing USS expression:', stmts.errors)
                return statisticsForGeography.map(() => NaN)
            }
            const ctx = colorStatContext(stmts, statisticsForGeography)
            result = colorStatExecute(stmts, ctx)
        }
        catch (e) {
            console.error('Error parsing USS expression:', e)
            return statisticsForGeography.map(() => NaN)
        }
        return result.value as number[]
    }
}

function colorStatContext(stmts: UrbanStatsASTStatement | undefined, statisticsForGeography: StatisticsForGeography | undefined): Context {
    const ctx = new Context(
        () => undefined,
        (msg, loc) => { return new InterpretationError(msg, loc) },
        defaultConstants,
        new Map(),
    )

    const getVariable = (name: string, load: boolean): USSValue | undefined => {
        const index = statistic_variables_info.variableNames.indexOf(name as ElementOf<typeof statistic_variables_info.variableNames>)
        if (index === -1) {
            return undefined
        }
        return {
            type: { type: 'vector', elementType: { type: 'number' } },
            value: load ? statisticsForGeography?.map(stat => stat.stats[index]) ?? [] : [],
        }
    }

    addVariablesToContext(ctx, stmts, getVariable)
    return ctx
}

function colorStatExecute(stmts: UrbanStatsASTStatement, context: Context): USSValue {
    const result = execute(stmts, context)
    if (result.type.type !== 'vector' || (result.type.elementType.type !== 'number' && result.type.elementType.type !== 'boolean')) {
        throw new InterpretationError('USS expression did not return a vector of numbers or booleans:', locationOfLastExpression(stmts))
    }
    return result
}

function addVariablesToContext(ctx: Context, stmts: UrbanStatsASTStatement | undefined, getVariable: (name: string, load: boolean) => USSValue | undefined): void {
    const ids = stmts !== undefined ? allIdentifiers(stmts) : undefined

    statistic_variables_info.variableNames.forEach((name) => {
        const va = getVariable(name, ids?.has(name) ?? false)
        if (va !== undefined) {
            ctx.assignVariable(name, va)
        }
    })

    statistic_variables_info.multiSourceVariables.forEach((content) => {
        const [name, subvars] = content
        const values = subvars.map((subvar) => {
            const existing = ctx.getVariable(subvar)?.value as (undefined | number[])
            if (existing === undefined || existing.length === 0) {
                return getVariable(subvar, ids?.has(name) ?? false)!.value as number[]
            }
            return existing
        })
        const value = values[0].map((_, i) => firstNonNan(values.map(v => v[i]))) // take first non-NaN value
        ctx.assignVariable(name, {
            type: { type: 'vector', elementType: { type: 'number' } },
            value,
        })
    })
}

export function FunctionSelector(props: { function: ColorStatDescriptor, setFunction: (newValue: ColorStatDescriptor) => void, names: readonly StatName[], simple?: boolean, noNameField?: boolean, placeholder?: string, stats: Promise<StatisticsForGeography | undefined> }): ReactNode {
    const colors = useColors()
    const func = props.function

    const { setFunction, stats } = props

    const setScript = useCallback((newScript: string) => {
        setFunction({
            ...func,
            uss: newScript,
        })
    }, [setFunction, func])

    const createContext = useCallback(async (stmts: UrbanStatsASTStatement | undefined) => colorStatContext(stmts, await stats), [stats])

    const expression = (
        <Editor
            script={func.uss ?? ''}
            setScript={setScript}
            createContext={createContext}
            execute={colorStatExecute}
            showOutput={false}
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

export function FilterSelector(props: { filter: FilterSettings, setFilter: (newValue: FilterSettings) => void, names: readonly StatName[], stats: Promise<StatisticsForGeography | undefined> }): ReactNode {
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
                                stats={props.stats}
                            />
                        )
                    : <div />
            }
        </div>
    )
}
export function StatisticSelector({ statistic, setStatistic, names, overallName, simple, stats }: { statistic: ColorStatDescriptor | undefined, setStatistic: (newValue: ColorStatDescriptor) => void, names: readonly StatName[], overallName: string | undefined, simple: boolean, stats: Promise<StatisticsForGeography | undefined> }): ReactNode {
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
                            stats={stats}
                        />
                    )
                : <div></div>}
        </div>
    )
}
