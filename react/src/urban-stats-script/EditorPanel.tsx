import React, { ReactNode, useEffect, useRef, useState } from 'react'

import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'

import { codeStyle, Editor } from './Editor'
import { defaultConstants } from './constants/constants'
import { EditorError, Range } from './editor-utils'
import { parse } from './parser'
import { renderValue, USSValue, USSDocumentedType } from './types-values'
import { executeAsync } from './workerManager'

type Selections = [Range | undefined, Range | undefined]

interface UndoRedoItem { uss: string, selections: Selections }

export function EditorPanel(): ReactNode {
    const [errors, setErrors] = useState<EditorError[]>([])
    const [result, setResult] = useState<USSValue | undefined>(undefined)

    const [uss, setUss] = useState(() => localStorage.getItem('editor-code') ?? '')

    const [selections, setSelections] = useState<Selections>([undefined, undefined])

    const undoStack = useRef<UndoRedoItem[]>([{ uss, selections }])
    const redoStack = useRef<UndoRedoItem[]>([])

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

    useEffect(() => {
        const listener = (e: KeyboardEvent): void => {
            const isMac = navigator.userAgent.includes('Mac')
            if (isMac ? e.key === 'z' && e.metaKey && !e.shiftKey : e.key === 'z' && e.ctrlKey) {
                e.preventDefault()
                // Undo
                if (undoStack.current.length >= 2) {
                    const prevState = undoStack.current[undoStack.current.length - 2]
                    // Prev state becomes current state, current state becomes redo state
                    redoStack.current.push(undoStack.current.pop()!)
                    void updateUss(prevState.uss)
                    setSelections(prevState.selections)
                }
            }
            else if (isMac ? e.key === 'z' && e.metaKey && e.shiftKey : e.key === 'y' && e.ctrlKey) {
                e.preventDefault()
                // Redo
                const futureState = redoStack.current.pop()
                if (futureState !== undefined) {
                    undoStack.current.push(futureState)
                    void updateUss(futureState.uss)
                    setSelections(futureState.selections)
                }
            }
            else if (e.key === 's' && (isMac ? e.metaKey : e.ctrlKey) && e.shiftKey) {
                e.preventDefault()
                const newSelections: Selections = [selections[1], selections[0]]
                setSelections(newSelections)
                undoStack.current[undoStack.current.length - 1].selections = newSelections
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
                    undoStack.current.push({ uss: newUss, selections })
                    redoStack.current = []
                }}
                typeEnvironment={typeEnvironment}
                errors={errors}
                placeholder="Enter Urban Stats Script"
                selection={selections[0]}
                setSelection={(newSelection) => {
                    const newSelections: Selections = [newSelection, selections[1]]
                    setSelections(newSelections)
                    undoStack.current[undoStack.current.length - 1].selections = newSelections
                }}
            />
            <Editor
                uss={uss}
                setUss={(newUss) => {
                    void updateUss(newUss)
                    undoStack.current.push({ uss: newUss, selections })
                    redoStack.current = []
                }}
                typeEnvironment={typeEnvironment}
                errors={errors}
                placeholder="Enter Urban Stats Script"
                selection={selections[1]}
                setSelection={(newSelection) => {
                    const newSelections: Selections = [selections[0], newSelection]
                    setSelections(newSelections)
                    undoStack.current[undoStack.current.length - 1].selections = newSelections
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
