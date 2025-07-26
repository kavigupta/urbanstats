import React, { ReactNode, useCallback, useMemo, useState } from 'react'

import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'

import { codeStyle, Editor } from './Editor'
import { defaultConstants } from './constants/constants'
import { EditorError } from './editor-utils'
import { parse } from './parser'
import { renderValue, USSValue, USSDocumentedType } from './types-values'
import { executeAsync } from './workerManager'

export function EditorPanel(): ReactNode {
    const [errors, setErrors] = useState<EditorError[]>([])
    const [result, setResult] = useState<USSValue | undefined>(undefined)

    const updateUss = useCallback(async (newScript: string) => {
        localStorage.setItem('editor-code', newScript)

        const stmts = parse(newScript, { type: 'single', ident: 'editor-panel' })

        if (stmts.type === 'error') {
            setErrors(stmts.errors.map(e => ({ ...e, level: 'error' })))
            setResult(undefined)
            return
        }

        const exec = await executeAsync({ descriptor: { kind: 'generic' }, stmts })
        setResult(exec.resultingValue)
        setErrors(exec.error)
    }, [])

    const uss = useMemo(() => {
        return localStorage.getItem('editor-code') ?? ''
    }, [])

    const typeEnvironment = useMemo(() => {
        return defaultConstants as Map<string, USSDocumentedType>
    }, [])

    const colors = useColors()

    return (
        <PageTemplate>
            <Editor
                uss={uss}
                setUss={updateUss}
                typeEnvironment={typeEnvironment}
                errors={errors}
                placeholder="Enter Urban Stats Script"
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
