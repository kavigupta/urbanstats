import { gunzipSync } from 'zlib'

import { z } from 'zod'

import valid_geographies from '../../data/mapper/used_geographies'
import universes_ordered from '../../data/universes_ordered'
import { Universe } from '../../universe'
import { locationOf, toStatement, unify, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { longMessage } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { parse, parseNoErrorAsCustomNode, unparse } from '../../urban-stats-script/parser'
import { TypeEnvironment, USSType } from '../../urban-stats-script/types-values'
import { defaultTypeEnvironment } from '../context'

import { parseExpr } from './parseExpr'

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

export type MapEditorMode = 'uss' | 'insets' | 'textBoxes'

export const rootBlockIdent = 'r'
export const idPreamble = `${rootBlockIdent}p`
export const idCondition = `${rootBlockIdent}c`
export const idOutput = `${rootBlockIdent}o`

export type MapUSS = UrbanStatsASTExpression & { type: 'customNode' } |
    (UrbanStatsASTStatement &
    {
        type: 'statements'
        result: [
                UrbanStatsASTStatement & { type: 'expression', value: UrbanStatsASTExpression & { type: 'customNode' } },
                UrbanStatsASTStatement & { type: 'condition', rest: [UrbanStatsASTStatement & { type: 'expression' }] },
        ]
    })

const cMap = { type: 'opaque', name: 'cMap', allowCustomExpression: false } satisfies USSType
const cMapRGB = { type: 'opaque', name: 'cMapRGB', allowCustomExpression: false } satisfies USSType
const pMap = { type: 'opaque', name: 'pMap', allowCustomExpression: false } satisfies USSType

export const validMapperOutputs = [cMap, cMapRGB, pMap] satisfies USSType[]

export function attemptParseAsTopLevel(stmt: MapUSS | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment, preserveCustomNodes: boolean, targetOutputTypes: USSType[]): MapUSS {
    /**
     * Splits up the statements into a preamble and a condition statement. Make the body of the condition a custom node.
     */
    if (stmt.type === 'customNode') {
        return stmt
    }
    const stmts = stmt.type === 'statements' ? stmt.result : [stmt]
    const preamble = {
        type: 'statements',
        result: stmts.slice(0, -1),
        entireLoc: locationOf(stmt),
    } satisfies UrbanStatsASTStatement
    const conditionStmt = stmts.length > 0 ? stmts[stmts.length - 1] : undefined
    const { conditionRest, conditionExpr } = attemptParseCondition(conditionStmt)
    const body = parseExpr(makeStatements(conditionRest, idOutput), idOutput, targetOutputTypes, typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes)
    const condition = {
        type: 'condition',
        entireLoc: locationOf(conditionExpr),
        condition: conditionExpr,
        rest: [{ type: 'expression', value: body }] as const,
    } satisfies UrbanStatsASTStatement
    return {
        type: 'statements',
        result: [
            { type: 'expression', value: parseNoErrorAsCustomNode(unparse(preamble, { simplify: true }), idPreamble) },
            condition,
        ] as const,
        entireLoc: locationOf(stmt),
    } satisfies UrbanStatsASTStatement
}

function attemptParseCondition(conditionStmt: UrbanStatsASTStatement | undefined): { conditionRest: UrbanStatsASTStatement[], conditionExpr: UrbanStatsASTExpression } {
    let stmts = conditionStmt !== undefined ? [conditionStmt] : []
    if (conditionStmt?.type === 'condition') {
        const conditionText = unparse(conditionStmt.condition, { simplify: true })
        if (conditionText.trim() !== 'true') {
            return {
                conditionExpr: parseNoErrorAsCustomNode(conditionText, idCondition, [{ type: 'vector', elementType: { type: 'boolean' } }]),
                conditionRest: conditionStmt.rest,
            }
        }
        stmts = conditionStmt.rest
    }
    return {
        conditionExpr: { type: 'identifier', name: { node: 'true', location: emptyLocation(idCondition) } } satisfies UrbanStatsASTExpression,
        conditionRest: stmts,
    }
}

export function defaultTopLevelEditor(): UrbanStatsASTStatement {
    const expr = parseNoErrorAsCustomNode('cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', rootBlockIdent, validMapperOutputs)
    return expr.expr
}
