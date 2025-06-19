import React, { ReactNode, useCallback } from 'react'

import { StatName } from '../page_template/statistic-tree'
import { Editor } from '../urban-stats-script/Editor'
import { UrbanStatsASTStatement } from '../urban-stats-script/parser'

import { DataListSelector } from './DataListSelector'
import { USSColorStat, colorStatExecute, colorStatContext } from './function'

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
    { type: 'single', value: string, name?: string, uss: string }
    |
    { type: 'function', value: 'Function', name?: string, uss?: string }
)

export interface LineStyle {
    color: string
    weight: number

}

export type Basemap = {
    type: 'osm'
    disableBasemap?: boolean
} | { type: 'none' }

export interface FilterSettings {
    enabled: boolean
    function: ColorStatDescriptor
};

/* eslint-disable no-restricted-syntax -- This represents persitent links */
export interface MapSettings {
    geography_kind: string
    uss: string
}
/* eslint-enable no-restricted-syntax */

export function defaultSettings(addTo: Partial<MapSettings>): MapSettings {
    const defaults: MapSettings = {
        geography_kind: '',
        uss: '',
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
        if (colorStat.uss === undefined) {
            return new InvalidColorStat()
        }
        return new USSColorStat(nameToIndex, colorStat.name, colorStat.uss)
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

export function MapperSettings(props: {
    mapSettings: MapSettings
    validGeographies: string[]
    setMapSettings: (newValue: MapSettings) => void
    names: readonly StatName[]
    stats: Promise<StatisticsForGeography | undefined>
    longnames: Promise<string[] | undefined>
}): ReactNode {
    const createContext = useCallback(async (stmts: UrbanStatsASTStatement | undefined) => colorStatContext(stmts, await props.stats, await props.longnames), [props.stats, props.longnames])

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
            <Editor
                script={props.mapSettings.uss}
                setScript={(uss) => {
                    props.setMapSettings({
                        ...props.mapSettings,
                        uss,
                    })
                }}
                createContext={createContext}
                execute={colorStatExecute}
                showOutput={false}
            />
        </div>
    )
}
