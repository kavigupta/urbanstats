import assert from 'assert'

import React, { ReactNode, useCallback, useMemo } from 'react'

import valid_geographies from '../data/mapper/used_geographies'
import statistic_variables_info from '../data/statistic_variables_info'
import { Editor } from '../urban-stats-script/Editor'
import { UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { defaultConstants } from '../urban-stats-script/constants/constants'
import { EditorError } from '../urban-stats-script/editor-utils'
import { parse } from '../urban-stats-script/parser'

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
}

export interface MapperScriptSettings {
    uss: string
}

export interface MapSettings {
    geographyKind: string
    script: MapperScriptSettings
}

export function computeUSS(mapSettings: MapperScriptSettings): UrbanStatsASTStatement {
    const result = parse(mapSettings.uss, { type: 'single', ident: 'mapper-panel' }, true)
    assert(result.type !== 'error', `Should not have an error`)
    return result
}

export function defaultSettings(addTo: Partial<MapSettings>): MapSettings {
    const defaults: MapSettings = {
        geographyKind: '',
        script: {
            uss: '',
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

export function MapperSettings({ mapSettings, setMapSettings, getScript, errors }: {
    mapSettings: MapSettings
    setMapSettings: (setter: (existing: MapSettings) => MapSettings) => void
    getScript: () => MapperScriptSettings
    errors: EditorError[]
}): ReactNode {
    const autocompleteSymbols = useMemo(() => Array.from(defaultConstants.keys()).concat(statistic_variables_info.variableNames).concat(statistic_variables_info.multiSourceVariables.map(([name]) => name)).concat(['geo']), [])

    const setUss = useCallback((uss: string) => {
        setMapSettings(s => ({
            ...s,
            script: { uss },
        }))
    }, [setMapSettings])

    const getUss = useCallback(() => {
        return getScript().uss
    }, [getScript])

    return (
        <div>
            <DataListSelector
                overallName="Geography Kind:"
                names={valid_geographies}
                initialValue={mapSettings.geographyKind}
                onChange={
                    (name) => {
                        setMapSettings(s => ({
                            ...s,
                            geographyKind: name,
                        }))
                    }
                }
            />
            <Editor
                getUss={getUss}
                setUss={setUss}
                autocompleteSymbols={autocompleteSymbols}
                errors={errors}
            />
        </div>
    )
}
