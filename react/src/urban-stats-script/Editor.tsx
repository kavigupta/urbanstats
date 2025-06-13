import React, { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { useColors } from '../page_template/colors'

import { defaultConstants } from './constants'
import { Action, Execute, getRange, htmlToString, Range, Result, setRange, stringToHtml, ValueChecker } from './editor-utils'
import { renderValue } from './types-values'

import '@fontsource/inconsolata/500.css'

// If we do a different default every time, the component will keep outputting a new script and go into a loop
const defaultCheckValue: ValueChecker = () => ({ ok: true })
const defaultAutoCompleteValue: string[] = Array.from(defaultConstants.keys())

export function Editor(
    {
        script,
        setScript,
        execute,
        autocomplete = defaultAutoCompleteValue,
        checkValue = defaultCheckValue,
        showOutput = true,
    }:
    {
        script: string
        setScript: (newScript: string) => void
        execute: Execute
        autocomplete?: string[]
        checkValue?: ValueChecker
        showOutput?: boolean
    },
): ReactNode {
    const colors = useColors()

    const editorRef = useRef<HTMLPreElement>(null)

    const inhibitRangeUpdateEvents = useRef<number>(0)

    const [result, setResult] = useState<Result>({ result: 'failure', errors: ['No input'] })

    const [lastAction, setLastAction] = useState<Action>(undefined)

    const renderScript = useCallback((newScript: string, newRange: Range | undefined) => {
        let collapsedRangeIndex: number | undefined
        if (newRange !== undefined && newRange.start === newRange.end) {
            collapsedRangeIndex = newRange.start
        }
        return stringToHtml(newScript, colors, execute, checkValue, lastAction, {
            collapsedRangeIndex,
            options: autocomplete,
            apply: (completion, index) => { setScript(newScript.slice(0, index) + completion + newScript.slice(index)) },
        })
    }, [colors, execute, checkValue, autocomplete, lastAction, setScript])

    const displayScript = useCallback(() => {
        const editor = editorRef.current!
        const range = getRange(editor)
        const { html, result: newResult } = renderScript(script, range)
        if (editor.innerHTML !== html) {
            editor.innerHTML = html
            if (range !== undefined) {
                // Otherwise, we get into a re-render loop
                inhibitRangeUpdateEvents.current++
                setRange(editor, range)
            }
        }
        setResult(newResult)
    }, [renderScript, script])

    useEffect(displayScript, [displayScript])

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
            setScript(htmlToString(editor.innerHTML))
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [setScript])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (e: KeyboardEvent): void => {
            function editScript(newScript: string, newRange: Range): void {
                const { html, result: newResult } = renderScript(newScript, newRange)
                setResult(newResult)
                editor.innerHTML = html
                setRange(editor, newRange)
                setScript(newScript)
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

    const error = result.result === 'failure'

    return (
        <div style={{ margin: '2em' }}>
            <pre
                style={{
                    ...codeStyle,
                    caretColor: colors.textMain,
                    border: `1px solid ${error ? colors.hueColors.red : (showOutput ? colors.hueColors.green : colors.borderShadow)}`,
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
    if (props.result.result === 'success') {
        if (props.showOutput) {
            return (
                <pre style={style(colors.hueColors.green)}>
                    {renderValue(props.result.value)}
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
                {props.result.errors.map((error, _, errors) => `${errors.length > 1 ? '- ' : ''}${error}`).join('\n')}
            </pre>
        )
    }
}
