import assert from 'assert'

import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { DisplayErrors } from '../../urban-stats-script/Editor'
import { locationOf, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { unparse, parseNoErrorAsCustomNode } from '../../urban-stats-script/parser'
import { USSDocumentedType } from '../../urban-stats-script/types-values'

import { AutoUXEditor, parseExpr } from './AutoUXEditor'
import { ConditionEditor } from './ConditionEditor'
import { CustomEditor } from './CustomEditor'
import { PreambleEditor } from './PreambleEditor'
import { makeStatements } from './utils'

export const rootBlockIdent = 'r'
const idPreamble = `${rootBlockIdent}p`
const idCondition = `${rootBlockIdent}c`
const idOutput = `${rootBlockIdent}o`

export function TopLevelEditor({
    uss,
    setUss,
    typeEnvironment,
    errors,
}: {
    uss: UrbanStatsASTExpression | UrbanStatsASTStatement
    setUss: (u: UrbanStatsASTExpression | UrbanStatsASTStatement) => void
    typeEnvironment: Map<string, USSDocumentedType>
    errors: EditorError[]
}): ReactNode {
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
                    preamble={ussToUse.result[0].value}
                    setPreamble={(u: UrbanStatsASTExpression) => {
                        const preamble = {
                            type: 'expression',
                            value: u,
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([preamble, ussToUse.result[1]]))
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={idPreamble}
                />
                {/* Condition */}
                <ConditionEditor
                    condition={ussToUse.result[1].condition}
                    setCondition={(newConditionExpr) => {
                        const conditionStatement = {
                            type: 'condition',
                            entireLoc: locationOf(newConditionExpr),
                            condition: newConditionExpr,
                            rest: ussToUse.result[1].rest,
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([ussToUse.result[0], conditionStatement]))
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={idCondition}
                />
                {/* Output */}
                <AutoUXEditor
                    // TODO this shouldn't be required to be a custom node
                    uss={ussToUse.result[1].rest[0].value}
                    setUss={(u: UrbanStatsASTExpression) => {
                        const condition = {
                            type: 'condition',
                            entireLoc: ussToUse.result[1].entireLoc,
                            condition: ussToUse.result[1].condition,
                            rest: [{ type: 'expression', value: u }],
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([ussToUse.result[0], condition]))
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={idOutput}
                    type={[{ type: 'opaque', name: 'cMap' }, { type: 'opaque', name: 'pMap' }]}
                    labelWidth="0px"
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
                    if (checked) {
                        assert(ussToUse.type === 'statements', 'USS should be statements when enabling custom script')
                        setUss(parseNoErrorAsCustomNode(unparse(ussToUse), rootBlockIdent))
                    }
                    else {
                        assert(ussToUse.type === 'customNode', 'USS should not be a custom node when disabled')
                        setUss(attemptParseAsTopLevel(ussToUse.expr, typeEnvironment))
                    }
                }}
                style={{ margin: '0.5em 0' }}
            />
            { subcomponent() }
            <DisplayErrors
                errors={errors.filter(e => e.location.start.block.type === 'multi')}
            />
        </div>
    )
}

function attemptParseAsTopLevel(stmt: UrbanStatsASTStatement, typeEnvironment: Map<string, USSDocumentedType>): UrbanStatsASTStatement {
    /**
     * Splits up the statements into a preamble and a condition statement. Make the body of the condition a custom node.
     */
    const stmts = stmt.type === 'statements' ? stmt.result : [stmt]
    const preamble = {
        type: 'statements',
        result: stmts.slice(0, -1),
        entireLoc: locationOf(stmt),
    } satisfies UrbanStatsASTStatement
    const conditionStmt = stmts.length > 0 ? stmts[stmts.length - 1] : undefined
    let conditionExpr: UrbanStatsASTExpression
    let conditionRest: UrbanStatsASTStatement[]
    if (conditionStmt?.type === 'condition') {
        conditionExpr = parseNoErrorAsCustomNode(unparse(conditionStmt.condition), idCondition, [{ type: 'vector', elementType: { type: 'boolean' } }])
        conditionRest = conditionStmt.rest
    }
    else {
        conditionExpr = { type: 'identifier', name: { node: 'true', location: emptyLocation(idCondition) } } satisfies UrbanStatsASTExpression
        conditionRest = conditionStmt !== undefined ? [conditionStmt] : []
    }
    const body = parseExpr(makeStatements(conditionRest, idOutput), idOutput, { type: 'opaque', name: 'cMap' }, typeEnvironment, parseNoErrorAsCustomNode)
    const condition = {
        type: 'condition',
        entireLoc: locationOf(conditionExpr),
        condition: conditionExpr,
        rest: [{ type: 'expression', value: body }],
    } satisfies UrbanStatsASTStatement
    return {
        type: 'statements',
        result: [
            { type: 'expression', value: parseNoErrorAsCustomNode(unparse(preamble), idPreamble) },
            condition,
        ],
        entireLoc: locationOf(stmt),
    } satisfies UrbanStatsASTStatement
}

export function defaultTopLevelEditor(typeEnvironment: Map<string, USSDocumentedType>): UrbanStatsASTStatement {
    const expr = parseNoErrorAsCustomNode('cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', rootBlockIdent, [{ type: 'opaque', name: 'pMap' }, { type: 'opaque', name: 'cMap' }])
    assert(expr.type === 'customNode', 'expr should be a custom node')
    return attemptParseAsTopLevel(expr.expr, typeEnvironment)
}
