import React, { ReactNode, useEffect, useState } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { locationOf } from '../../urban-stats-script/ast'
import type { AutoUXNodeMetadata } from '../../urban-stats-script/autoux-node-metadata'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { parseNoErrorAsCustomNode } from '../../urban-stats-script/parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'

import { CustomEditor } from './CustomEditor'
import { type PreambleCustomNode, type PreambleNode, type PreambleAutoUXNode } from './map-uss'

function shouldShowPreamble(preamble: PreambleNode): boolean {
    if (preamble.type === 'autoUXNode') {
        return (preamble.expr.originalCode.trim() !== '') || (preamble.metadata.forceUncollapsed ?? false)
    }
    return preamble.originalCode.trim() !== ''
}

export function PreambleEditor({
    preamble,
    setPreamble,
    typeEnvironment,
    errors,
    blockIdent,
}: {
    preamble: PreambleNode
    setPreamble: (value: PreambleNode) => void
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
    blockIdent: string
}): ReactNode {
    return (
        <div style={{ margin: '0.5em 0' }}>
            <CheckboxSettingCustom
                name="Preamble"
                checked={shouldShowPreamble(preamble)}
                onChange={(checked) => {
                    const expr: PreambleCustomNode = preamble.type === 'autoUXNode' ? preamble.expr : preamble
                    const meta: AutoUXNodeMetadata = preamble.type === 'autoUXNode' ? preamble.metadata : {}
                    setPreamble(checked
                        ? preambleAsAutoUXNode(expr, { ...meta, forceUncollapsed: true })
                        : parseNoErrorAsCustomNode('', blockIdent))
                }}
            />
            {shouldShowPreamble(preamble) && (
                <CustomEditor
                    uss={preamble.type === 'autoUXNode' ? preamble.expr : preamble}
                    setUss={(newExpr) => {
                        setPreamble(preamble.type === 'autoUXNode'
                            ? { ...preamble, expr: newExpr } satisfies PreambleAutoUXNode
                            : newExpr)
                    }}
                    typeEnvironment={typeEnvironment}
                    errors={errors}
                    blockIdent={blockIdent}
                    placeholder="Variables here can be used by all custom expressions."
                />
            )}
        </div>
    )
}

/** Wrap a customNode in autoUXNode to persist metadata (e.g. forceUncollapsed). Same pattern as AutoUXEditor for collapsed. */
function preambleAsAutoUXNode(expr: PreambleCustomNode, metadata: AutoUXNodeMetadata = {}): PreambleAutoUXNode {
    return {
        type: 'autoUXNode',
        expr,
        metadata,
        entireLoc: locationOf(expr),
    }
}
