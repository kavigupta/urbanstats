import assert from 'assert'

import { locationOf, toStatement, unify, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { parse } from '../../urban-stats-script/parser'
import { USSType } from '../../urban-stats-script/types-values'

export type StatisticsForGeography = { stats: number[] }[]

export const rootBlockIdent = 'r'

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
    uss: UrbanStatsASTExpression | UrbanStatsASTStatement
}

export interface MapSettings {
    geographyKind: string
    script: MapperScriptSettings
}

export function parseNoError(uss: string, blockId: string): UrbanStatsASTStatement {
    const result = parse(uss, { type: 'single', ident: blockId }, true)
    assert(result.type !== 'error', `Should not have an error`)
    return result
}

export function parseNoErrorAsExpression(uss: string, blockId: string, expectedType?: USSType): UrbanStatsASTExpression {
    const result = parseNoError(uss, blockId)
    return {
        type: 'customNode',
        expr: result,
        originalCode: uss,
        expectedType,
    }
}

export function computeUSS(mapSettings: MapperScriptSettings): UrbanStatsASTStatement {
    return toStatement(mapSettings.uss)
}

export function defaultSettings(addTo: Partial<MapSettings>): MapSettings {
    const defaults: MapSettings = {
        geographyKind: '',
        script: {
            uss: parseNoErrorAsExpression('', rootBlockIdent),
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

export function makeStatements(elements: UrbanStatsASTStatement[]): UrbanStatsASTStatement {
    return {
        type: 'statements',
        result: elements,
        entireLoc: unify(...elements.map(locationOf)),
    }
}
