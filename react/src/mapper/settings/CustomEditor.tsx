import React, { ReactNode, useContext, useMemo } from 'react'

import { Editor } from '../../urban-stats-script/Editor'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { ParseError, parseNoErrorAsCustomNode } from '../../urban-stats-script/parser'
import { USSDocumentedType } from '../../urban-stats-script/types-values'

import { SelectionContext } from './SelectionContext'

export function CustomEditor({
    uss,
    setUss,
    typeEnvironment,
    errors,
    blockIdent,
    placeholder,
}: {
    uss: UrbanStatsASTExpression & { type: 'customNode' }
    setUss: (u: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    errors: EditorError[]
    blockIdent: string
    placeholder?: string
}): ReactNode {
    const ourErrors = useMemo(() => errors.filter((e: ParseError) => e.location.start.block.type === 'single' && e.location.start.block.ident === blockIdent), [errors, blockIdent])

    const selectionContext = useContext(SelectionContext)
    const selection = selectionContext.use()

    return (
        <Editor
            uss={uss.originalCode}
            setUss={(u: string) => {
                const parsed = parseNoErrorAsCustomNode(u, blockIdent, uss.expectedType)
                setUss(parsed)
            }}
            typeEnvironment={typeEnvironment}
            errors={ourErrors}
            placeholder={placeholder}
            selection={selection?.blockIdent === blockIdent ? selection.range : null}
            setSelection={(range) => {
                if (range !== null) {
                    selectionContext.value = { blockIdent, range }
                }
                else if (selectionContext.value?.blockIdent === blockIdent) {
                    selectionContext.value = undefined
                }
            }}
        />
    )
}
