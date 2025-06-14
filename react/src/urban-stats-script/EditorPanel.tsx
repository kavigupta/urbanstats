import React, { ReactNode, useCallback, useState } from 'react'

import { emptyContext } from '../../unit/urban-stats-script-utils'
import { PageTemplate } from '../page_template/template'

import { Editor } from './Editor'
import { execute } from './interpreter'
import { UrbanStatsASTStatement } from './parser'

export function EditorPanel(): ReactNode {
    const [script, setScript] = useState(localStorage.getItem('editor-code') ?? '')

    const updateScript = useCallback((newScript: string) => {
        setScript(newScript)
        localStorage.setItem('editor-code', newScript)
    }, [])

    const exec = useCallback((expr: UrbanStatsASTStatement) => new Promise((resolve) => {
        setTimeout(resolve, 1000)
    }).then(() => execute(expr, emptyContext())), [])

    return (
        <PageTemplate>
            <Editor
                script={script}
                setScript={updateScript}
                execute={exec}
            />
        </PageTemplate>
    )
}
