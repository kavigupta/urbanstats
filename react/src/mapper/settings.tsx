import assert from 'assert'

import React, { ReactNode, useCallback, useMemo } from 'react'

import { CheckboxSettingCustom } from '../components/sidebar'
import valid_geographies from '../data/mapper/used_geographies'
import statistic_variables_info from '../data/statistic_variables_info'
import { Editor } from '../urban-stats-script/Editor'
import { locationOf, toStatement, unify, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { defaultConstants } from '../urban-stats-script/constants/constants'
import { EditorError } from '../urban-stats-script/editor-utils'
import { emptyLocation, LocInfo } from '../urban-stats-script/lexer'
import { parse, ParseError, unparse } from '../urban-stats-script/parser'
import { undocValue } from '../urban-stats-script/types-values'

import { DataListSelector } from './DataListSelector'

export type StatisticsForGeography = { stats: number[] }[]

const rootBlockIdent = 'r'

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

function parseNoError(uss: string, blockId: string): UrbanStatsASTStatement {
    const result = parse(uss, { type: 'single', ident: blockId }, true)
    assert(result.type !== 'error', `Should not have an error`)
    return result
}

function parseNoErrorAsExpression(uss: string, blockId: string): UrbanStatsASTExpression {
    const result = parseNoError(uss, blockId)
    return {
        type: 'customNode',
        expr: result,
        originalCode: uss,
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

export function MapperSettings({ mapSettings, setMapSettings, getScript, errors }: {
    mapSettings: MapSettings
    setMapSettings: (setter: (existing: MapSettings) => MapSettings) => void
    getScript: () => MapperScriptSettings
    errors: EditorError[]
}): ReactNode {
    const autocompleteSymbols = useMemo(() => Array.from(defaultConstants.keys()).concat(statistic_variables_info.variableNames).concat(statistic_variables_info.multiSourceVariables.map(([name]) => name)).concat(['geo']), [])

    const setUss = useCallback((uss: UrbanStatsASTExpression | UrbanStatsASTStatement) => {
        setMapSettings(s => ({
            ...s,
            script: { uss },
        }))
    }, [setMapSettings])

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
            <TopLevelEditor
                uss={getScript().uss}
                setUss={setUss}
                autocompleteSymbols={autocompleteSymbols}
                errors={errors}
            />
        </div>
    )
}

export function CustomEditor({
    uss,
    setUss,
    autocompleteSymbols,
    errors,
    blockIdent,
}: {
    uss: UrbanStatsASTExpression & { type: 'customNode' }
    setUss: (u: UrbanStatsASTExpression) => void
    autocompleteSymbols: string[]
    errors: EditorError[]
    blockIdent: string
}): ReactNode {
    const ourErrors = useMemo(() => errors.filter((e: ParseError) => e.location.start.block.type === 'single' && e.location.start.block.ident === blockIdent), [errors, blockIdent])

    return (
        <Editor
            uss={uss.originalCode}
            setUss={(u: string) => {
                const parsed = parseNoErrorAsExpression(u, blockIdent)
                setUss(parsed)
            }}
            autocompleteSymbols={autocompleteSymbols}
            errors={ourErrors}
        />
    )
}

function makeStatements(elements: UrbanStatsASTStatement[]): UrbanStatsASTStatement {
    return {
        type: 'statements',
        result: elements,
        entireLoc: unify(...elements.map(locationOf)),
    }
}

export function TopLevelEditor({
    uss,
    setUss,
    autocompleteSymbols,
    errors,
}: {
    uss: UrbanStatsASTExpression | UrbanStatsASTStatement
    setUss: (u: UrbanStatsASTExpression | UrbanStatsASTStatement) => void
    autocompleteSymbols: string[]
    errors: EditorError[]
}): ReactNode {
    const idPreamble = `${rootBlockIdent}p`
    const idCondition = `${rootBlockIdent}c`
    const idOutput = `${rootBlockIdent}o`
    assert(
        uss.type === 'customNode'
        || (
            uss.type === 'statements'
            && uss.result.length === 2
            && uss.result[0].type === 'expression'
            && uss.result[0].value.type === 'customNode'
            && uss.result[1].type === 'condition'
            && uss.result[1].rest.length === 1
            && uss.result[1].rest[0].type === 'expression'
        ),
    )
    // as checked above, uss is either a custom node or a statements node with a specific structure
    const ussToUse = uss as UrbanStatsASTExpression & { type: 'customNode' } |
        UrbanStatsASTStatement &
        {
            type: 'statements'
            result: [
                UrbanStatsASTStatement & { type: 'expression', value: UrbanStatsASTExpression & { type: 'customNode' } },
                UrbanStatsASTStatement & { type: 'condition', rest: [UrbanStatsASTStatement & { type: 'expression' }] },
            ]
        }
    const subcomponent = (): ReactNode => {
        if (ussToUse.type === 'customNode') {
            return (
                <CustomEditor
                    uss={ussToUse}
                    setUss={setUss}
                    autocompleteSymbols={autocompleteSymbols}
                    errors={errors}
                    blockIdent={rootBlockIdent}
                />
            )
        }
        const conditionIsCustom = ussToUse.result[1].condition.type === 'customNode'

        return (
            <div>
                {/* Preamble */}
                <CustomEditor
                    uss={ussToUse.result[0].value}
                    setUss={(u: UrbanStatsASTExpression) => {
                        const preamble = {
                            type: 'expression',
                            value: u,
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([preamble, ussToUse.result[1]]))
                    }}
                    autocompleteSymbols={autocompleteSymbols}
                    errors={errors}
                    blockIdent={idPreamble}
                />
                {/* Condition */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
                    <CheckboxSettingCustom
                        name="Enable condition"
                        checked={conditionIsCustom}
                        onChange={(checked) => {
                            if (checked) {
                                // Enable condition - keep current condition or set to 'true'
                                const currentCondition = unparse(ussToUse.result[1].condition) ?? 'true'
                                const conditionExpr = parseNoErrorAsExpression(currentCondition, idCondition)
                                const condition = {
                                    type: 'condition',
                                    entireLoc: locationOf(conditionExpr),
                                    condition: conditionExpr,
                                    rest: ussToUse.result[1].rest,
                                } satisfies UrbanStatsASTStatement
                                setUss(makeStatements([ussToUse.result[0], condition]))
                            }
                            else {
                                // Disable condition - set to constant true
                                const conditionExpr = { type: 'identifier', name: { node: 'true', location: emptyLocation(idCondition) } } satisfies UrbanStatsASTExpression
                                const condition = {
                                    type: 'condition',
                                    entireLoc: locationOf(conditionExpr),
                                    condition: conditionExpr,
                                    rest: ussToUse.result[1].rest,
                                } satisfies UrbanStatsASTStatement
                                setUss(makeStatements([ussToUse.result[0], condition]))
                            }
                        }}
                    />
                    {conditionIsCustom && (
                        <>
                            Condition:
                            <CustomEditor
                            // TODO assert that this is a custom node
                                uss={ussToUse.result[1].condition as UrbanStatsASTExpression & { type: 'customNode' }}
                                setUss={(u: UrbanStatsASTExpression) => {
                                    const conditionExpr = parseNoErrorAsExpression(unparse(u) ?? '', idCondition)
                                    const condition = {
                                        type: 'condition',
                                        entireLoc: locationOf(conditionExpr),
                                        condition: conditionExpr,
                                        rest: ussToUse.result[1].rest,
                                    } satisfies UrbanStatsASTStatement
                                    setUss(makeStatements([ussToUse.result[0], condition]))
                                }}
                                autocompleteSymbols={autocompleteSymbols}
                                errors={errors}
                                blockIdent={idCondition}
                            />
                        </>
                    )}
                </div>
                {/* Output */}
                <CustomEditor
                    // TODO this shouldn't be required to be a custom node
                    uss={ussToUse.result[1].rest[0].value as UrbanStatsASTExpression & { type: 'customNode' }}
                    setUss={(u: UrbanStatsASTExpression) => {
                        const output = parseNoErrorAsExpression(unparse(u) ?? '', idOutput)
                        const condition = {
                            type: 'condition',
                            entireLoc: ussToUse.result[1].entireLoc,
                            condition: ussToUse.result[1].condition,
                            rest: [{ type: 'expression', value: output }],
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([ussToUse.result[0], condition]))
                    }}
                    autocompleteSymbols={autocompleteSymbols}
                    errors={errors}
                    blockIdent={idOutput}
                />
            </div>
        )
    }
    return (
        <div>
            <CheckboxSettingCustom
                name="Enable custom script"
                checked={ussToUse.type === 'customNode'}
                onChange={(checked) => {
                    // TODO actually attempt to parse and unparse fully
                    if (checked) {
                        assert(ussToUse.type === 'statements', 'USS should be statements when enabling custom script')
                        setUss(parseNoErrorAsExpression(unparse(ussToUse.result[1].rest[0].value) ?? '', rootBlockIdent))
                    }
                    else {
                        assert(ussToUse.type === 'customNode', 'USS should not be a custom node when disabled')
                        const preamble = {
                            type: 'expression',
                            value: parseNoErrorAsExpression('', idPreamble),
                        } satisfies UrbanStatsASTStatement
                        const conditionExpr = parseNoErrorAsExpression('', idCondition)
                        const output = parseNoErrorAsExpression(ussToUse.originalCode, idOutput)
                        const condition = {
                            type: 'condition',
                            entireLoc: locationOf(conditionExpr),
                            condition: conditionExpr,
                            rest: [{ type: 'expression', value: output }],
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([preamble, condition]))
                    }
                }}
            />
            { subcomponent() }
        </div>
    )
}
