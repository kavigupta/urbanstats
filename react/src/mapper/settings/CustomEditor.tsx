import React, { ReactNode, useMemo } from 'react'

import { Editor } from '../../urban-stats-script/Editor'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { ParseError } from '../../urban-stats-script/parser'
import { USSDocumentedType } from '../../urban-stats-script/types-values'

import { parseNoErrorAsExpression } from './utils'

export function CustomEditor({
    uss,
    setUss,
    typeEnvironment,
    errors,
    blockIdent,
}: {
    uss: UrbanStatsASTExpression & { type: 'customNode' }
    setUss: (u: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    errors: EditorError[]
    blockIdent: string
}): ReactNode {
    const ourErrors = useMemo(() => errors.filter((e: ParseError) => e.location.start.block.type === 'single' && e.location.start.block.ident === blockIdent), [errors, blockIdent])

    return (
        <Editor
            uss={uss.originalCode}
            setUss={(u: string) => {
                const parsed = parseNoErrorAsExpression(u, blockIdent, uss.expectedType)
                setUss(parsed)
            }}
            typeEnvironment={typeEnvironment}
            errors={ourErrors}
        />
    )
}
