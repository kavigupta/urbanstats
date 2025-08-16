import React, { ReactNode, useEffect } from 'react'

import { PageTemplate } from '../page_template/template'

import { Editor } from './Editor'
import { useStandaloneEditorState } from './StandaloneEditor'
import { Range } from './editor-utils'

type Selections = [Range | null, Range | null]

/**
 * This panel used for developing + debugging editor functionality.
 */
export function DebugEditorPanel(): ReactNode {
    const { uss, setUss, typeEnvironment, results, selection, setSelection } = useStandaloneEditorState<Selections>({
        ident: 'editor-panel',
        getCode: () => localStorage.getItem('editor-code') ?? '',
        onChange: (newScript) => { localStorage.setItem('editor-code', newScript) },
        getSelection: () => [null, null],
        undoRedoOptions: {},
    })

    useEffect(() => {
        const listener = (e: KeyboardEvent): void => {
            const isMac = navigator.userAgent.includes('Mac')
            if (e.key === 's' && (isMac ? e.metaKey : e.ctrlKey) && e.shiftKey) {
                e.preventDefault()
                setSelection([selection[1], selection[0]])
            }
            if (e.key === 'd' && (isMac ? e.metaKey : e.ctrlKey) && e.shiftKey) {
                e.preventDefault()
                setSelection([null, null])
            }
        }
        window.addEventListener('keydown', listener)
        return () => { window.removeEventListener('keydown', listener) }
    })

    return (
        <PageTemplate>
            <div id="test-editor-panel">
                {/* Most props to the editors are purposely not memoized for testing purposes. */}
                <Editor
                    uss={uss}
                    setUss={setUss}
                    typeEnvironment={typeEnvironment}
                    results={[]}
                    placeholder="Enter Urban Stats Script"
                    selection={selection[0]}
                    setSelection={(newSelection) => {
                        setSelection([newSelection, selection[1]])
                    }}
                />
                <Editor
                    uss={uss}
                    setUss={setUss}
                    typeEnvironment={typeEnvironment}
                    results={results}
                    placeholder="Enter Urban Stats Script"
                    selection={selection[1]}
                    setSelection={(newSelection) => {
                        setSelection([selection[0], newSelection])
                    }}
                />
            </div>
        </PageTemplate>
    )
}
