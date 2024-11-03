import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { StatName } from '../statistic'

import { DataListSelector } from './DataListSelector'
import { FilterSelector, FunctionColorStat, StatisticSelector } from './function'
import { RampColormapSelector } from './ramp-selector'
import { ConstantRampDescriptor, RampDescriptor } from './ramps'
import { Regression } from './regression'
import { setting_name_style, useSettingSubNameStyle } from './style'

export type StatisticsForGeography = { stats: number[] }[]

export interface ColorStat {
    name(): string
    compute(statistics_for_geography: StatisticsForGeography, vars?: Record<string, number[]>): number[]
}

export interface RegressionDescriptor {
    var_coefficients: string[]
    var_intercept: string
    independent: ColorStatDescriptor | undefined
    residual_name?: string
    var_residue: string
    weight_by_population: boolean
    dependents: (ColorStatDescriptor | undefined)[]
}

export type ColorStatDescriptor = (
    { type: 'single', value: string, variables?: { name: string, expr: (ColorStatDescriptor | undefined) }[], regressions?: RegressionDescriptor[], name?: string, expression?: string }
    |
    { type: 'function', value: 'Function', variables: { name: string, expr: (ColorStatDescriptor | undefined) }[], regressions?: RegressionDescriptor[], name?: string, expression: string }
)

export interface LineStyle {
    color: string
    weight: number

}

export type Basemap = {
    type: 'osm'
} | { type: 'none' }

export interface FilterSettings {
    enabled: boolean
    function: ColorStatDescriptor
};

export interface MapSettings {
    geography_kind: string
    filter: FilterSettings
    color_stat: undefined | ColorStatDescriptor
    ramp: RampDescriptor
    line_style: LineStyle
    basemap: Basemap
}

export function default_settings(add_to: Partial<MapSettings>): MapSettings {
    const defaults: MapSettings = {
        geography_kind: '',
        filter: {
            enabled: false,
            function: {
                type: 'function',
                value: 'Function',
                expression: '',
                variables: [],
            },
        },
        color_stat: undefined,
        ramp: {
            type: 'linear',
            colormap: {
                type: 'none',
            },
        },
        line_style: {
            color: '#000000',
            weight: 0.5,
        },
        basemap: {
            type: 'osm',
        },
    }
    return merge(add_to, defaults)
}

function merge<T>(add_to: Partial<T>, add_from: T): T {
    let key: keyof T
    for (key in add_from) {
        if (add_to[key] === undefined) {
            add_to[key] = add_from[key]
        }
        else if (typeof add_to[key] === 'object') {
            merge(add_to[key] as object, add_from[key])
        }
    }
    return add_to as T
}

function parse_regression(name_to_index: ReadonlyMap<string, number>, regr: RegressionDescriptor): Regression {
    const independent_fn = parse_color_stat(name_to_index, regr.independent)
    const dependent_fns = regr.dependents.map(dependent => parse_color_stat(name_to_index, dependent))
    const dependent_names = regr.var_coefficients
    const intercept_name = regr.var_intercept
    const residual_name = regr.var_residue
    const weight_by_population = regr.weight_by_population

    return new Regression(
        independent_fn,
        dependent_fns,
        dependent_names,
        intercept_name,
        residual_name,
        weight_by_population,
        name_to_index.get('Population')!,
    )
}

export function parse_color_stat(name_to_index: ReadonlyMap<string, number>, color_stat: ColorStatDescriptor | undefined): ColorStat {
    if (color_stat === undefined) {
        return new InvalidColorStat()
    }
    const type = color_stat.type
    if (type === 'single') {
        const value = color_stat.value
        if (name_to_index.has(value)) {
            return new SingleColorStat(name_to_index.get(value)!, value)
        }
        return new InvalidColorStat()
    }
    else {
        const variables = color_stat.variables.map((variable) => {
            return {
                name: variable.name,
                expr: parse_color_stat(name_to_index, variable.expr),
            }
        })
        const regressions = (color_stat.regressions ?? []).map(regr => parse_regression(name_to_index, regr))
        return new FunctionColorStat(color_stat.name, variables, regressions, color_stat.expression)
    }
}

class SingleColorStat implements ColorStat {
    constructor(private readonly _index: number, private readonly _name: string) {
    }

    name(): string {
        return this._name
    }

    compute(statistics_for_geography: StatisticsForGeography): number[] {
        return statistics_for_geography.map(statistics => statistics.stats[this._index])
    }
}

class InvalidColorStat implements ColorStat {
    name(): string {
        return '[Invalid]'
    }

    compute(statistics_for_geography: StatisticsForGeography): number[] {
        return statistics_for_geography.map(() => 0)
    }
}

function ConstantParametersSelector({ ramp, set_ramp }: { ramp: ConstantRampDescriptor, set_ramp: (newValue: ConstantRampDescriptor) => void }): ReactNode {
    const colors = useColors()
    return (
        <div style={{ display: 'flex' }}>
            <div style={useSettingSubNameStyle()}>
                Lower Bound:
            </div>
            <input
                type="number"
                style={{ width: '5em', backgroundColor: colors.background, color: colors.textMain }}
                value={ramp.lower_bound}
                onChange={(e) => {
                    set_ramp({
                        ...ramp,
                        lower_bound: e.target.value,
                    })
                }}
            />
            <div style={{ width: '0.5em' }} />
            <div style={useSettingSubNameStyle()}>
                Upper Bound:
            </div>
            <input
                type="number"
                style={{ width: '5em', backgroundColor: colors.background, color: colors.textMain }}
                value={ramp.upper_bound}
                onChange={(e) => {
                    set_ramp({
                        ...ramp,
                        upper_bound: e.target.value,
                    })
                }}
            />
        </div>
    )
}

function RampSelector(props: { ramp: RampDescriptor, set_ramp: (newValue: RampDescriptor) => void }): ReactNode {
    const colors = useColors()
    return (
        <div>
            <div style={setting_name_style}>
                Ramp:
            </div>
            <RampColormapSelector
                ramp={props.ramp}
                set_ramp={(ramp) => { props.set_ramp(ramp) }}
            />
            <DataListSelector
                overall_name="Ramp Type:"
                names={['linear', 'constant', 'geometric'] as const}
                no_neutral={true}
                header_style={useSettingSubNameStyle()}
                initial_value={props.ramp.type}
                onChange={(name) => {
                    props.set_ramp({
                        ...props.ramp,
                        type: name,
                    })
                }}
            />
            {
                props.ramp.type === 'constant'
                    ? (
                            <ConstantParametersSelector
                                ramp={props.ramp}
                                set_ramp={props.set_ramp}
                            />
                        )
                    : <div></div>
            }
            <div style={{ display: 'flex' }}>
                <div style={useSettingSubNameStyle()}>
                    Reversed:
                </div>
                <input
                    type="checkbox"
                    style={{ backgroundColor: colors.background, color: colors.textMain }}
                    checked={props.ramp.reversed ?? false}
                    onChange={(e) => {
                        props.set_ramp({
                            ...props.ramp,
                            reversed: e.target.checked,
                        })
                    }}
                />
            </div>
        </div>
    )
}

function LineStyleSelector(props: { line_style: LineStyle, set_line_style: (newValue: LineStyle) => void }): ReactNode {
    const colors = useColors()
    return (
        <div>
            <div style={setting_name_style}>
                Line Style:
            </div>
            <div style={{ display: 'flex' }}>
                <div style={useSettingSubNameStyle()}>
                    Color:
                </div>
                <input
                    type="color"
                    style={{ backgroundColor: colors.background, color: colors.textMain }}
                    value={props.line_style.color}
                    onChange={(e) => {
                        props.set_line_style({
                            ...props.line_style,
                            color: e.target.value,
                        })
                    }}
                />
            </div>
            <div style={{ display: 'flex' }}>
                <div style={useSettingSubNameStyle()}>
                    Weight:
                </div>
                <input
                    type="number"
                    style={{ width: '5em', backgroundColor: colors.background, color: colors.textMain }}
                    value={props.line_style.weight}
                    onChange={(e) => {
                        props.set_line_style({
                            ...props.line_style,
                            weight: parseFloat(e.target.value),
                        })
                    }}
                />
            </div>
        </div>
    )
}

function BaseMapSelector({ basemap, set_basemap }: { basemap: Basemap, set_basemap: (newValue: Basemap) => void }): ReactNode {
    // just a checkbox for now
    const colors = useColors()
    return (
        <div>
            <div style={setting_name_style}>
                Basemap:
            </div>
            <div style={{ display: 'flex' }}>
                <div style={useSettingSubNameStyle()}>
                    OSM:
                </div>
                <input
                    type="checkbox"
                    style={{ backgroundColor: colors.background, color: colors.textMain }}
                    checked={basemap.type !== 'none'}
                    onChange={(e) => {
                        set_basemap({
                            type: e.target.checked ? 'osm' : 'none',
                        })
                    }}
                />
            </div>
        </div>
    )
}

export function MapperSettings(props: { map_settings: MapSettings, valid_geographies: readonly string[], set_map_settings: (newValue: MapSettings) => void, names: readonly StatName[] }): ReactNode {
    return (
        <div>
            <DataListSelector
                overall_name="Geography Kind:"
                names={
                    props.valid_geographies
                }
                initial_value={props.map_settings.geography_kind}
                onChange={
                    (name) => {
                        props.set_map_settings({
                            ...props.map_settings,
                            geography_kind: name,
                        })
                    }
                }
            />
            <div style={setting_name_style}>Filter</div>
            <FilterSelector
                filter={props.map_settings.filter}
                set_filter={(filter) => {
                    props.set_map_settings({
                        ...props.map_settings,
                        filter,
                    })
                }}
                names={props.names}
            />
            <StatisticSelector
                overall_name="Statistic for Color:"
                statistic={props.map_settings.color_stat}
                set_statistic={(color_stat) => {
                    props.set_map_settings({
                        ...props.map_settings,
                        color_stat,
                    })
                }}
                names={props.names}
                simple={false}
            />
            <RampSelector
                ramp={props.map_settings.ramp}
                set_ramp={(ramp) => {
                    props.set_map_settings({
                        ...props.map_settings,
                        ramp,
                    })
                }}
            />
            <LineStyleSelector
                line_style={props.map_settings.line_style}
                set_line_style={(line_style) => {
                    props.set_map_settings({
                        ...props.map_settings,
                        line_style,
                    })
                }}
            />
            <BaseMapSelector
                basemap={props.map_settings.basemap}
                set_basemap={(basemap) => {
                    props.set_map_settings({
                        ...props.map_settings,
                        basemap,
                    })
                }}
            />
        </div>
    )
}
