import { gunzipSync } from 'zlib'

import { z } from 'zod'

import valid_geographies from '../../data/mapper/used_geographies'
import universes_ordered from '../../data/universes_ordered'
import { Universe } from '../../universe'
import { locationOf, toStatement, unify, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { longMessage } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { parse, parseNoErrorAsCustomNode, unparse } from '../../urban-stats-script/parser'
import { defaultTypeEnvironment } from '../context'

import { attemptParseAsTopLevel, defaultTopLevelEditor, MapUSS, rootBlockIdent } from './TopLevelEditor'

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
        const uss = parse(rawSettings.script.uss)
        if (uss.type === 'error') {
            throw new Error(uss.errors.map(error => longMessage({ kind: 'error', ...error }, true)).join(', '))
        }
        settings = {
            ...rawSettings,
            script: { uss: convertToMapUss(uss) },
        }
    }
    return defaultSettings(settings)
}

export function convertToMapUss(uss: UrbanStatsASTStatement): MapUSS {
    if (uss.type === 'expression' && uss.value.type === 'customNode') {
        return uss.value
    }
    if (
        uss.type === 'statements'
        && uss.result.length === 2
        && uss.result[0].type === 'expression'
        && uss.result[0].value.type === 'customNode'
        && uss.result[1].type === 'condition'
        && uss.result[1].rest.length === 1
        && uss.result[1].rest[0].type === 'expression'
    ) {
        return {
            ...uss,
            result: [
                {
                    ...uss.result[0],
                    value: uss.result[0].value,
                },
                {
                    ...uss.result[1],
                    rest: [uss.result[1].rest[0]],
                },
            ],
        }
    }
    // Support arbitrary scripts
    return parseNoErrorAsCustomNode(unparse(uss), rootBlockIdent)
}
