import '@fontsource/inconsolata/500.css'

import React, { CSSProperties, ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useColors } from '../page_template/colors'

import { renderCode, getRange, nodeContent, Range, setRange, EditorError, longMessage, Script, makeScript, getAutocompleteOptions, createAutocompleteMenuDiv, AutocompleteState } from './editor-utils'

const setScriptDelay = 500

const undoChunking = 1000
const undoHistory = 100

interface UndoRedoItem { time: number, uss: string, range: Range | undefined }

export function Editor(
    props: {
        getUss: () => string // Swap this function to get a new script
        setUss: (newScript: string) => void
        autocompleteSymbols: string[]
        errors: EditorError[]
    },
): ReactNode {
    const { setUss: propsSetUss, getUss, errors, autocompleteSymbols } = props

    const [script, setScript] = useState<Script>(() => makeScript(getUss()))

    const undoStack = useRef<UndoRedoItem[]>([]) // Top of this stack is the current state
    const redoStack = useRef<UndoRedoItem[]>([])

    // sync the script after some time of not typing
    useEffect(() => {
        const timeout = setTimeout(() => { propsSetUss(script.uss.trimEnd()) }, setScriptDelay)
        return () => { clearTimeout(timeout) }
    }, [script, propsSetUss])

    const colors = useColors()

    const editorRef = useRef<HTMLPreElement>(null)

    const inhibitRangeUpdateEvents = useRef<number>(0)

    const [autocompleteState, setAutocompleteState] = useState<AutocompleteState>(undefined)
    const [autocompleteSelectionIdx, setAutocompleteSelectionIdx] = useState(0)

    function newUndoState(newScript: Script, newRange: Range | undefined): void {
        const currentUndoState = undoStack.current[undoStack.current.length - 1]
        if (currentUndoState.time + undoChunking > Date.now()) {
            // ammend current item rather than making a new one
            currentUndoState.uss = newScript.uss
            currentUndoState.range = newRange
        }
        else {
            undoStack.current.push({ time: Date.now(), uss: newScript.uss, range: newRange })
            while (undoStack.current.length > undoHistory) {
                undoStack.current.shift()
            }
        }
        redoStack.current = []
    }

    const renderScript = useCallback((newScript: Script, newRange: Range | undefined) => {
        const fragment = renderCode(newScript, colors, errors, (token, content) => {
            if (autocompleteState?.location.end.charIdx === token.location.end.charIdx && token.token.type === 'identifier') {
                content.push(autocompleteState.div)
            }
        })

        const editor = editorRef.current!
        const rangeBefore = newRange ?? getRange(editor)
        editor.replaceChildren(...fragment)
        if (rangeBefore !== undefined) {
            // Otherwise, we get into a re-render loop
            inhibitRangeUpdateEvents.current++
            setRange(editor, rangeBefore)
        }
    }, [colors, errors, autocompleteState])

    useEffect(() => {
        renderScript(script, undefined)
    }, [renderScript, script])

    const editScript = useCallback((newUss: string, newRange: Range | undefined, undoable: boolean) => {
        const newScript = makeScript(newUss)
        renderScript(newScript, newRange) // Need this to ensure cursor placement
        setScript(newScript)
        setAutocompleteState(undefined)
        if (undoable) {
            newUndoState(newScript, newRange)
        }
    }, [renderScript])

    useLayoutEffect(() => { // Needs to happen before other effects
        const s = getUss()
        const editor = editorRef.current!
        const currentRange = getRange(editor)
        const newRange = currentRange !== undefined ? { start: 0, end: 0 } : undefined
        editScript(s, newRange, false)
        undoStack.current = [{ time: Date.now(), uss: s, range: newRange }]
        redoStack.current = []
    }, [getUss])

    useEffect(() => {
        const listener = (): void => {
            if (inhibitRangeUpdateEvents.current > 0) {
                inhibitRangeUpdateEvents.current--
            }
            else {
                const range = getRange(editorRef.current!)
                setAutocompleteState(undefined)
                undoStack.current[undoStack.current.length - 1].range = range // updates the selection of the current state
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
            const range = getRange(editor)
            const newScript = makeScript(nodeContent(editor))
            const token = range !== undefined && range.start === range.end
                ? newScript.tokens.find(t => t.token.type === 'identifier' && t.location.end.charIdx === range.start)
                : undefined
            if (token !== undefined) {
                const tokenValue = token.token.value as string
                const options = getAutocompleteOptions(autocompleteSymbols, newScript.tokens, tokenValue)
                if (options.length === 0) {
                    setAutocompleteState(undefined)
                }
                else {
                    setAutocompleteState({
                        location: token.location,
                        options,
                        div: createAutocompleteMenuDiv(colors),
                        apply(optionIdx) {
                            const option = options[optionIdx]
                            const delta = option.length - tokenValue.length
                            const editedUss = newScript.uss.slice(0, token.location.start.charIdx) + option + newScript.uss.slice(token.location.end.charIdx)
                            const editedRange = { start: token.location.end.charIdx + delta, end: token.location.end.charIdx + delta }
                            editScript(editedUss, editedRange, true)
                        },
                    })
                    setAutocompleteSelectionIdx(0)
                }
            }
            else {
                setAutocompleteState(undefined)
            }
            setScript(newScript)
            newUndoState(newScript, range)
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [setScript, autocompleteSymbols, colors, editScript])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (e: KeyboardEvent): void => {
            if (autocompleteState !== undefined) {
                switch (e.key) {
                    case 'Enter':
                    case 'Tab':
                        e.preventDefault()
                        autocompleteState.apply(autocompleteSelectionIdx)
                        return
                    case 'Escape':
                        e.preventDefault()
                        setAutocompleteState(undefined)
                        return
                    case 'ArrowDown':
                    case 'ArrowUp':
                        e.preventDefault()
                        if (e.key === 'ArrowDown') {
                            setAutocompleteSelectionIdx(i => i + 1 >= autocompleteState.options.length ? 0 : i + 1)
                        }
                        else {
                            setAutocompleteSelectionIdx(i => i - 1 < 0 ? autocompleteState.options.length - 1 : i - 1)
                        }
                        return
                }
            }

            if (e.key === 'Tab') {
                e.preventDefault()
                const range = getRange(editor)
                if (range !== undefined) {
                    editScript(
                        `${script.uss.slice(0, range.start)}    ${script.uss.slice(range.end)}`,
                        { start: range.start + 4, end: range.start + 4 },
                        true,
                    )
                }
            }
            else if (e.key === 'Backspace') {
                const range = getRange(editor)
                if (range !== undefined && range.start === range.end && range.start >= 4 && script.uss.slice(range.start - 4, range.start) === '    ') {
                    e.preventDefault()
                    editScript(
                        `${script.uss.slice(0, range.start - 4)}${script.uss.slice(range.start)}`,
                        { start: range.start - 4, end: range.start - 4 },
                        true,
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
                    editScript(prevState.uss, prevState.range, false)
                }
            }
            else if (isMac ? e.key === 'z' && e.metaKey && e.shiftKey : e.key === 'y' && e.ctrlKey) {
                e.preventDefault()
                // Redo
                const futureState = redoStack.current.pop()
                if (futureState !== undefined) {
                    undoStack.current.push(futureState)
                    editScript(futureState.uss, futureState.range, false)
                }
            }
        }
        editor.addEventListener('keydown', listener)
        return () => { editor.removeEventListener('keydown', listener) }
    }, [script, setScript, renderScript, autocompleteState, autocompleteSelectionIdx, editScript])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            setAutocompleteState(undefined)
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
            {error
                ? <DisplayErrors errors={errors} />
                : null}
            {autocompleteState === undefined
                ? null
                : createPortal(
                    <Autocomplete
                        state={autocompleteState}
                        selectionIdx={autocompleteSelectionIdx}
                        setSelectionIdx={setAutocompleteSelectionIdx}
                        apply={(i) => { autocompleteState.apply(i) }}
                    />,
                    autocompleteState.div,
                )}
        </div>
    )
}

export const codeStyle: CSSProperties = {
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

function Autocomplete(props: { state: Exclude<AutocompleteState, undefined>, selectionIdx: number, setSelectionIdx: (idx: number) => void, apply: (idx: number) => void }): ReactNode {
    return props.state.options.map((option, index) => (
        <AutocompleteOption
            key={option}
            option={option}
            index={index}
            selected={index === props.selectionIdx}
            apply={() => { props.apply(index) }}
        />
    ))
}

function AutocompleteOption(props: { option: string, index: number, selected: boolean, apply: () => void }): ReactNode {
    const colors = useColors()
    const [hovering, setHovering] = useState(false)
    const style: CSSProperties = {
        cursor: 'pointer',
        backgroundColor: (props.selected || hovering
            ? colors.slightlyDifferentBackgroundFocused
            : props.index % 2 === 0 ? colors.background : colors.slightlyDifferentBackground),
        padding: '0 0.5em',
    }

    const optionRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        optionRef.current?.scrollIntoView({ block: 'nearest' })
    }, [props.selected])

    return (
        <div
            ref={optionRef}
            style={style}
            onMouseEnter={() => { setHovering(true) }}
            onMouseLeave={() => { setHovering(false) }}
            onClick={props.apply}
        >
            {props.option}
        </div>
    )
}
