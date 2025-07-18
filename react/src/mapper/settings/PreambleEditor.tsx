import React, { ReactNode, useState } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
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
    preamble: UrbanStatsASTExpression & { type: 'customNode' }
    setPreamble: (conditionExpr: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    errors: EditorError[]
    blockIdent: string
}): ReactNode {
    const [showPreamble, setShowPreamble] = useState(preamble.originalCode.trim() !== '')

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
            <CheckboxSettingCustom
                name="Preamble"
                checked={showPreamble}
                onChange={(checked) => {
                    // Enable/disable preamble
                    const preambleExpr = parseNoErrorAsExpression('', blockIdent)
                    setPreamble(preambleExpr)
                    setShowPreamble(checked)
                }}
            />
            {showPreamble && (
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
