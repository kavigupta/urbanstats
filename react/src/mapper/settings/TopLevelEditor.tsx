import assert from 'assert'

import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { DisplayResults } from '../../urban-stats-script/Editor'
import { locationOf, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { unparse, parseNoErrorAsCustomNode } from '../../urban-stats-script/parser'
import { TypeEnvironment, USSType, USSValue } from '../../urban-stats-script/types-values'

import { AutoUXEditor } from './AutoUXEditor'
import { ConditionEditor } from './ConditionEditor'
import { CustomEditor } from './CustomEditor'
import { ActionOptions } from './EditMapperPanel'
import { PreambleEditor } from './PreambleEditor'
import { MapUSS, makeStatements, idOutput, idCondition, idPreamble, rootBlockIdent, attemptParseAsTopLevel, type PreambleNode } from './map-uss'

export function TopLevelEditor({
    uss,
    setUss,
    typeEnvironment,
    errors,
    targetOutputTypes,
    context,
}: {
    uss: MapUSS
    setUss: (u: MapUSS, o: ActionOptions) => void
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
    targetOutputTypes: USSType[]
    context: Map<string, USSValue>
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
                    context={context}
                />
            )
        }

        return (
            <div>
                {/* Preamble */}
                <PreambleEditor
                    preamble={uss.result[0].value}
                    setPreamble={(u: PreambleNode) => {
                        const preamble = {
                            type: 'expression',
                            value: u,
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([preamble, uss.result[1]]), {})
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={idPreamble}
                    context={context}
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
                        setUss(makeStatements([uss.result[0], conditionStatement]), {})
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={idCondition}
                    context={context}
                />
                {/* Output */}
                <AutoUXEditor
                    uss={uss.result[1].rest[0].value}
                    setUss={(u: UrbanStatsASTExpression, options: ActionOptions) => {
                        const condition = {
                            type: 'condition',
                            entireLoc: uss.result[1].entireLoc,
                            condition: uss.result[1].condition,
                            rest: [{ type: 'expression', value: u }] as const,
                        } satisfies UrbanStatsASTStatement
                        setUss(makeStatements([uss.result[0], condition]), options)
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={idOutput}
                    type={targetOutputTypes}
                    labelWidth="0px"
                    context={context}
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
                        setUss(parseNoErrorAsCustomNode(unparse(uss, { simplify: 'auto-ux' }), rootBlockIdent), {})
                    }
                    else {
                        assert(uss.type === 'customNode', 'USS should not be a custom node when disabled')
                        setUss(attemptParseAsTopLevel(uss.expr, typeEnvironment, false, targetOutputTypes), {})
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
