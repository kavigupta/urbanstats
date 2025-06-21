import React, { ReactNode, useCallback, useMemo } from 'react'

import { PageTemplate } from '../page_template/template'

import { Editor } from './Editor'
import { defaultConstants } from './constants/constants'
import { USSExecutionDescriptor } from './workerManager'

export function EditorPanel(): ReactNode {
    const updateScript = useCallback((newScript: string) => {
        localStorage.setItem('editor-code', newScript)
    }, [])

    const getScript = useCallback(() => {
        return localStorage.getItem('editor-code') ?? ''
    }, [])

    const autocompleteSymbols = useMemo(() => Array.from(defaultConstants.keys()), [])

    const executionDescriptor = useMemo<USSExecutionDescriptor>(() => ({ kind: 'generic' }), [])

    return (
        <PageTemplate>
            <Editor
                getScript={getScript}
                setScript={updateScript}
                executionDescriptor={executionDescriptor}
                autocompleteSymbols={autocompleteSymbols}
                showOutput={true}
            />
        </PageTemplate>
    )
}
