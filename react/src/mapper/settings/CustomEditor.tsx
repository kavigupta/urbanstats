import React, { ReactNode, useContext, useMemo } from 'react'

import { urlFromPageDescriptor } from '../../navigation/PageDescriptor'
import { useColors } from '../../page_template/colors'
import { Editor } from '../../urban-stats-script/Editor'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { ParseError, parseNoErrorAsCustomNode } from '../../urban-stats-script/parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { AssignmentsResult } from '../../urban-stats-script/workerManager'

import { ActionOptions } from './EditMapperPanel'
import { SelectionContext } from './SelectionContext'

export function CustomEditor({
    uss,
    setUss,
    typeEnvironment,
    errors,
    blockIdent,
    placeholder,
    assignments,
}: {
    uss: UrbanStatsASTExpression & { type: 'customNode' }
    setUss: (u: UrbanStatsASTExpression & { type: 'customNode' }, o: ActionOptions) => void
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
    blockIdent: string
    placeholder?: string
    assignments: AssignmentsResult
}): ReactNode {
    const ourErrors = useMemo(() => errors.filter((e: ParseError) => e.location.start.block.type === 'single' && e.location.start.block.ident === blockIdent), [errors, blockIdent])

    const selectionContext = useContext(SelectionContext)
    const selection = selectionContext.use()

    return (
        <Editor
            uss={uss.originalCode}
            setUss={(u: string) => {
                const parsed = parseNoErrorAsCustomNode(u, blockIdent, uss.expectedType)
                setUss(parsed, {})
            }}
            typeEnvironment={typeEnvironment}
            results={ourErrors}
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
            assignments={assignments}
        >
            <USSDocumentationButton />
        </Editor>
    )
}

export function USSDocumentationButton(): ReactNode {
    const colors = useColors()
    return (
        <a
            href={urlFromPageDescriptor({ kind: 'ussDocumentation' }).toString()}
            target="_blank"
            rel="noreferrer"
            title="USS Documentation"
            style={{
                position: 'absolute',
                top: '0.4em',
                right: '0.4em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.4em',
                height: '1.4em',
                borderRadius: '4px',
                border: `1px solid ${colors.textMain}`,
                backgroundColor: colors.background,
                color: colors.textMain,
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '0.9em',
                cursor: 'pointer',
                opacity: 0.6,
                userSelect: 'none',
            }}
        >
            ?
        </a>
    )
}
