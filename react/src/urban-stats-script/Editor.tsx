import '@fontsource/inconsolata/500.css'

import React, { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { useColors } from '../page_template/colors'

import { Action, AutocompleteMenu, getRange, nodeContent, Range, ParseResult, setRange, stringToHtml, ExecResult } from './editor-utils'
import { renderValue } from './types-values'
import { USSExecutionDescriptor } from './workerManager'

type Result = { type: 'parse', result: ParseResult } | { type: 'exec', result: ExecResult }

export function Editor(
    {
        script,
        setScript,
        executionDescriptor,
        autocompleteSymbols = [],
        showOutput = true,
    }:
    {
        script: string
        setScript: (newScript: string) => void
        executionDescriptor: USSExecutionDescriptor
        autocompleteSymbols: string[]
        showOutput?: boolean
    },
): ReactNode {
    const colors = useColors()

    const editorRef = useRef<HTMLPreElement>(null)

    const inhibitRangeUpdateEvents = useRef<number>(0)

    const [result, setResult] = useState<Result>({ type: 'parse', result: { result: 'failure', errors: ['No input'] } })

    const [lastAction, setLastAction] = useState<Action>(undefined)

    const autocompleteMenuRef = useRef<AutocompleteMenu | undefined>(undefined)

    const resultCounter = useRef(0)

    const renderScript = useCallback((newScript: string, newRange: Range | undefined) => {
        const range = newRange ?? getRange(editorRef.current!)

        let collapsedRangeIndex: number | undefined
        if (range !== undefined && range.start === range.end) {
            collapsedRangeIndex = range.start
        }

        const { html, result: newResult, autocomplete } = stringToHtml(newScript, colors, executionDescriptor, autocompleteSymbols, lastAction, {
            collapsedRangeIndex,
            apply: (completion, from, to, delta) => {
                const editedScript = newScript.slice(0, from) + completion + newScript.slice(to)
                renderScript(editedScript, { start: to + delta, end: to + delta })
                setScript(editedScript)
                setLastAction('autocomplete')
            },
        })

        function setHTML(newHtml: string, r: Range | undefined): void {
            const editor = editorRef.current!
            if (editor.innerHTML !== newHtml) {
                const rangeBefore = r ?? getRange(editor)
                editor.innerHTML = newHtml
                autocompleteMenuRef.current?.attachListeners(editor)
                if (rangeBefore !== undefined) {
                    // Otherwise, we get into a re-render loop
                    inhibitRangeUpdateEvents.current++
                    setRange(editor, rangeBefore)
                }
            }
        }

        autocompleteMenuRef.current = autocomplete

        setHTML(html, range)
        setResult({ type: 'parse', result: newResult })

        if (newResult.result === 'success') {
            const identifier = ++resultCounter.current
            void newResult.value.then(({ html: execHtml, result: execResult }) => {
                if (identifier !== resultCounter.current) {
                    return // Someone else is racing
                }

                setHTML(execHtml, undefined)
                setResult({ type: 'exec', result: execResult })
            })
        }
    }, [colors, executionDescriptor, autocompleteSymbols, lastAction, setScript])

    useEffect(() => {
        renderScript(script, undefined)
    }, [renderScript, script])

    useEffect(() => {
        const listener = (): void => {
            if (inhibitRangeUpdateEvents.current > 0) {
                inhibitRangeUpdateEvents.current--
            }
            else {
                setLastAction('select') // Indirectly displays script
            }
        }
        document.addEventListener('selectionchange', listener)
        return () => {
            document.removeEventListener('selectionchange', listener)
        }
    }, [])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            setLastAction('input')
            setScript(nodeContent(editor))
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [setScript])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (e: KeyboardEvent): void => {
            function editScript(newScript: string, newRange: Range): void {
                renderScript(newScript, newRange)
                setScript(newScript)
            }

            if (autocompleteMenuRef.current?.action(editor, e) === true) {
                return
            }

            if (e.key === 'Tab') {
                e.preventDefault()
                const range = getRange(editor)
                if (range !== undefined) {
                    editScript(
                        `${script.slice(0, range.start)}    ${script.slice(range.end)}`,
                        { start: range.start + 4, end: range.start + 4 },
                    )
                }
            }
            else if (e.key === 'Backspace') {
                const range = getRange(editor)
                if (range !== undefined && range.start === range.end && range.start >= 4 && script.slice(range.start - 4, range.start) === '    ') {
                    e.preventDefault()
                    editScript(
                        `${script.slice(0, range.start - 4)}${script.slice(range.start)}`,
                        { start: range.start - 4, end: range.start - 4 },
                    )
                }
            }
        }
        editor.addEventListener('keydown', listener)
        return () => { editor.removeEventListener('keydown', listener) }
    }, [script, setScript, renderScript])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            autocompleteMenuRef.current?.action(editor, { key: 'Escape', preventDefault: () => undefined })
        }
        editor.addEventListener('blur', listener)
        return () => { editor.removeEventListener('blur', listener) }
    }, [])

    const error = result.result.result === 'failure'
    const executing = result.type === 'parse'

    return (
        <div style={{ margin: '2em' }}>
            <pre
                style={{
                    ...codeStyle,
                    caretColor: colors.textMain,
                    border: `1px solid ${error ? colors.hueColors.red : executing ? colors.hueColors.yellow : (showOutput ? colors.hueColors.green : colors.borderShadow)}`,
                    borderRadius: error || showOutput ? '5px 5px 0 0' : '5px',
                }}
                ref={editorRef}
                contentEditable="plaintext-only"
                spellCheck="false"
            />
            <DisplayResult result={result} showOutput={showOutput} />
        </div>
    )
}

const codeStyle: CSSProperties = {
    whiteSpace: 'pre-wrap',
    fontFamily: 'Inconsolata, monospace',
    fontWeight: 500,
    lineHeight: '175%',
    margin: 0,
    padding: '1em',
}

function DisplayResult(props: { result: Result, showOutput: boolean }): ReactNode {
    const colors = useColors()
    function style(color: string): CSSProperties {
        const border = `2px solid ${color}`
        return {
            ...codeStyle,
            borderRadius: '0 0 5px 5px',
            backgroundColor: colors.slightlyDifferentBackground,
            color: colors.textMain,
            borderTop: 'none',
            borderRight: border,
            borderBottom: border,
            borderLeft: border,
        }
    }
    if (props.result.result.result === 'success') {
        if (props.result.type === 'parse') {
            return (
                <pre style={style(colors.hueColors.yellow)}>
                    Executing...
                </pre>
            )
        }
        else if (props.showOutput) {
            return (
                <pre style={style(colors.hueColors.green)}>
                    {renderValue(props.result.result.value)}
                </pre>
            )
        }
        else {
            return null
        }
    }
    else {
        return (
            <pre style={style(colors.hueColors.red)}>
                {props.result.result.errors.map((error, _, errors) => `${errors.length > 1 ? '- ' : ''}${error}`).join('\n')}
            </pre>
        )
    }
}
