import React, { ReactNode, useCallback, useMemo, useState } from 'react'

import { PageTemplate } from '../page_template/template'

import { Editor2 } from './Editor2'
import { defaultConstants } from './constants/constants'
import { EditorError } from './editor-utils-2'
import { parse } from './parser'
import { executeAsync } from './workerManager'

export function EditorPanel(): ReactNode {
    const [errors, setErrors] = useState<EditorError[]>([])

    const updateScript = useCallback(async (newScript: string) => {
        localStorage.setItem('editor-code', newScript)

        const stmts = parse(newScript, { type: 'single', ident: 'editor-panel' })

        if (stmts.type === 'error') {
            setErrors(stmts.errors)
            return
        }

        const result = await executeAsync({ descriptor: { kind: 'generic' }, stmts })
        if (!result.success) {
            setErrors([result.error])
        }
        else {
            setErrors([])
        }
    }, [])

    const getScript = useCallback(() => {
        return localStorage.getItem('editor-code') ?? ''
    }, [])

    const autocompleteSymbols = useMemo(() => Array.from(defaultConstants.keys()), [])

    return (
        <PageTemplate>
            <Editor2
                getScript={getScript}
                setScript={updateScript}
                autocompleteSymbols={autocompleteSymbols}
                errors={errors}
            />
        </PageTemplate>
    )
}
