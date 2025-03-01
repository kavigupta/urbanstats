import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'
import { StatName } from '../page_template/statistic-tree'

import { DataListSelector } from './DataListSelector'
import { FilterSelector, FunctionColorStat, StatisticSelector } from './function'
import { RampColormapSelector } from './ramp-selector'
import { ConstantRampDescriptor, RampDescriptor } from './ramps'
import { Regression } from './regression'
import { settingNameStyle, useSettingSubNameStyle } from './style'

export type StatisticsForGeography = { stats: number[] }[]

export interface ColorStat {
    name: () => string
    compute: (statisticsForGeography: StatisticsForGeography, vars?: Record<string, number[]>) => number[]
}

/* eslint-disable no-restricted-syntax -- This represents persitent links */
export interface RegressionDescriptor {
    var_coefficients: string[]
    var_intercept: string
    independent: ColorStatDescriptor | undefined | null
    residual_name?: string
    var_residue: string
    weight_by_population: boolean
    dependents: (ColorStatDescriptor | undefined | null)[]
}
/* eslint-enable no-restricted-syntax */

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

/* eslint-disable no-restricted-syntax -- This represents persitent links */
export interface MapSettings {
    geography_kind: string
    filter: FilterSettings
    color_stat: undefined | ColorStatDescriptor
    ramp: RampDescriptor
    line_style: LineStyle
    basemap: Basemap
}
/* eslint-enable no-restricted-syntax */

export function defaultSettings(addTo: Partial<MapSettings>): MapSettings {
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
    return merge(addTo, defaults)
}

function merge<T>(addTo: Partial<T>, addFrom: T): T {
    let key: keyof T
    for (key in addFrom) {
        if (addTo[key] === undefined) {
            addTo[key] = addFrom[key]
        }
        else if (typeof addTo[key] === 'object') {
            merge(addTo[key] as object, addFrom[key])
        }
    }
    return addTo as T
}

function parseRegression(nameToIndex: ReadonlyMap<string, number>, regr: RegressionDescriptor): Regression {
    const independentFn = parseColorStat(nameToIndex, regr.independent ?? undefined)
    const dependentFns = regr.dependents.map(dependent => parseColorStat(nameToIndex, dependent ?? undefined))
    const dependentNames = regr.var_coefficients
    const interceptName = regr.var_intercept
    const residualName = regr.var_residue
    const weightByPopulation = regr.weight_by_population

    return new Regression(
        independentFn,
        dependentFns,
        dependentNames,
        interceptName,
        residualName,
        weightByPopulation,
        nameToIndex.get('Population')!,
    )
}

export function parseColorStat(nameToIndex: ReadonlyMap<string, number>, colorStat: ColorStatDescriptor | undefined): ColorStat {
    if (colorStat === undefined) {
        return new InvalidColorStat()
    }
    const type = colorStat.type
    if (type === 'single') {
        const value = colorStat.value
        if (nameToIndex.has(value)) {
            return new SingleColorStat(nameToIndex.get(value)!, value)
        }
        return new InvalidColorStat()
    }
    else {
        const variables = colorStat.variables.map((variable) => {
            return {
                name: variable.name,
                expr: parseColorStat(nameToIndex, variable.expr),
            }
        })
        const regressions = (colorStat.regressions ?? []).map(regr => parseRegression(nameToIndex, regr))
        return new FunctionColorStat(colorStat.name, variables, regressions, colorStat.expression)
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

function ConstantParametersSelector({ ramp, setRamp }: { ramp: ConstantRampDescriptor, setRamp: (newValue: ConstantRampDescriptor) => void }): ReactNode {
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
                    setRamp({
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
                    setRamp({
                        ...ramp,
                        upper_bound: e.target.value,
                    })
                }}
            />
        </div>
    )
}

function RampSelector(props: { ramp: RampDescriptor, setRamp: (newValue: RampDescriptor) => void }): ReactNode {
    const colors = useColors()
    return (
        <div>
            <div style={settingNameStyle}>
                Ramp:
            </div>
            <RampColormapSelector
                ramp={props.ramp}
                setRamp={(ramp) => { props.setRamp(ramp) }}
            />
            <DataListSelector
                overallName="Ramp Type:"
                names={['linear', 'constant', 'geometric'] as const}
                noNeutral={true}
                headerStyle={useSettingSubNameStyle()}
                initialValue={props.ramp.type}
                onChange={(name) => {
                    props.setRamp({
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
                                setRamp={props.setRamp}
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
                        props.setRamp({
                            ...props.ramp,
                            reversed: e.target.checked,
                        })
                    }}
                />
            </div>
        </div>
    )
}

function LineStyleSelector(props: { lineStyle: LineStyle, setLineStyle: (newValue: LineStyle) => void }): ReactNode {
    const colors = useColors()
    return (
        <div>
            <div style={settingNameStyle}>
                Line Style:
            </div>
            <div style={{ display: 'flex' }}>
                <div style={useSettingSubNameStyle()}>
                    Color:
                </div>
                <input
                    type="color"
                    style={{ backgroundColor: colors.background, color: colors.textMain }}
                    value={props.lineStyle.color}
                    onChange={(e) => {
                        props.setLineStyle({
                            ...props.lineStyle,
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
                    value={props.lineStyle.weight}
                    onChange={(e) => {
                        props.setLineStyle({
                            ...props.lineStyle,
                            weight: parseFloat(e.target.value),
                        })
                    }}
                />
            </div>
        </div>
    )
}

function BaseMapSelector({ basemap, setBasemap }: { basemap: Basemap, setBasemap: (newValue: Basemap) => void }): ReactNode {
    // just a checkbox for now
    const colors = useColors()
    return (
        <div>
            <div style={settingNameStyle}>
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
                        setBasemap({
                            type: e.target.checked ? 'osm' : 'none',
                        })
                    }}
                />
            </div>
        </div>
    )
}

export function MapperSettings(props: { mapSettings: MapSettings, validGeographies: string[], setMapSettings: (newValue: MapSettings) => void, names: readonly StatName[] }): ReactNode {
    return (
        <div>
            <DataListSelector
                overallName="Geography Kind:"
                names={
                    props.validGeographies
                }
                initialValue={props.mapSettings.geography_kind}
                onChange={
                    (name) => {
                        props.setMapSettings({
                            ...props.mapSettings,
                            geography_kind: name,
                        })
                    }
                }
            />
            <div style={settingNameStyle}>Filter</div>
            <FilterSelector
                filter={props.mapSettings.filter}
                setFilter={(filter) => {
                    props.setMapSettings({
                        ...props.mapSettings,
                        filter,
                    })
                }}
                names={props.names}
            />
            <StatisticSelector
                overallName="Statistic for Color:"
                statistic={props.mapSettings.color_stat}
                setStatistic={(colorStat) => {
                    props.setMapSettings({
                        ...props.mapSettings,
                        color_stat: colorStat,
                    })
                }}
                names={props.names}
                simple={false}
            />
            <RampSelector
                ramp={props.mapSettings.ramp}
                setRamp={(ramp) => {
                    props.setMapSettings({
                        ...props.mapSettings,
                        ramp,
                    })
                }}
            />
            <LineStyleSelector
                lineStyle={props.mapSettings.line_style}
                setLineStyle={(lineStyle) => {
                    props.setMapSettings({
                        ...props.mapSettings,
                        line_style: lineStyle,
                    })
                }}
            />
            <BaseMapSelector
                basemap={props.mapSettings.basemap}
                setBasemap={(basemap) => {
                    props.setMapSettings({
                        ...props.mapSettings,
                        basemap,
                    })
                }}
            />
        </div>
    )
}
