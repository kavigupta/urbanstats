import { gunzipSync } from 'zlib'

import { z } from 'zod'

import valid_geographies from '../../data/mapper/used_geographies'
import universes_ordered from '../../data/universes_ordered'
import { Universe } from '../../universe'
import { toStatement, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { parseNoErrorAsCustomNode } from '../../urban-stats-script/parser'
import { defaultTypeEnvironment } from '../context'

import { attemptParseAsTopLevel, MapUSS, mapUSSFromString, rootBlockIdent, validMapperOutputs } from './map-uss'

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
} | { type: 'none', backgroundColor: string, textColor: string }

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
    const uss = attemptParseAsTopLevel(addTo.script?.uss ?? defaultTopLevelEditor(), defaultTypeEnvironment(addTo.universe ?? 'USA'), true, validMapperOutputs)
    return {
        geographyKind: addTo.geographyKind ?? 'Subnational Region',
        universe: addTo.universe ?? 'USA',
        script: {
            uss,
        },
    }
}

export const mapperMetaFields = z.object({
    // Catch statements so we can remove universes/geos in the future and maps will still partially load
    geographyKind: z.optional(z.enum(valid_geographies)).catch(undefined),
    universe: z.optional(z.enum(universes_ordered)).catch(undefined),
})

export function mapSettingsFromURLParam(encodedSettings: string | undefined): MapSettings {
    let settings: Partial<MapSettings> = {}
    if (encodedSettings !== undefined) {
        const jsonedSettings = gunzipSync(Buffer.from(encodedSettings, 'base64')).toString()
        const rawSettings = z.object({
            ...mapperMetaFields.shape,
            script: z.object({
                uss: z.string(),
            }) }).parse(JSON.parse(jsonedSettings))
        settings = {
            ...rawSettings,
            script: { uss: mapUSSFromString(rawSettings.script.uss) },
        }
    }
    return defaultSettings(settings)
}

export type MapEditorMode = 'uss' | 'insets' | 'textBoxes'

export function defaultTopLevelEditor(): UrbanStatsASTStatement {
    const expr = parseNoErrorAsCustomNode('cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', rootBlockIdent, validMapperOutputs)
    return expr.expr
}
