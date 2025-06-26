import assert from 'assert'

import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { locationOf, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { unparse } from '../../urban-stats-script/parser'

import { ConditionEditor } from './ConditionEditor'
import { CustomEditor } from './CustomEditor'
import { makeStatements, parseNoErrorAsExpression, rootBlockIdent } from './utils'

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
                    autocompleteSymbols={autocompleteSymbols}
                    errors={errors}
                    blockIdent={idCondition}
                />
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
