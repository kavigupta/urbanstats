import '@fontsource/inconsolata/500.css'

import React, { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { LongFormDocumentation, linkContext } from '../uss-documentation'
import { TestUtils } from '../utils/TestUtils'
import { totalOffset } from '../utils/layout'

import { createAutocompleteMenu, createDocumentationPopover, getAutocompleteOptions } from './autocomplete'
import { renderCode, getRange, nodeContent, Range, setRange, EditorResult, longMessage, Script, makeScript, createPlaceholder } from './editor-utils'
import { AnnotatedToken } from './lexer'
import { LocInfo } from './location'
import { TypeEnvironment, USSDocumentedType } from './types-values'

interface AutocompleteState {
    kind: 'autocomplete'
    location: LocInfo
    options: string[]
    element: HTMLElement
    apply: (optionIdx: number) => void
}

interface DocumentationState {
    kind: 'documentation'
    location: LocInfo
    name: string
    value: USSDocumentedType
    element: HTMLElement
}

type PopoverState = AutocompleteState | DocumentationState | undefined

export function Editor(
    { uss, setUss, typeEnvironment, results, placeholder, selection, setSelection, eRef }: {
        uss: string
        setUss: (newScript: string) => void
        typeEnvironment: TypeEnvironment
        results: EditorResult[]
        placeholder?: string
        selection: Range | null
        setSelection: (newRange: Range | null) => void
        eRef?: React.MutableRefObject<HTMLPreElement | null>
    },
): ReactNode {
    const setSelectionRef = useRef(setSelection)
    setSelectionRef.current = setSelection

    const script = useMemo(() => makeScript(uss), [uss])

    const colors = useColors()

    const editorRef = useRef<HTMLPreElement | null>(null)

    const [popoverState, setPopoverState] = useState<PopoverState>(undefined)
    const [autocompleteSelectionIdx, setAutocompleteSelectionIdx] = useState(0)

    const spanTokenMapRef = useRef<Map<Element, AnnotatedToken>>(new Map())

    const renderScript = useCallback((newScript: Script) => {
        spanTokenMapRef.current.clear()

        const fragment = renderCode(
            newScript, colors, results.filter(r => r.kind !== 'success'),
            (token, content) => {
                if (popoverState?.location.end.charIdx === token.location.end.charIdx && token.token.type === 'identifier') {
                    if (popoverState.kind === 'documentation') {
                        // put the text node in a span that has a background so we hightlight the token we're popovering
                        const text = content[0]
                        const span = document.createElement('span')
                        span.appendChild(text)
                        span.style.backgroundColor = colors.slightlyDifferentBackgroundFocused
                        content[0] = span
                    }

                    content.push(popoverState.element)
                }
                if (placeholder !== undefined && newScript.tokens.every(t => t.token.type === 'operator' && t.token.value === 'EOL') && token.location.end.charIdx === 0) {
                    content.push(createPlaceholder(colors, placeholder))
                }
            },
            (token, span) => {
                spanTokenMapRef.current.set(span, token)
            },
        )

        const editor = editorRef.current!
        editor.replaceChildren(...fragment)
        // Usually you want to set the selection after this, since it has been reset
    }, [colors, results, popoverState, placeholder])

    const lastRenderScript = useRef<typeof renderScript>(renderScript)
    const lastScript = useRef<Script | undefined>(undefined)

    useEffect(() => {
        const editor = editorRef.current!

        // Rerendering when just a selection change happens causes the selection interaction to be interrupted
        if (script !== lastScript.current || renderScript !== lastRenderScript.current) {
            renderScript(script)
        }
        setRange(editor, selection)

        lastRenderScript.current = renderScript
        lastScript.current = script
    }, [renderScript, script, selection])

    const editScript = useCallback((newUss: string, newRange: Range) => {
        const newScript = makeScript(newUss)
        renderScript(newScript)
        setRange(editorRef.current!, newRange)
        setUss(newScript.uss)
        setSelection(newRange)
        setPopoverState(undefined)
    }, [renderScript, setUss, setSelection])

    useEffect(() => {
        const listener = (): void => {
            // These events are often spurious

            const range = getRange(editorRef.current!)
            setSelectionRef.current(range)
            // Cancel autocomplete if the selection is no longer at the end
            setPopoverState(s => s?.kind === 'autocomplete' && (s.location.end.charIdx !== range?.start || s.location.end.charIdx !== range.end) ? undefined : s)
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
                    setPopoverState(undefined)
                }
                else {
                    setPopoverState({
                        kind: 'autocomplete',
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
                setPopoverState(undefined)
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
            if (popoverState?.kind === 'autocomplete') {
                switch (e.key) {
                    case 'Enter':
                    case 'Tab':
                        e.preventDefault()
                        popoverState.apply(autocompleteSelectionIdx)
                        return
                    case 'Escape':
                        e.preventDefault()
                        setPopoverState(undefined)
                        return
                    case 'ArrowDown':
                    case 'ArrowUp':
                        e.preventDefault()
                        if (e.key === 'ArrowDown') {
                            setAutocompleteSelectionIdx(i => i + 1 >= popoverState.options.length ? 0 : i + 1)
                        }
                        else {
                            setAutocompleteSelectionIdx(i => i - 1 < 0 ? popoverState.options.length - 1 : i - 1)
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
    }, [script, renderScript, popoverState, autocompleteSelectionIdx, editScript])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            setPopoverState(undefined)
        }
        editor.addEventListener('blur', listener)
        return () => { editor.removeEventListener('blur', listener) }
    }, [])

    useEffect(() => {
        let hoveredToken: AnnotatedToken | undefined
        const listener = (event: MouseEvent): void => {
            for (const elem of document.elementsFromPoint(event.clientX, event.clientY)) {
                let token: AnnotatedToken | undefined, name, value
                if ((token = spanTokenMapRef.current.get(elem)) !== undefined && token.token.type === 'identifier' && (name = token.token.value) && (value = typeEnvironment.get(name)) !== undefined) {
                    hoveredToken = token
                    const opts = {
                        location: token.location,
                        name,
                        value,
                    }
                    const elemOffset = totalOffset(elem).left
                    setTimeout(() => {
                        if (hoveredToken === token) {
                            setPopoverState({
                                kind: 'documentation',
                                ...opts,
                                element: createDocumentationPopover(colors, editorRef.current!, elemOffset),
                            })
                        }
                    }, 500)
                    return
                }
                if (popoverState?.kind === 'documentation' && popoverState.element === elem) {
                    hoveredToken = undefined
                    return
                }
            }
            hoveredToken = undefined
            if (popoverState?.kind === 'documentation') {
                setPopoverState(undefined)
            }
        }
        document.addEventListener('mousemove', listener)
        return () => { document.removeEventListener('mousemove', listener) }
    }, [colors, typeEnvironment, popoverState])

    const borderColor = useResultsColor(colorKey(results))

    return (
        <div style={{ marginTop: '0.25em' }}>
            <pre
                id="test-editor-body"
                style={{
                    ...codeStyle(colors),
                    caretColor: TestUtils.shared.isTesting ? 'transparent' : colors.textMain,
                    border: `1px solid ${borderColor}`,
                    borderRadius: TestUtils.shared.isTesting ? 0 : (results.length > 0 ? '5px 5px 0 0' : '5px'),
                }}
                ref={(e) => {
                    editorRef.current = e
                    if (eRef !== undefined) {
                        eRef.current = e
                    }
                }}
                contentEditable="plaintext-only"
                spellCheck="false"
            />
            <DisplayResults results={results} editor={true} />
            {popoverState === undefined
                ? null
                : createPortal(
                    popoverState.kind === 'autocomplete'
                        ? (
                                <Autocomplete
                                    state={popoverState}
                                    selectionIdx={autocompleteSelectionIdx}
                                    setSelectionIdx={setAutocompleteSelectionIdx}
                                    apply={(i) => { popoverState.apply(i) }}
                                />
                            )
                        : (
                                <linkContext.Provider value="link">
                                    <LongFormDocumentation name={popoverState.name} value={popoverState.value} />
                                </linkContext.Provider>
                            ),
                    popoverState.element,
                )}
        </div>
    )
}

export function codeStyle(colors: Colors): CSSProperties {
    return {
        whiteSpace: 'pre-wrap',
        fontFamily: 'Inconsolata, monospace',
        fontWeight: 500,
        lineHeight: '175%',
        margin: 0,
        padding: '1em',
        backgroundColor: colors.background,
    }
}

function colorKey(results: EditorResult[]): 'r' | 'o' | 'g' | 's' {
    switch (true) {
        case results.some(r => r.kind === 'error'):
            return 'r'
        case results.some(r => r.kind === 'warning'):
            return 'o'
        case results.some(r => r.kind === 'success'):
            return 'g'
        default:
            return 's'
    }
}

function useResultsColor(cKey: 'r' | 'o' | 'g' | 's'): string {
    const colors = useColors()
    switch (cKey) {
        case 'r':
            return colors.hueColors.red
        case 'o':
            return colors.hueColors.orange
        case 'g':
            return colors.hueColors.green
        case 's':
            return colors.borderShadow
    }
}

export function DisplayResults(props: { results: EditorResult[], editor: boolean }): ReactNode | undefined {
    const colors = useColors()
    const cKey = colorKey(props.results)
    const color = useResultsColor(cKey)
    if (props.results.length === 0) {
        return undefined
    }
    const border = `2px solid ${color}`
    const style = {
        ...codeStyle(colors),
        borderRadius: TestUtils.shared.isTesting ? 0 : (props.editor ? '0 0 5px 5px' : '5px'),
        backgroundColor: colors.slightlyDifferentBackground,
        color: colors.textMain,
        borderTop: props.editor ? 'none' : border,
        borderRight: border,
        borderBottom: border,
        borderLeft: border,
        marginTop: props.editor ? '0' : '0.25em',
    }
    return (
        <div id="test-editor-result" className={`color-${cKey}`}>
            <pre style={style}>
                {props.results.map((error, _, errors) => `${errors.length > 1 ? '- ' : ''}${longMessage(error, props.editor)}`).join('\n')}
            </pre>
        </div>
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
