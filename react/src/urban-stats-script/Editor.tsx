import React, { ReactNode, RefObject, useEffect, useRef } from 'react'

import './uss.css'
import { lex } from './lexer'

export function Editor(props: { script: string, setScript: (script: string) => void }): ReactNode {
    const editorRef = useRef<HTMLPreElement>(null)

    const rangeRef = useRef<{ start: number, end: number } | undefined>()

    function getRange(): { start: number, end: number } | undefined {
        const editor = editorRef.current!
        const selection = window.getSelection()
        if (selection?.rangeCount === 1) {
            const range = selection.getRangeAt(0)
            if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
                if (editor === range.startContainer || editor === range.endContainer) {
                    return { start: 0, end: 0 }
                }

                function positionInEditor(node: Node, offset: number): number {
                    let parentInEditor = node
                    while (parentInEditor.parentNode !== editor) {
                        parentInEditor = parentInEditor.parentNode!
                    }
                    let result = offset
                    let sibling = parentInEditor.previousSibling
                    while (sibling !== null) {
                        result += sibling.textContent?.length ?? 0
                        sibling = sibling.previousSibling
                    }
                    return result
                }
                return { start: positionInEditor(range.startContainer, range.startOffset), end: positionInEditor(range.endContainer, range.endOffset) }
            }
        }

        return undefined
    }

    function setRange({ start, end }: { start: number, end: number }): void {
        const editor = editorRef.current!

        function getContainerOffset(position: number): [Node, number] {
            let total = 0
            for (const span of Array.from(editor.childNodes)) {
                const nodeLength = span.textContent?.length ?? 0
                if (total + nodeLength >= position) {
                    return [
                        span.childNodes[0] ?? span, // the text node of the span
                        position - total,
                    ]
                }
                total += nodeLength
            }
            throw new Error()
        }

        const selection = window.getSelection()!

        selection.removeAllRanges()

        const range = document.createRange()

        range.setStart(...getContainerOffset(start))
        range.setEnd(...getContainerOffset(end))

        selection.addRange(range)
    }

    useEffect(() => {
        const listener = (): void => {
            rangeRef.current = getRange()
        }
        document.addEventListener('selectionchange', listener)
        rangeRef.current = getRange()
        return () => { document.removeEventListener('selectionchange', listener) }
    }, [])

    useEffect(() => {
        const editor = editorRef.current!
        const newScript = stringToHtml(props.script)
        if (editor.innerHTML !== newScript) {
            const range = getRange()
            editor.innerHTML = newScript
            if (range !== undefined) {
                setRange(range)
            }
        }
    }, [props.script])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            props.setScript(htmlToString(editor.innerHTML))
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [props.setScript])

    return <InnerEditor editorRef={editorRef} />
}

// eslint-disable-next-line no-restricted-syntax -- Needs to be capitalized to work with JSX
const InnerEditor = React.memo(function InnerEditor(props: { editorRef: RefObject<HTMLPreElement> }) {
    return (
        <pre
            className="ussEditor"
            ref={props.editorRef}
            contentEditable="plaintext-only"
            dangerouslySetInnerHTML={{ __html: '' }}
        />
    )
})

function htmlToString(html: string): string {
    const domParser = new DOMParser()
    const string = html
        .replaceAll(/<.*?>/g, '')
        .split('\n')
        .map(line => domParser.parseFromString(line, 'text/html').documentElement.textContent)
        .join('\n')
    console.log({ html, string })
    return string
}

function stringToHtml(string: string): string {
    if (!string.endsWith('\n')) {
        string = `${string}\n`
    }

    const lexResults = lex(string)

    function shiftLex(line: number, offset: number, delta: number, kind: 'replace' | 'insertBefore'): void {
        for (const token of lexResults) {
            for (const pos of ['start', 'end'] as const) {
                if (token.location[pos].lineIdx === line) {
                    if (
                        (kind === 'replace' && token.location[pos].colIdx > offset)
                        || (kind === 'insertBefore' && token.location[pos].colIdx >= offset)
                    ) {
                        token.location[pos].colIdx += delta
                    }
                }
            }
        }
    }

    const lines = string.split('\n')

    function replaceAll(find: string, replace: string): void {
        const delta = replace.length - find.length
        for (let line = 0; line < lines.length; line++) {
            let accumulatedDelta = 0
            lines[line] = lines[line].replaceAll(find, (_, offset: number) => {
                shiftLex(line, offset + accumulatedDelta, delta, 'replace')
                accumulatedDelta += delta
                return replace
            })
        }
    }

    replaceAll('&', '&amp;')
    replaceAll('<', '&lt;')
    replaceAll('>', '&gt;')
    replaceAll('"', '&quot;')
    replaceAll('\'', '&#039;')

    // Insert lex spans
    for (const token of lexResults) {
        if (token.token.type === 'operator' && token.token.value === 'EOL') {
            continue
        }
        for (const pos of ['start', 'end'] as const) {
            const loc = token.location[pos]
            const line = lines[loc.lineIdx]
            const tag = pos === 'start' ? `<span class="${token.token.type}">` : `</span>`
            lines[loc.lineIdx] = `${line.slice(0, loc.colIdx)}${tag}${line.slice(loc.colIdx)}`
            shiftLex(loc.lineIdx, loc.colIdx, tag.length, 'insertBefore')
        }
    }

    const html = lines.join('\n')

    console.log({ string, lines, html, lexResults })
    return html
}
