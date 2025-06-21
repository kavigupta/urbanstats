import '@fontsource/inconsolata/500.css'

import React, { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { useColors } from '../page_template/colors'

import { Action, AutocompleteMenu, getRange, nodeContent, Range, ParseResult, setRange, stringToHtml, ExecResult } from './editor-utils'
import { renderValue } from './types-values'
import { USSExecutionDescriptor } from './workerManager'

type Result = { type: 'parse', result: ParseResult } | { type: 'exec', result: ExecResult }

const setScriptDelay = 500
const executeDelay = 500

const undoChunking = 1000
const undoHistory = 100

interface UndoRedoItem { time: number, script: string, range: Range | undefined }

export function Editor(
    props: {
        getScript: () => string // Swap this function to get a new script
        setScript: (newScript: string) => void
        executionDescriptor: USSExecutionDescriptor | undefined // Undefined means do not execute
        autocompleteSymbols: string[]
        showOutput: boolean
    },
): ReactNode {
    const { executionDescriptor, autocompleteSymbols, setScript: propsSetScript, showOutput, getScript } = props

    const [script, setScript] = useState(getScript)

    const undoStack = useRef<UndoRedoItem[]>([]) // Top of this stack is the current state
    const redoStack = useRef<UndoRedoItem[]>([])

    console.log({
        undoStack: undoStack.current,
        redoStack: redoStack.current,
    })

    useEffect(() => {
        const s = getScript()
        setScript(s)
        undoStack.current = [{ time: Date.now(), script: s, range: getRange(editorRef.current!) }]
        redoStack.current = []
    }, [getScript])

    // sync the script after some time of not typing
    useEffect(() => {
        const timeout = setTimeout(() => { propsSetScript(script) }, setScriptDelay)
        return () => { clearTimeout(timeout) }
    }, [script, propsSetScript])

    const colors = useColors()

    const editorRef = useRef<HTMLPreElement>(null)

    const inhibitRangeUpdateEvents = useRef<number>(0)

    const [result, setResult] = useState<Result>({ type: 'parse', result: { result: 'failure', errors: ['No input'] } })

    const [executionStart, setExecutionStart] = useState<number | undefined>(undefined)

    const [lastParse, setLastParse] = useState<number | undefined>(undefined)

    const [lastAction, setLastAction] = useState<Action>(undefined)

    const autocompleteMenuRef = useRef<AutocompleteMenu | undefined>(undefined)

    const stagedResultRef = useRef<{ timer: ReturnType<typeof setTimeout>, resultFunction: () => Promise<unknown> } | undefined>(undefined)

    const lastRenderedScriptRef = useRef<string | undefined>(undefined)
    const lastRenderedExecutionDescriptorRef = useRef<USSExecutionDescriptor | undefined>(undefined)

    function newUndoState(newScript: string, newRange: Range | undefined): void {
        const currentUndoState = undoStack.current[undoStack.current.length - 1]
        if (currentUndoState.time + undoChunking > Date.now()) {
            // ammend current item rather than making a new one
            currentUndoState.script = newScript
            currentUndoState.range = newRange
        }
        else {
            undoStack.current.push({ time: Date.now(), script: newScript, range: newRange })
            while (undoStack.current.length > undoHistory) {
                undoStack.current.shift()
            }
        }
        redoStack.current = []
    }

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
                const r = { start: to + delta, end: to + delta }
                renderScript(editedScript, r)
                setScript(editedScript)
                newUndoState(editedScript, r)
                setLastAction('autocomplete')
            },
        })

        setLastParse(Date.now())

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

        // Skip setting results if we just rendered this (happens when cursor is moving around for autocomplete)
        if (lastRenderedScriptRef.current === newScript && lastRenderedExecutionDescriptorRef.current === executionDescriptor) {
            return
        }

        lastRenderedScriptRef.current = newScript
        lastRenderedExecutionDescriptorRef.current = executionDescriptor

        setResult({ type: 'parse', result: newResult })

        if (newResult.result === 'success') {
            clearTimeout(stagedResultRef.current?.timer)
            if (newResult.value === undefined) {
                stagedResultRef.current = undefined
            }
            else {
                stagedResultRef.current = {
                    timer: setTimeout(async (): Promise<void> => {
                        if (stagedResultRef.current?.resultFunction !== newResult.value) {
                            return // Avoid race
                        }
                        const start = Date.now()
                        setExecutionStart(start)
                        const exec = await newResult.value!()
                        setExecutionStart(v => v === start ? undefined : v) // Only turn off execution if we were the one executing
                        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Race condition
                        if (stagedResultRef.current?.resultFunction !== newResult.value) {
                            return // Avoid race
                        }
                        setHTML(exec.html, undefined)
                        setResult({ type: 'exec', result: exec.result })
                    }, executeDelay),
                    resultFunction: newResult.value,
                }
            }
        }
        else {
            stagedResultRef.current = undefined
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
                undoStack.current[undoStack.current.length - 1].range = getRange(editorRef.current!) // updates the selection of the current state
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
            const newScript = nodeContent(editor)
            setScript(newScript)
            newUndoState(newScript, getRange(editor))
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
                newUndoState(newScript, newRange)
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

            const isMac = navigator.userAgent.includes('Mac')
            if (isMac ? e.key === 'z' && e.metaKey && !e.shiftKey : e.key === 'z' && e.ctrlKey) {
                e.preventDefault()
                // Undo
                if (undoStack.current.length >= 2) {
                    const prevState = undoStack.current[undoStack.current.length - 2]
                    // Prev state becomes current state, current state becomes redo state
                    redoStack.current.push(undoStack.current.pop()!)
                    renderScript(prevState.script, prevState.range)
                    setScript(prevState.script)
                }
            }
            else if (isMac ? e.key === 'z' && e.metaKey && e.shiftKey : e.key === 'y' && e.ctrlKey) {
                e.preventDefault()
                // Redo
                const futureState = redoStack.current.pop()
                if (futureState !== undefined) {
                    undoStack.current.push(futureState)
                    renderScript(futureState.script, futureState.range)
                    setScript(futureState.script)
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
    const executing = result.type === 'parse' && executionDescriptor !== undefined

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
            <DisplayResult result={result} showOutput={showOutput} executionStart={executionStart} lastParse={lastParse} />
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

const showDebugInfoDelay = 500

function DisplayResult(props: { result: Result, showOutput: boolean, executionStart: number | undefined, lastParse: number | undefined }): ReactNode {
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

    const [showExecuting, setShowExecuting] = useState(false)

    useEffect(() => {
        const timeout = props.executionStart !== undefined
            ? setTimeout(() => {
                setShowExecuting(true)
            }, showDebugInfoDelay)
            : undefined
        return () => {
            clearTimeout(timeout)
            setShowExecuting(false)
        }
    }, [props.executionStart])

    const [maybeShowParseError, setMaybeShowParseError] = useState(false)

    useEffect(() => {
        const timeout = props.lastParse !== undefined
            ? setTimeout(() => {
                setMaybeShowParseError(true)
            }, showDebugInfoDelay)
            : undefined
        return () => {
            clearTimeout(timeout)
            setMaybeShowParseError(false)
        }
    }, [props.lastParse])

    if (props.result.result.result === 'success') {
        if (props.result.type === 'parse' && showExecuting) {
            return (
                <pre style={style(colors.hueColors.yellow)}>
                    Executing...
                </pre>
            )
        }
        if (props.result.type === 'exec' && props.showOutput) {
            return (
                <pre style={style(colors.hueColors.green)}>
                    {renderValue(props.result.result.value)}
                </pre>
            )
        }
    }
    if (props.result.result.result === 'failure' && maybeShowParseError) {
        return (
            <pre style={style(colors.hueColors.red)}>
                {props.result.result.errors.map((error, _, errors) => `${errors.length > 1 ? '- ' : ''}${error}`).join('\n')}
            </pre>
        )
    }
    return null
}
