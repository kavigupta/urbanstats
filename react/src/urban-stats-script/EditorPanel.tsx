import React, { ReactNode, useEffect, useState } from 'react'

import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'

import { codeStyle, Editor } from './Editor'
import { defaultConstants } from './constants/constants'
import { EditorError, Range, useUndoRedo } from './editor-utils'
import { parse } from './parser'
import { renderValue, USSValue, USSDocumentedType } from './types-values'
import { executeAsync } from './workerManager'

type Selections = [Range | undefined, Range | undefined]

export function EditorPanel(): ReactNode {
    const [errors, setErrors] = useState<EditorError[]>([])
    const [result, setResult] = useState<USSValue | undefined>(undefined)

    const [uss, setUss] = useState(() => localStorage.getItem('editor-code') ?? '')

    const [selections, setSelections] = useState<Selections>([undefined, undefined])

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

    const { addState, updateCurrentSelection } = useUndoRedo(
        uss,
        selections,
        updateUss,
        setSelections,
    )

    useEffect(() => {
        const listener = (e: KeyboardEvent): void => {
            const isMac = navigator.userAgent.includes('Mac')
            if (e.key === 's' && (isMac ? e.metaKey : e.ctrlKey) && e.shiftKey) {
                e.preventDefault()
                const newSelections: Selections = [selections[1], selections[0]]
                setSelections(newSelections)
                updateCurrentSelection(newSelections)
            }
        }
        window.addEventListener('keydown', listener)
        return () => { window.removeEventListener('keydown', listener) }
    })

    const typeEnvironment = defaultConstants as Map<string, USSDocumentedType>

    const colors = useColors()

    return (
        <PageTemplate>
            {/* Most props to the editors are purposely not memoized for testing purposes. */}
            <Editor
                uss={uss}
                setUss={(newUss) => {
                    void updateUss(newUss)
                    addState(newUss, selections)
                }}
                typeEnvironment={typeEnvironment}
                errors={errors}
                placeholder="Enter Urban Stats Script"
                selection={selections[0]}
                setSelection={(newSelection) => {
                    const newSelections: Selections = [newSelection, selections[1]]
                    setSelections(newSelections)
                    updateCurrentSelection(newSelections)
                }}
            />
            <Editor
                uss={uss}
                setUss={(newUss) => {
                    void updateUss(newUss)
                    addState(newUss, selections)
                }}
                typeEnvironment={typeEnvironment}
                errors={errors}
                placeholder="Enter Urban Stats Script"
                selection={selections[1]}
                setSelection={(newSelection) => {
                    const newSelections: Selections = [selections[0], newSelection]
                    setSelections(newSelections)
                    updateCurrentSelection(newSelections)
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
