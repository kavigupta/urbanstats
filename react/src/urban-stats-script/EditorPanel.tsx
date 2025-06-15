import React, { ReactNode, useCallback, useState } from 'react'

import { emptyContext } from '../../unit/urban-stats-script-utils'
import { PageTemplate } from '../page_template/template'

import { Editor } from './Editor'
import { execute } from './interpreter'

export function EditorPanel(): ReactNode {
    const [script, setScript] = useState(localStorage.getItem('editor-code') ?? '')

    const updateScript = useCallback((newScript: string) => {
        setScript(newScript)
        localStorage.setItem('editor-code', newScript)
    }, [])

    return (
        <PageTemplate>
            <Editor
                script={script}
                setScript={updateScript}
                createContext={() => Promise.resolve(emptyContext())}
                execute={execute}
            />
        </PageTemplate>
    )
}
