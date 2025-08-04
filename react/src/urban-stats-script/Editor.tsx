import '@fontsource/inconsolata/500.css'

import React, { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useColors } from '../page_template/colors'

import { renderCode, getRange, nodeContent, Range, setRange, EditorError, longMessage, Script, makeScript, getAutocompleteOptions, createAutocompleteMenu, AutocompleteState, createPlaceholder } from './editor-utils'
import { USSDocumentedType } from './types-values'

export function Editor(
    { uss, setUss, typeEnvironment, errors, placeholder, selection, setSelection }: {
        uss: string
        setUss: (newScript: string) => void
        typeEnvironment: Map<string, USSDocumentedType>
        errors: EditorError[]
        placeholder?: string
        selection: Range | null
        setSelection: (newRange: Range | null) => void
    },
): ReactNode {
    const setSelectionRef = useRef(setSelection)
    setSelectionRef.current = setSelection

    const script = useMemo(() => makeScript(uss), [uss])

    const colors = useColors()

    const editorRef = useRef<HTMLPreElement>(null)

    const [autocompleteState, setAutocompleteState] = useState<AutocompleteState>(undefined)
    const [autocompleteSelectionIdx, setAutocompleteSelectionIdx] = useState(0)

    const renderScript = useCallback((newScript: Script, newRange: Range | null | undefined) => {
        const fragment = renderCode(newScript, colors, errors, (token, content) => {
            if (autocompleteState?.location.end.charIdx === token.location.end.charIdx && token.token.type === 'identifier') {
                content.push(autocompleteState.element)
            }
            if (placeholder !== undefined && newScript.tokens.every(t => t.token.type === 'operator' && t.token.value === 'EOL') && token.location.end.charIdx === 0) {
                content.push(createPlaceholder(colors, placeholder))
            }
        })

        const editor = editorRef.current!
        const rangeBefore = newRange !== undefined ? newRange : getRange(editor)
        editor.replaceChildren(...fragment)
        setRange(editor, rangeBefore)
    }, [colors, errors, autocompleteState, placeholder])

    const lastRenderScript = useRef<typeof renderScript>(renderScript)
    const lastScript = useRef<Script | undefined>(undefined)
    const lastSelection = useRef<Range | undefined | null>(undefined)

    useEffect(() => {
        const editor = editorRef.current!

        // Rerendering when just a selection change happens causes the selection interaction to be interrupted
        if (script !== lastScript.current || renderScript !== lastRenderScript.current) {
            renderScript(script, selection)
        }
        else if (selection !== lastSelection.current) {
            setRange(editor, selection)
        }

        lastRenderScript.current = renderScript
        lastScript.current = script
        lastSelection.current = selection
    }, [renderScript, script, selection])

    const editScript = useCallback((newUss: string, newRange: Range) => {
        const newScript = makeScript(newUss)
        renderScript(newScript, newRange) // Need this to ensure cursor placement
        setUss(newScript.uss)
        setSelection(newRange)
        setAutocompleteState(undefined)
    }, [renderScript, setUss, setSelection])

    useEffect(() => {
        const listener = (): void => {
            // These events are often spurious

            const range = getRange(editorRef.current!)
            setSelectionRef.current(range)
            // Cancel autocomplete if the selection is no longer at the end
            setAutocompleteState(s => s?.location.end.charIdx !== range?.start || s?.location.end.charIdx !== range?.end ? undefined : s)
        }
        document.addEventListener('selectionchange', listener)
        return () => {
            document.removeEventListener('selectionchange', listener)
        }
    }, []) // Rebinding can cause problems with multiple editors as they stop listening when one editor changes selection

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            const range = getRange(editor)
            const newScript = makeScript(nodeContent(editor))
            const token = range !== null && range.start === range.end
                ? newScript.tokens.find(t => t.token.type === 'identifier' && t.location.end.charIdx === range.start)
                : undefined
            if (token !== undefined) {
                const tokenValue = token.token.value as string
                const options = getAutocompleteOptions(typeEnvironment, newScript.tokens, tokenValue)
                if (options.length === 0) {
                    setAutocompleteState(undefined)
                }
                else {
                    setAutocompleteState({
                        location: token.location,
                        options,
                        element: createAutocompleteMenu(colors),
                        apply(optionIdx) {
                            const option = options[optionIdx]
                            const delta = option.length - tokenValue.length
                            const editedUss = newScript.uss.slice(0, token.location.start.charIdx) + option + newScript.uss.slice(token.location.end.charIdx)
                            const editedRange = { start: token.location.end.charIdx + delta, end: token.location.end.charIdx + delta }
                            editScript(editedUss, editedRange)
                        },
                    })
                    setAutocompleteSelectionIdx(0)
                }
            }
            else {
                setAutocompleteState(undefined)
            }
            setUss(newScript.uss)
            setSelection(range)
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [typeEnvironment, colors, editScript, setUss, setSelection])

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
                if (range !== null) {
                    editScript(
                        `${script.uss.slice(0, range.start)}    ${script.uss.slice(range.end)}`,
                        { start: range.start + 4, end: range.start + 4 },
                    )
                }
            }
            else if (e.key === 'Backspace') {
                const range = getRange(editor)
                if (range !== null && range.start === range.end && range.start >= 4 && script.uss.slice(range.start - 4, range.start) === '    ') {
                    e.preventDefault()
                    editScript(
                        `${script.uss.slice(0, range.start - 4)}${script.uss.slice(range.start)}`,
                        { start: range.start - 4, end: range.start - 4 },
                    )
                }
            }
        }
        editor.addEventListener('keydown', listener)
        return () => { editor.removeEventListener('keydown', listener) }
    }, [script, renderScript, autocompleteState, autocompleteSelectionIdx, editScript])

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
            <DisplayErrors errors={errors} />
            {autocompleteState === undefined
                ? null
                : createPortal(
                    <Autocomplete
                        state={autocompleteState}
                        selectionIdx={autocompleteSelectionIdx}
                        setSelectionIdx={setAutocompleteSelectionIdx}
                        apply={(i) => { autocompleteState.apply(i) }}
                    />,
                    autocompleteState.element,
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

export function DisplayErrors(props: { errors: EditorError[] }): ReactNode | undefined {
    const colors = useColors()
    if (props.errors.length === 0) {
        return undefined
    }
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
