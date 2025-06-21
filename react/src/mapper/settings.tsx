import React, { ReactNode, useMemo } from 'react'

import valid_geographies from '../data/mapper/used_geographies'
import statistic_variables_info from '../data/statistic_variables_info'
import { Editor } from '../urban-stats-script/Editor'
import { defaultConstants } from '../urban-stats-script/constants/constants'
import { USSExecutionDescriptor } from '../urban-stats-script/workerManager'

import { DataListSelector } from './DataListSelector'

export type StatisticsForGeography = { stats: number[] }[]

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

export function MapperSettings(props: {
    mapSettings: MapSettings
    setMapSettings: (newValue: MapSettings) => void
    getUss: () => string
}): ReactNode {
    const executionDescriptor = useMemo<USSExecutionDescriptor>(() => ({ kind: 'mapper', geographyKind: props.mapSettings.geography_kind }), [props.mapSettings.geography_kind])
    const autocompleteSymbols = useMemo(() => Array.from(defaultConstants.keys()).concat(statistic_variables_info.variableNames).concat(statistic_variables_info.multiSourceVariables.map(([name]) => name)).concat(['geo']), [])

    return (
        <div>
            <DataListSelector
                overallName="Geography Kind:"
                names={valid_geographies}
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
                getScript={props.getUss}
                setScript={(uss) => {
                    props.setMapSettings({
                        ...props.mapSettings,
                        uss,
                    })
                }}
                executionDescriptor={executionDescriptor}
                autocompleteSymbols={autocompleteSymbols}
                showOutput={false}
            />
        </div>
    )
}
