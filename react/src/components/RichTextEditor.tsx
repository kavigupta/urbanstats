import '@fontsource/inconsolata/500.css'

import { MathJaxBaseContext, MathJaxSubscriberProps } from 'better-react-mathjax'
import React, { CSSProperties, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { getRange, Range, setRange, styleToString } from '../urban-stats-script/editor-utils'
import { AttributedText, charAt, concat, getAttributes, length, replaceRange, replaceSelection, setAttributes, StringAttributes, stringAttributeSchemas } from '../utils/AttributedText'
import { TestUtils } from '../utils/TestUtils'
import { assert } from '../utils/defensive'

interface Script {
    text: AttributedText
}

function makeScript(text: AttributedText): Script {
    if (charAt(text, length(text) - 1) !== '\n') {
        text = concat([text, [{ kind: 'string', attributes: getAttributes(text, null), string: '\n' }]])
    }
    return { text }
}

function renderText(script: Script, mjPromise: MathJaxSubscriberProps | undefined): Node[] {
    return script.text.map((segment) => {
        const span = document.createElement('span')
        switch (segment.kind) {
            case 'string':
                span.textContent = segment.string
                break
            case 'formula':
                assert(mjPromise?.version === 3, 'MathJax 3 context must be present to render formulas')
                span.textContent = `\\(${segment.formula}\\)`
                void mjPromise.promise.then(mathJax =>
                    mathJax.startup.promise.then(() => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Mathjax
                        mathJax.typesetClear([span])
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- Mathjax
                        mathJax.typesetPromise([span])
                    }),
                )
                span.contentEditable = 'false'
                span.setAttribute('data-formula', segment.formula)
                span.setAttribute('data-content', ' ')
                break
        }
        span.style.color = segment.attributes.color
        span.style.fontSize = `${segment.attributes.fontSize.pixels}px`
        span.style.fontFamily = segment.attributes.fontFamily
        span.style.fontWeight = segment.attributes.fontWeight
        span.style.fontStyle = segment.attributes.fontStyle
        span.style.textDecoration = segment.attributes.textDecoration
        return span
    })
}

export function createPlaceholder(colors: Colors): HTMLElement {
    const style = {
        'position': 'absolute',
        'user-select': 'none',
        'white-space': 'pre',
        'color': colors.hueColors.grey,
        'pointer-events': 'none',
        'top': '0.5em',
    }

    const result = document.createElement('span')
    result.setAttribute('contenteditable', 'false')
    result.setAttribute('style', styleToString(style))

    result.textContent = 'Enter Text...'

    return result
}

function getStyle(span: HTMLSpanElement): StringAttributes {
    return {
        color: span.style.color,
        fontSize: parseFontSize(span.style.fontSize),
        fontFamily: parseFontFamily(span.style.fontFamily),
        fontStyle: stringAttributeSchemas.fontStyle.parse(span.style.fontStyle),
        fontWeight: stringAttributeSchemas.fontWeight.parse(span.style.fontWeight),
        textDecoration: stringAttributeSchemas.textDecoration.parse(span.style.textDecoration),
    }
}

function nodeContent(node: Node, requireContentEditable: boolean): AttributedText {
    if (node instanceof HTMLSpanElement) {
        if (!node.isContentEditable) {
            let formula
            if ((formula = node.getAttribute('data-formula'))) {
                return [
                    {
                        kind: 'formula',
                        formula,
                        attributes: getStyle(node),
                    },
                ]
            }
            if (requireContentEditable) {
                return []
            }
        }
        return [
            {
                kind: 'string',
                string: node.textContent ?? '',
                attributes: getStyle(node),
            },
        ]
    }
    if (node instanceof HTMLElement) {
        if (requireContentEditable && !node.isContentEditable) {
            return []
        }
        return concat(Array.from(node.childNodes).map(child => nodeContent(child, requireContentEditable)))
    }
    else {
        throw new Error(`unknown node ${node.nodeType}`)
    }
}

function parseFontSize(string: string): { kind: 'pixels', pixels: number } {
    if (string.endsWith('px')) {
        const pixels = parseFloat(string.slice(0, string.length - 2))
        if (isFinite(pixels)) {
            return { kind: 'pixels', pixels }
        }
    }
    throw new Error(`Invalid font size ${string}`)
}

function parseFontFamily(stirng: string): string {
    // contenteditable sometiems puts quotes, we should remove them
    return stirng.replace(/(^")|("$)/g, '')
}

export function RichTextEditor(
    { text, setText, selection, setSelection, editable, style, cursorAttributes, eRef }: {
        text: AttributedText
        setText: (newText: AttributedText) => void
        selection: Range | null
        setSelection: (newRange: Range | null) => void
        editable: boolean
        style: CSSProperties
        cursorAttributes: StringAttributes
        eRef?: React.MutableRefObject<HTMLPreElement | null>
    },
): ReactNode {
    const setSelectionRef = useRef(setSelection)
    setSelectionRef.current = setSelection
    const selectionRef = useRef(selection)
    selectionRef.current = selection

    const script = useMemo(() => makeScript(text), [text])

    const colors = useColors()

    const editorRef = useRef<HTMLPreElement | null>(null)

    const mjPromise = useContext(MathJaxBaseContext)

    const renderScript = useCallback((newScript: Script) => {
        const fragment = renderText(newScript, mjPromise)
        if (newScript.text.length === 1 && charAt(newScript.text, 0) === '\n' && editable) {
            fragment.push(createPlaceholder(colors))
        }
        const editor = editorRef.current!
        editor.replaceChildren(...fragment)
        // Usually you want to set the selection after this, since it has been reset
    }, [editable, colors, mjPromise])

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

    const editScript = useCallback((newUss: AttributedText, newRange: Range) => {
        const newScript = makeScript(newUss)
        renderScript(newScript)
        setRange(editorRef.current!, newRange)
        setText(newScript.text)
        setSelection(newRange)
    }, [renderScript, setText, setSelection])

    useEffect(() => {
        const listener = (): void => {
            // These events are often spurious

            const range = getRange(editorRef.current!)
            if (range?.start !== selectionRef.current?.start || range?.end !== selectionRef.current?.end) {
                setSelectionRef.current(range)
            }
        }
        document.addEventListener('selectionchange', listener)
        return () => {
            document.removeEventListener('selectionchange', listener)
        }
    }, []) // Rebinding can cause problems with multiple editors as they stop listening when one editor changes selection

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (e: Event): void => {
            const eventData = (e as InputEvent).data
            const range = getRange(editor)
            let newText = nodeContent(editor, true)
            if (range !== null && eventData !== null) {
                newText = setAttributes(newText, { start: range.start - eventData.length, end: range.end }, cursorAttributes)
            }
            const newScript = makeScript(newText)
            setText(newScript.text)
            setSelection(range)
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [colors, editScript, setText, setSelection, cursorAttributes])

    return (
        <pre
            style={{
                ...style,
                caretColor: TestUtils.shared.isTesting ? 'transparent' : colors.textMain,
                margin: 0,
            }}
            ref={(e) => {
                editorRef.current = e
                if (eRef !== undefined) {
                    eRef.current = e
                }
            }}
            contentEditable={editable ? 'plaintext-only' : 'false'}
            spellCheck="false"
            onPaste={(e) => {
                e.stopPropagation()
                e.preventDefault()

                if (selection === null) {
                    console.warn('Pasting with no selection. (How did this happen?)')
                    return
                }

                let pastedText: AttributedText | undefined

                if (e.clipboardData.types.includes('text/html')) {
                    const html = e.clipboardData.getData('text/html')
                    try {
                        const fragment = new DOMParser().parseFromString(html, 'text/html')
                        pastedText = nodeContent(fragment.body, false)
                    }
                    catch {
                        console.warn('Parsing HTML for paste failed')
                    }
                }

                if (pastedText === undefined && e.clipboardData.types.includes('text/plain')) {
                    const plain = e.clipboardData.getData('text/plain')
                    pastedText = [{ kind: 'string', string: plain, attributes: getAttributes(script.text, selection) }]
                }

                if (pastedText !== undefined) {
                    editScript(replaceRange(script.text, selection, pastedText), replaceSelection(selection, length(pastedText)))
                }
            }}
        />
    )
}
