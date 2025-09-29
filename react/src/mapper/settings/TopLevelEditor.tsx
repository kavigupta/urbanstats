import assert from 'assert'

import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { DisplayResults } from '../../urban-stats-script/Editor'
import { locationOf, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { unparse, parseNoErrorAsCustomNode } from '../../urban-stats-script/parser'
import { TypeEnvironment, USSDocumentedType, USSType } from '../../urban-stats-script/types-values'

import { AutoUXEditor, parseExpr } from './AutoUXEditor'
import { ConditionEditor } from './ConditionEditor'
import { CustomEditor } from './CustomEditor'
import { PreambleEditor } from './PreambleEditor'
import { makeStatements } from './utils'

const cMap = { type: 'opaque', name: 'cMap', allowCustomExpression: false } satisfies USSType
const pMap = { type: 'opaque', name: 'pMap', allowCustomExpression: false } satisfies USSType

export const validMapperOutputs = [cMap, pMap] satisfies USSType[]

export const rootBlockIdent = 'r'
const idPreamble = `${rootBlockIdent}p`
const idCondition = `${rootBlockIdent}c`
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

export function TopLevelEditor({
    uss,
    setUss,
    typeEnvironment,
    errors,
}: {
    uss: MapUSS
    setUss: (u: MapUSS) => void
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
}): ReactNode {
    const subcomponent = (): ReactNode => {
        if (uss.type === 'customNode') {
            return (
                <CustomEditor
                    uss={uss}
                    setUss={setUss}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={rootBlockIdent}
                />
            )
        }

        return (
            <div>
                {/* Preamble */}
                <PreambleEditor
                    preamble={uss.result[0].value}
                    setPreamble={(u: UrbanStatsASTExpression & { type: 'customNode' }) => {
                        const preamble = {
                            type: 'expression',
                            value: u,
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([preamble, uss.result[1]]))
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={idPreamble}
                />
                {/* Condition */}
                <ConditionEditor
                    condition={uss.result[1].condition}
                    setCondition={(newConditionExpr) => {
                        const conditionStatement = {
                            type: 'condition',
                            entireLoc: locationOf(newConditionExpr),
                            condition: newConditionExpr,
                            rest: uss.result[1].rest,
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([uss.result[0], conditionStatement]))
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={idCondition}
                />
                {/* Output */}
                <AutoUXEditor
                    uss={uss.result[1].rest[0].value}
                    setUss={(u: UrbanStatsASTExpression) => {
                        const condition = {
                            type: 'condition',
                            entireLoc: uss.result[1].entireLoc,
                            condition: uss.result[1].condition,
                            rest: [{ type: 'expression', value: u }] as const,
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([uss.result[0], condition]))
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={idOutput}
                    type={validMapperOutputs}
                    labelWidth="0px"
                />
            </div>
        )
    }
    return (
        <div>
            <div style={{ margin: '0.5em 0px' }} />
            <CheckboxSettingCustom
                name="Enable custom script"
                checked={uss.type === 'customNode'}
                onChange={(checked) => {
                    if (checked) {
                        assert(uss.type === 'statements', 'USS should be statements when enabling custom script')
                        setUss(parseNoErrorAsCustomNode(unparse(uss, { simplify: true }), rootBlockIdent))
                    }
                    else {
                        assert(uss.type === 'customNode', 'USS should not be a custom node when disabled')
                        setUss(attemptParseAsTopLevel(uss.expr, typeEnvironment, false))
                    }
                }}
            />
            { subcomponent() }
            <DisplayResults
                editor={false}
                results={errors.filter(e => e.location.start.block.type === 'multi')}
            />
        </div>
    )
}

export function attemptParseAsTopLevel(stmt: MapUSS | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment, preserveCustomNodes: boolean): MapUSS {
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
    const body = parseExpr(makeStatements(conditionRest, idOutput), idOutput, validMapperOutputs, typeEnvironment, parseNoErrorAsCustomNode, preserveCustomNodes)
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
