import '@fontsource/inconsolata/500.css'

import stableStringify from 'json-stable-stringify'
import React, { CSSProperties, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'

import { colorThemes } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { getRange, Range, setRange, styleToString } from '../urban-stats-script/editor-utils'
import { AttributedText, defaultAttributes, TextSegment } from '../utils/AttributedText'
import { TestUtils } from '../utils/TestUtils'

interface Script {
    text: AttributedText
}

function makeScript(text: AttributedText): Script {
    // if (text.length === 0) {
    //     return {
    //         text: [
    //             {
    //                 string: '\n',
    //                 attributes: defaultAttributes,
    //             },
    //         ],
    //     }
    // }
    // const last = text[text.length - 1]
    // if (!last.string.endsWith('\n')) {
    //     text = [...text.slice(0, text.length - 1), { ...last, string: `${last.string}\n` }]
    // }
    return { text }
}

function renderText(script: Script): Node[] {
    console.log(script.text)
    let line = document.createElement('div')
    const result: Node[] = [line]
    for (const segment of script.text) {
        segment.string.split('\n').forEach((textLine, index, textLines) => {
            const span = document.createElement('span')
            span.style.color = segment.attributes.color
            span.style.fontSize = `${segment.attributes.fontSize.pixels}px`
            span.appendChild(document.createTextNode(textLine))
            if (index === 0) {
                line.appendChild(span)
            }
            else {
                line.appendChild(document.createElement('br'))
                line = document.createElement('div')
                result.push(line)
                line.appendChild(span)
            }
        })
    }
    line.appendChild(document.createElement('br'))
    return result
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

function nodeContent(editor: HTMLDivElement): AttributedText {
    const result: AttributedText = []
    let deferred: { string: string, attributes: Partial<TextSegment['attributes']> }[] = []

    let last: TextSegment | undefined

    const push = (segment: TextSegment): void => {
        if (last && stableStringify(last.attributes) === stableStringify(segment.attributes)) {
            last.string += segment.string
        }
        else {
            result.push(segment)
            last = segment
        }
    }

    const helper = (node: Node): void => {
        console.log(node)
        if ('isContentEditable' in node && !node.isContentEditable) {
            return
        }
        const style = 'style' in node ? node.style as HTMLElement['style'] : undefined
        const color = style && (style.color === '' ? undefined : style.color)
        const fontSize = style && parseFontSize(style.fontSize)

        let nodeText = ''
        if (node instanceof HTMLBRElement) {
            nodeText = '\n'
        }
        else if (node.nodeType === Node.TEXT_NODE) {
            nodeText = node.textContent ?? ''
        }

        if (last === undefined && (color === undefined || fontSize === undefined)) {
            deferred.push({
                string: nodeText,
                attributes: {
                    color,
                    fontSize,
                },
            })
        }
        else {
            for (const defer of deferred) {
                push({
                    string: defer.string,
                    attributes: {
                        color: defer.attributes.color ?? color ?? last!.attributes.color,
                        fontSize: defer.attributes.fontSize ?? fontSize ?? last!.attributes.fontSize,
                    },
                })
            }
            deferred = []
            push({
                string: nodeText,
                attributes: {
                    color: color ?? last!.attributes.color,
                    fontSize: fontSize ?? last!.attributes.fontSize,
                },
            })
        }

        for (const child of Array.from(node.childNodes)) {
            helper(child)
        }
    }

    for (const node of Array.from(editor.childNodes)) {
        helper(node)
    }
    if (deferred.length > 0) {
        for (const defer of deferred) {
            push({
                string: defer.string,
                attributes: {
                    color: defer.attributes.color ?? defaultAttributes.color,
                    fontSize: defer.attributes.fontSize ?? defaultAttributes.fontSize,
                },
            })
        }
    }
    if (result.length > 0 && result[result.length - 1].string.endsWith('\n')) {
        result[result.length - 1].string = result[result.length - 1].string.slice(0, result[result.length - 1].string.length - 1)
    }
    return result
}

function parseFontSize(string: string): { pixels: number } | undefined {
    if (string.endsWith('px')) {
        const pixels = parseFloat(string.slice(0, string.length - 2))
        if (isFinite(pixels)) {
            return { pixels }
        }
    }
    return undefined
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

    const editorRef = useRef<HTMLDivElement | null>(null)

    const renderScript = useCallback((newScript: Script) => {
        const fragment = renderText(newScript)
        // if (newScript.text.length === 1 && newScript.text[0].string === '\n' && editable) {
        //     fragment.push(createPlaceholder())
        // }
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
            const newScript = makeScript(nodeContent(editor))
            setText(newScript.text)
            setSelection(range)
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [colors, editScript, setText, setSelection])

    return (
        <div
            style={{
                ...style,
                caretColor: TestUtils.shared.isTesting ? 'transparent' : colors.textMain,
            }}
            ref={editorRef}
            contentEditable={editable ? 'true' : 'false'}
            spellCheck="false"
        />
    )
}
