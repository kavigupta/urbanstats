/**
 * Typically an Editor is connected to another system (e.g. the mapper) that manages its state.
 * This Editor mostly manages its own state, and presents its own result.
 */

import React, { ReactNode, useEffect, useRef, useState } from 'react'

import { Editor } from './Editor'
import { defaultConstants } from './constants/constants'
import { EditorResult, Range, UndoRedoOptions, useUndoRedo } from './editor-utils'
import { parse } from './parser'
import { USSDocumentedType } from './types-values'
import { executeAsync } from './workerManager'

export function StandaloneEditor(props: { ident: string, getCode: () => string, onChange?: (code: string) => void }): ReactNode {
    const editorRef = useRef<HTMLPreElement | null>(null)

    const { uss, setUss, typeEnvironment, results, selection, setSelection } = useStandaloneEditorState<Range | null>({
        ...props,
        getSelection: () => null,
        undoRedoOptions: { onlyElement: editorRef },
    })

    return (
        <div id="test-editor-panel">
            <Editor
                uss={uss}
                setUss={setUss}
                typeEnvironment={typeEnvironment}
                results={results}
                placeholder="Enter Urban Stats Script"
                selection={selection}
                setSelection={setSelection}
                ref={editorRef}
            />
        </div>
    )
}

export function useStandaloneEditorState<Selection>({ ident, getCode, onChange, getSelection, undoRedoOptions }: {
    ident: string
    getCode: () => string
    onChange?: (code: string) => void
    getSelection: () => Selection
    undoRedoOptions: UndoRedoOptions
}): {
        uss: string
        setUss: (newUss: string) => void
        typeEnvironment: Map<string, USSDocumentedType>
        results: EditorResult[]
        selection: Selection
        setSelection: (newSelection: Selection) => void
    } {
    const [results, setResults] = useState<EditorResult[]>([])

    const [uss, setUss] = useState(getCode)
    const ussVersion = useRef(0)

    const [selection, setSelection] = useState<Selection>(getSelection)

    const updateUss = async (newScript: string): Promise<void> => {
        setUss(newScript)
        const version = ++ussVersion.current
        onChange?.(newScript)

        const stmts = parse(newScript, { type: 'single', ident })

        if (stmts.type === 'error') {
            setResults(stmts.errors.map(e => ({ ...e, kind: 'error' })))
            return
        }

        const exec = await executeAsync({ descriptor: { kind: 'generic' }, stmts })

        if (version === ussVersion.current) {
            // avoid race conditions
            setResults([
                ...(exec.resultingValue !== undefined ? [{ kind: 'success' as const, result: exec.resultingValue }] : []),
                ...exec.error,
            ])
        }
    }

    const { addState, updateCurrentSelection } = useUndoRedo(
        uss,
        selection,
        updateUss,
        setSelection,
        undoRedoOptions,
    )

    useEffect(
        () => {
            void updateUss(getCode())
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once at beginning
        [],
    )

    const typeEnvironment = defaultConstants as Map<string, USSDocumentedType>

    return {
        uss,
        setUss: (newUss) => {
            void updateUss(newUss)
            addState(newUss, selection)
        },
        setSelection: (newSelection) => {
            setSelection(newSelection)
            updateCurrentSelection(newSelection)
        },
        typeEnvironment,
        selection,
        results,
    }
}
