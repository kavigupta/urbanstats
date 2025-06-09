import React, { ReactNode, useState } from 'react'

import { PageTemplate } from '../page_template/template'

import { Editor } from './Editor'

export function EditorPanel(): ReactNode {
    const [script, setScript] = useState(localStorage.getItem('editor-code') ?? '')

    return (
        <PageTemplate>
            <Editor
                script={script}
                setScript={(newScript) => {
                    setScript(newScript)
                    localStorage.setItem('editor-code', newScript)
                }}
            />
        </PageTemplate>
    )
}
