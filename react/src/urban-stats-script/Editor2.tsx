import '@fontsource/inconsolata/500.css'

import React, { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { useColors } from '../page_template/colors'

import { renderCode, getRange, nodeContent, Range, setRange, EditorError, longMessage } from './editor-utils-2'

const setScriptDelay = 500

const undoChunking = 1000
const undoHistory = 100

interface UndoRedoItem { time: number, script: string, range: Range | undefined }

export function Editor2(
    props: {
        getScript: () => string // Swap this function to get a new script
        setScript: (newScript: string) => void
        autocompleteSymbols: string[]
        errors: EditorError[]
    },
): ReactNode {
    const { setScript: propsSetScript, getScript, errors } = props

    const [script, setScript] = useState(getScript)

    const undoStack = useRef<UndoRedoItem[]>([]) // Top of this stack is the current state
    const redoStack = useRef<UndoRedoItem[]>([])

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
        const fragment = renderCode(newScript, colors, errors)

        const editor = editorRef.current!
        const rangeBefore = newRange ?? getRange(editor)
        editor.replaceChildren(...Array.from(fragment.childNodes))
        if (rangeBefore !== undefined) {
            // Otherwise, we get into a re-render loop
            inhibitRangeUpdateEvents.current++
            setRange(editor, rangeBefore)
        }
    }, [colors, errors])

    useEffect(() => {
        renderScript(script, undefined)
    }, [renderScript, script])

    useEffect(() => {
        const listener = (): void => {
            if (inhibitRangeUpdateEvents.current > 0) {
                inhibitRangeUpdateEvents.current--
            }
            else {
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

            // If autocomplete

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
            // Close autocomplete
        }
        editor.addEventListener('blur', listener)
        return () => { editor.removeEventListener('blur', listener) }
    }, [])

    const error = errors.length > 0

    return (
        <div style={{ margin: '2em' }}>
            <pre
                style={{
                    ...codeStyle,
                    caretColor: colors.textMain,
                    border: `1px solid ${error ? colors.hueColors.red : colors.borderShadow}`,
                    borderRadius: error ? '5px 5px 0 0' : '5px',
                }}
                ref={editorRef}
                contentEditable="plaintext-only"
                spellCheck="false"
            />
            (error ?
            <DisplayErrors errors={errors} />
            : null)
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

function DisplayErrors(props: { errors: EditorError[] }): ReactNode {
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
    return (
        <pre style={style(colors.hueColors.red)}>
            {props.errors.map((error, _, errors) => `${errors.length > 1 ? '- ' : ''}${longMessage(error)}`).join('\n')}
        </pre>
    )
}
