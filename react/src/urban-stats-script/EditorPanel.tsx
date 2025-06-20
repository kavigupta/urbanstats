import React, { ReactNode, useCallback, useMemo, useState } from 'react'

import { PageTemplate } from '../page_template/template'

import { Editor } from './Editor'
import { defaultConstants } from './constants/constants'
import { USSExecutionDescriptor } from './workerManager'

export function EditorPanel(): ReactNode {
    const [script, setScript] = useState(localStorage.getItem('editor-code') ?? '')

    const updateScript = useCallback((newScript: string) => {
        setScript(newScript)
        localStorage.setItem('editor-code', newScript)
    }, [])

    const autocompleteSymbols = useMemo(() => Array.from(Object.keys(defaultConstants)), [])

    const executionDescriptor = useMemo<USSExecutionDescriptor>(() => ({ kind: 'generic' }), [])

    return (
        <PageTemplate>
            <Editor
                script={script}
                setScript={updateScript}
                executionDescriptor={executionDescriptor}
                autocompleteSymbols={autocompleteSymbols}
            />
        </PageTemplate>
    )
}
