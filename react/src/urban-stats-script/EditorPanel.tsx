import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'

import { codeStyle, Editor } from './Editor'
import { defaultConstants } from './constants/constants'
import { EditorError, Range } from './editor-utils'
import { parse } from './parser'
import { renderValue, USSValue, USSDocumentedType } from './types-values'
import { executeAsync } from './workerManager'

export function EditorPanel(): ReactNode {
    const [errors, setErrors] = useState<EditorError[]>([])
    const [result, setResult] = useState<USSValue | undefined>(undefined)

    const [uss, setUss] = useState(() => localStorage.getItem('editor-code') ?? '')

    const [selections, setSelections] = useState<[Range | undefined, Range | undefined]>([undefined, undefined])

    useEffect(() => {
        const listener = (e: KeyboardEvent): void => {
            if (e.key === 's' && e.metaKey && e.shiftKey) {
                e.preventDefault()
                setSelections(s => [s[1], s[0]])
            }
        }
        window.addEventListener('keydown', listener)
        return () => { window.removeEventListener('keydown', listener) }
    }, [])

    const updateUss = async (newScript: string): Promise<void> => {
        setUss(newScript)
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
    }

    const typeEnvironment = defaultConstants as Map<string, USSDocumentedType>

    const colors = useColors()

    return (
        <PageTemplate>
            {/* Most props to the editors are purposely not memoized for testing purposes. */}
            <Editor
                uss={uss}
                setUss={updateUss}
                typeEnvironment={typeEnvironment}
                errors={errors}
                placeholder="Enter Urban Stats Script"
                selection={selections[0]}
                setSelection={(newSelection) => {
                    setSelections(s => [newSelection, s[1]])
                }}
            />
            <Editor
                uss={uss}
                setUss={updateUss}
                typeEnvironment={typeEnvironment}
                errors={errors}
                placeholder="Enter Urban Stats Script"
                selection={selections[1]}
                setSelection={(newSelection) => {
                    setSelections(s => [s[0], newSelection])
                }}
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
