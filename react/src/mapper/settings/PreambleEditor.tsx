import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { parseNoErrorAsExpression } from '../../urban-stats-script/parser'
import { USSDocumentedType } from '../../urban-stats-script/types-values'

import { CustomEditor } from './CustomEditor'

export function PreambleEditor({
    preamble,
    setPreamble,
    typeEnvironment,
    errors,
    blockIdent,
}: {
    preamble: UrbanStatsASTExpression
    setPreamble: (conditionExpr: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    errors: EditorError[]
    blockIdent: string
}): ReactNode {
    const preambleExists = preamble.type === 'customNode'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
            <CheckboxSettingCustom
                name="Preamble"
                checked={preambleExists}
                onChange={(checked) => {
                    if (checked) {
                        // Enable preamble
                        const preambleExpr = parseNoErrorAsExpression('', blockIdent)
                        setPreamble(preambleExpr)
                    }
                    else {
                        // Disable preamble - set to empty do
                        const conditionExpr = { type: 'do', entireLoc: emptyLocation(blockIdent), statements: [] } satisfies UrbanStatsASTExpression
                        setPreamble(conditionExpr)
                    }
                }}
            />
            {preambleExists && (
                <CustomEditor
                    uss={preamble as UrbanStatsASTExpression & { type: 'customNode' }}
                    setUss={setPreamble}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={blockIdent}
                    placeholder="Variables here can be used by all custom expressions."
                />
            )}
        </div>
    )
}
