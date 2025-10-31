import '@fontsource/inconsolata/500.css'

import React, { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'

import { colorThemes } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { getRange, Range, setRange, styleToString } from '../urban-stats-script/editor-utils'
import { AttributedText, concat, getAttributes, length, replaceRange, replaceSelection } from '../utils/AttributedText'
import { TestUtils } from '../utils/TestUtils'

interface Script {
    text: AttributedText
}

function makeScript(text: AttributedText): Script {
    if (text.length === 0) {
        throw new Error('text length 0 unsupported')
    }
    const last = text[text.length - 1]
    if (!last.string.endsWith('\n')) {
        text = [...text.slice(0, text.length - 1), { ...last, string: `${last.string}\n` }]
    }
    return { text }
}

function renderText(script: Script): Node[] {
    return script.text.map((segment) => {
        const span = document.createElement('span')
        span.textContent = segment.string
        span.style.color = segment.attributes.color
        span.style.fontSize = `${segment.attributes.fontSize.pixels}px`
        span.style.fontFamily = segment.attributes.fontFamily
        return span
    })
}

export function createPlaceholder(): HTMLElement {
    const style = {
        'position': 'absolute',
        'user-select': 'none',
        'white-space': 'pre',
        'color': colorThemes['Light Mode'].hueColors.grey,
        'pointer-events': 'none',
        'top': '0.5em',
    }

    const result = document.createElement('span')
    result.setAttribute('contenteditable', 'false')
    result.setAttribute('style', styleToString(style))

    result.textContent = 'Enter Text...'

    return result
}

function nodeContent(node: Node, requireContentEditable: boolean): AttributedText {
    if (node instanceof HTMLSpanElement) {
        if (requireContentEditable && !node.isContentEditable) {
            return []
        }
        return [
            {
                string: node.textContent ?? '',
                attributes: {
                    color: node.style.color,
                    fontSize: parseFontSize(node.style.fontSize),
                    fontFamily: parseFontFamily(node.style.fontFamily),
                },
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

function parseFontSize(string: string): { pixels: number } {
    if (string.endsWith('px')) {
        const pixels = parseFloat(string.slice(0, string.length - 2))
        if (isFinite(pixels)) {
            return { pixels }
        }
    }
    throw new Error(`Invalid font size ${string}`)
}

function parseFontFamily(stirng: string): string {
    // contenteditable sometiems puts quotes, we should remove them
    return stirng.replace(/(^")|("$)/g, '')
}

export function RichTextEditor(
    { text, setText, selection, setSelection, editable, style }: {
        text: AttributedText
        setText: (newText: AttributedText) => void
        selection: Range | null
        setSelection: (newRange: Range | null) => void
        editable: boolean
        style: CSSProperties
    },
): ReactNode {
    const setSelectionRef = useRef(setSelection)
    setSelectionRef.current = setSelection

    const script = useMemo(() => makeScript(text), [text])

    const colors = useColors()

    const editorRef = useRef<HTMLPreElement | null>(null)

    const renderScript = useCallback((newScript: Script) => {
        const fragment = renderText(newScript)
        if (newScript.text.length === 1 && newScript.text[0].string === '\n' && editable) {
            fragment.push(createPlaceholder())
        }
        const editor = editorRef.current!
        editor.replaceChildren(...fragment)
        // Usually you want to set the selection after this, since it has been reset
    }, [editable])

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
            setSelectionRef.current(range)
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
            const newScript = makeScript(nodeContent(editor, true))
            setText(newScript.text)
            setSelection(range)
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [colors, editScript, setText, setSelection])

    return (
        <pre
            style={{
                ...style,
                caretColor: TestUtils.shared.isTesting ? 'transparent' : colors.textMain,
                margin: 0,
            }}
            ref={editorRef}
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
                    pastedText = [{ string: plain, attributes: getAttributes(script.text, selection) }]
                }

                if (pastedText !== undefined) {
                    editScript(replaceRange(script.text, selection, pastedText), replaceSelection(selection, length(pastedText)))
                }
            }}
        />
    )
}
