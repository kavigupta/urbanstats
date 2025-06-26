import React, { ReactNode } from 'react'

import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { USSDocumentedType, USSType } from '../../urban-stats-script/types-values'

import { CustomEditor } from './CustomEditor'

export function AutoUXEditor(props: {
    uss: UrbanStatsASTExpression
    setUss: (u: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    errors: EditorError[]
    blockIdent: string
    type: USSType
}): ReactNode {
    return (
        <CustomEditor
            uss={props.uss as UrbanStatsASTExpression & { type: 'customNode' }}
            setUss={props.setUss}
            typeEnvironment={props.typeEnvironment}
            errors={props.errors}
            blockIdent={props.blockIdent}
        />
    )
}
