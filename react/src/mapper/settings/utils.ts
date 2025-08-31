import type valid_geographies from '../../data/mapper/used_geographies'
import { Universe } from '../../universe'
import { locationOf, toStatement, unify, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { defaultTypeEnvironment } from '../context'

import { attemptParseAsTopLevel, defaultTopLevelEditor, MapUSS } from './TopLevelEditor'

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
    noLabels?: boolean
    subnationalOutlines?: LineStyle
} | { type: 'none' }

export interface FilterSettings {
    enabled: boolean
    function: ColorStatDescriptor
}

export interface MapperScriptSettings {
    uss: MapUSS
}

export interface MapSettings {
    geographyKind: typeof valid_geographies[number] | undefined
    universe: Universe | undefined
    script: MapperScriptSettings
}

export function computeUSS(mapSettings: MapperScriptSettings): UrbanStatsASTStatement {
    return toStatement(mapSettings.uss)
}

export function defaultSettings(addTo: Partial<MapSettings>): MapSettings {
    const uss = attemptParseAsTopLevel(addTo.script?.uss ?? defaultTopLevelEditor(), defaultTypeEnvironment(addTo.universe ?? 'USA'), true)
    return {
        geographyKind: addTo.geographyKind ?? 'Subnational Region',
        universe: addTo.universe ?? 'USA',
        script: {
            uss,
        },
    }
}

export function makeStatements<const T extends UrbanStatsASTStatement[]>(elements: T, identFallback?: string): UrbanStatsASTStatement & { type: 'statements', result: T } {
    const locations = [...elements.map(locationOf)]
    if (identFallback !== undefined) {
        locations.push(emptyLocation(identFallback))
    }
    return {
        type: 'statements',
        result: elements,
        entireLoc: unify(...locations),
    }
}
