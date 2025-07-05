import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { unparse } from '../../urban-stats-script/parser'
import { USSDocumentedType } from '../../urban-stats-script/types-values'

import { CustomEditor } from './CustomEditor'
import { parseNoErrorAsExpression } from '../../urban-stats-script/parser'

export function ConditionEditor({
    condition,
    setCondition,
    typeEnvironment,
    errors,
    blockIdent,
}: {
    condition: UrbanStatsASTExpression
    setCondition: (conditionExpr: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    errors: EditorError[]
    blockIdent: string
}): ReactNode {
    const conditionIsCustom = condition.type === 'customNode'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
            <CheckboxSettingCustom
                name="Filter?"
                checked={conditionIsCustom}
                onChange={(checked) => {
                    if (checked) {
                        // Enable condition - keep current condition or set to 'true'
                        const currentCondition = unparse(condition) || 'true'
                        const conditionExpr = parseNoErrorAsExpression(currentCondition, blockIdent, { type: 'boolean' })
                        setCondition(conditionExpr)
                    }
                    else {
                        // Disable condition - set to constant true
                        const conditionExpr = { type: 'identifier', name: { node: 'true', location: emptyLocation(blockIdent) } } satisfies UrbanStatsASTExpression
                        setCondition(conditionExpr)
                    }
                }}
            />
            {conditionIsCustom && (
                <CustomEditor
                    uss={condition as UrbanStatsASTExpression & { type: 'customNode' }}
                    setUss={setCondition}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={blockIdent}
                />
            )}
        </div>
    )
}
