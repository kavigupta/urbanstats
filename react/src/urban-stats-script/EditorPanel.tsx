import React, { ReactNode, useCallback, useState } from 'react'

import { emptyContext } from '../../unit/urban-stats-script-utils'
import { PageTemplate } from '../page_template/template'

import { Editor, ValueChecker } from './Editor'
import { execute } from './interpreter'
import { UrbanStatsASTStatement } from './parser'
import { renderType, USSValue } from './types-values'

export function EditorPanel(): ReactNode {
    const [script, setScript] = useState(localStorage.getItem('editor-code') ?? '')

    const updateScript = useCallback((newScript: string) => {
        setScript(newScript)
        localStorage.setItem('editor-code', newScript)
    }, [])

    const exec = useCallback((expr: UrbanStatsASTStatement) => {
        const value = execute(expr, emptyContext())
        return value
    }, [])

    const checkValue = useCallback<ValueChecker>((result: USSValue) => {
        if (renderType(result.type) !== '[number]' && renderType(result.type) !== '[boolean]') {
            return { ok: false, problem: 'result is not a vector of numbers or booleans' }
        }
        else {
            return { ok: true }
        }
    }, [])

    return (
        <PageTemplate>
            <Editor
                script={script}
                setScript={updateScript}
                execute={exec}
            />
            {/* <Editor
                script={script}
                setScript={updateScript}
                execute={exec}
                checkValue={checkValue}
            />
            <Editor
                script={script}
                setScript={updateScript}
                execute={exec}
                showOutput={false}
            /> */}
        </PageTemplate>
    )
}
