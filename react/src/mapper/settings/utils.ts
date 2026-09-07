import { z } from 'zod'

import valid_geographies from '../../data/mapper/used_geographies'
import universes_ordered from '../../data/universes_ordered'
import { Universe } from '../../universe'
import { toStatement, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { mapLabel } from '../../urban-stats-script/derive-human-readable-name'
import { parseNoErrorAsCustomNode } from '../../urban-stats-script/parser'
import { GeographySelection } from '../../urban-stats-script/workerManager'
import { reifyString } from '../../utils/human-readable-name'
import { UnitSettings } from '../../utils/quantity'
import { base64Gunzip } from '../../utils/urlParamShort'
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
    geographies: GeographySelection[]
    script: MapperScriptSettings
}

export function universesOf(geographies: GeographySelection[]): Universe[] {
    return Array.from(new Set(geographies.map(g => g.universe)))
}

/** What a map is titled before it runs. */
export function mapTitle(mapSettings: MapSettings, settings: UnitSettings): string | undefined {
    const label = mapLabel(mapSettings.script.uss, defaultTypeEnvironment(universesOf(mapSettings.geographies)))
    return label === undefined ? undefined : reifyString(label, settings)
}

export function mapPageTitle(mapSettings: MapSettings, settings: UnitSettings): string {
    return mapTitle(mapSettings, settings) ?? 'Urban Stats Mapper'
}

export function computeUSS(mapSettings: MapperScriptSettings): UrbanStatsASTStatement {
    return toStatement(mapSettings.uss)
}

export function defaultSettings(addTo: { script?: MapperScriptSettings } & MapperMetaFields): MapSettings {
    const geographies = geographiesFromMeta(addTo) ?? [defaultGeography]
    const uss = attemptParseAsTopLevel(addTo.script?.uss ?? defaultTopLevelEditor(), defaultTypeEnvironment(universesOf(geographies)), true, validMapperOutputs)
    return {
        geographies,
        script: {
            uss,
        },
    }
}

export const defaultGeography: GeographySelection = { universe: 'USA', geographyKind: 'Subnational Region' }

// Catch statements so we can remove universes/geos in the future and maps will still partially load
const orDropped = <T extends z.ZodTypeAny>(schema: T): z.ZodCatch<z.ZodOptional<T>> => z.optional(schema).catch(undefined)

/**
 * A map writes `geographies`; `meta(...)` in a `.uss` file, which has no object literal, writes the
 * parallel lists, and links predating multiple geographies carry them as scalars.
 */
export const mapperMetaFields = z.object({
    geographies: orDropped(z.array(orDropped(z.object({
        universe: z.enum(universes_ordered),
        geographyKind: z.enum(valid_geographies),
    })))),
    geographyKind: orDropped(z.union([z.enum(valid_geographies), z.array(orDropped(z.enum(valid_geographies)))])),
    universe: orDropped(z.union([z.enum(universes_ordered), z.array(orDropped(z.enum(universes_ordered)))])),
})

export type MapperMetaFields = z.infer<typeof mapperMetaFields>

/** Undefined when the metadata says nothing about geographies, as opposed to selecting none. */
export function geographiesFromMeta(meta: MapperMetaFields): GeographySelection[] | undefined {
    if (meta.geographies !== undefined) {
        return meta.geographies.filter(geography => geography !== undefined)
    }
    if (meta.universe === undefined && meta.geographyKind === undefined) {
        return undefined
    }
    const universes = Array.isArray(meta.universe) ? meta.universe : [meta.universe]
    const geographyKinds = Array.isArray(meta.geographyKind) ? meta.geographyKind : [meta.geographyKind]
    return Array.from({ length: Math.max(universes.length, geographyKinds.length) }, (_, i) => ({
        universe: universes[i] ?? defaultGeography.universe,
        geographyKind: geographyKinds[i] ?? defaultGeography.geographyKind,
    }))
}

/** @public this is included dynamically */
export async function mapSettingsFromURLParam(encodedSettings: string | undefined): Promise<MapSettings> {
    let settings: MapperMetaFields & { script?: MapperScriptSettings } = {}
    if (encodedSettings !== undefined) {
        const jsonedSettings = await base64Gunzip(encodedSettings)
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

function defaultTopLevelEditor(): UrbanStatsASTStatement {
    const expr = parseNoErrorAsCustomNode('cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', rootBlockIdent, validMapperOutputs)
    return expr.expr
}
