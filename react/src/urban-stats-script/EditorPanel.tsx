import React, { ReactNode, useCallback, useMemo, useState } from 'react'

import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'

import { codeStyle, Editor2 } from './Editor2'
import { defaultConstants } from './constants/constants'
import { EditorError } from './editor-utils-2'
import { parse } from './parser'
import { renderValue, USSValue } from './types-values'
import { executeAsync } from './workerManager'

export function EditorPanel(): ReactNode {
    const [errors, setErrors] = useState<EditorError[]>([])
    const [result, setResult] = useState<USSValue | undefined>(undefined)

    const updateScript = useCallback(async (newScript: string) => {
        localStorage.setItem('editor-code', newScript)

        const stmts = parse(newScript, { type: 'single', ident: 'editor-panel' })

        if (stmts.type === 'error') {
            setErrors(stmts.errors)
            setResult(undefined)
            return
        }

        const exec = await executeAsync({ descriptor: { kind: 'generic' }, stmts })
        if (!exec.success) {
            setResult(undefined)
            setErrors([exec.error])
        }
        else {
            setResult(exec.value)
            setErrors([])
        }
    }, [])

    const getScript = useCallback(() => {
        return localStorage.getItem('editor-code') ?? ''
    }, [])

    const autocompleteSymbols = useMemo(() => Array.from(defaultConstants.keys()), [])

    const colors = useColors()

    return (
        <PageTemplate>
            <Editor2
                getScript={getScript}
                setScript={updateScript}
                autocompleteSymbols={autocompleteSymbols}
                errors={errors}
            />
            { result === undefined
                ? null
                : (
                        <div style={{ margin: '2em' }}>
                            <pre style={{
                                ...codeStyle,
                                borderRadius: '5px',
                                backgroundColor: colors.slightlyDifferentBackground,
                                border: `2px solid ${colors.hueColors.green}`,
                            }}
                            >
                                {renderValue(result)}
                            </pre>
                        </div>
                    )}
        </PageTemplate>
    )
}
