import React, { ReactNode, RefObject, useEffect, useRef, useState } from 'react'

import { emptyContext } from '../../unit/urban-stats-script-utils'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { DefaultMap } from '../utils/DefaultMap'

import { execute, InterpretationError } from './interpreter'
import { AnnotatedToken, lex, LocInfo } from './lexer'
import { ParseError, parseTokens, UrbanStatsASTStatement } from './parser'
import { USSRawValue, USSValue } from './types-values'

export function Editor(props: { script: string, setScript: (script: string) => void }): ReactNode {
    const colors = useColors()

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

                // Traverse up the tree, counting text content of previous siblings along the way
                function positionInEditor(node: Node, offset: number): number {
                    console.log(node.nodeName, JSON.stringify(node.textContent), offset)
                    while (node !== editor) {
                        let sibling = node.previousSibling
                        while (sibling !== null) {
                            offset += sibling.textContent?.length ?? 0
                            sibling = sibling.previousSibling
                        }
                        node = node.parentNode!
                    }
                    console.log(offset)
                    return offset
                }

                return { start: positionInEditor(range.startContainer, range.startOffset), end: positionInEditor(range.endContainer, range.endOffset) }
            }
        }

        return undefined
    }

    function setRange({ start, end }: { start: number, end: number }): void {
        const editor = editorRef.current!

        // Inverse of `positionInEditor`
        // Traverse down the tree, always keeping the text content behind us lte position
        function getContainerOffset(position: number): [Node, number] {
            let node: Node = editor
            let offset = 0
            while (node.childNodes.length > 0) {
                node = node.childNodes.item(0)
                while (offset + (node.textContent?.length ?? 0) < position && node.nextSibling !== null) {
                    offset += (node.textContent?.length ?? 0)
                    node = node.nextSibling
                }
            }
            console.log(position, node.nodeName, JSON.stringify(node.textContent), position - offset)
            return [node, position - offset]
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

    // start at the lowest state
    const [global, setGlobal] = useState<Result>({ result: 'lexFailure' })

    useEffect(() => {
        const editor = editorRef.current!
        const { html, result } = stringToHtml(props.script, colors)
        if (editor.innerHTML !== html) {
            const range = getRange()
            editor.innerHTML = html
            if (range !== undefined) {
                setRange(range)
            }
        }
        setGlobal((existing) => {
            if (resultPriority[result.result] <= resultPriority[existing.result]) {
                return result
            }
            else {
                return existing
            }
        })
    }, [props.script, colors])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            props.setScript(htmlToString(editor.innerHTML))
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [props.setScript])

    return (
        <>
            <InnerEditor editorRef={editorRef} caretColor={colors.textMain} />
            <DisplayResult result={global} />
        </>
    )
}

// eslint-disable-next-line no-restricted-syntax -- Needs to be capitalized to work with JSX
const InnerEditor = React.memo(function InnerEditor(props: { editorRef: RefObject<HTMLPreElement>, caretColor: string }) {
    return (
        <pre
            style={{
                padding: '10px',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                caretColor: props.caretColor,
                lineHeight: '175%',
            }}
            ref={props.editorRef}
            contentEditable="plaintext-only"
            dangerouslySetInnerHTML={{ __html: '' }}
            spellCheck="false"
        />
    )
})

function DisplayResult(props: { result: Result }): ReactNode {
    const colors = useColors()
    if (props.result.result === 'success') {
        return (
            <div style={{ backgroundColor: colors.hueColors.green }}>
                Success
                {' '}
                {props.result.value?.toString()}
            </div>
        )
    }
    else {
        return (
            <div style={{ backgroundColor: colors.hueColors.red }}>
                {props.result.result}
                {' '}
                {props.result.globalError}
            </div>
        )
    }
}

function htmlToString(html: string): string {
    const domParser = new DOMParser()
    const string
        = domParser.parseFromString(html
            .replaceAll(/<.*?>/g, ''), 'text/html').documentElement.textContent!
    console.log({ html, string })
    return string
}

const htmlReplacements: [string, string][] = [
    ['&', '&amp;'],
    ['<', '&lt;'],
    ['>', '&gt;'],
    ['"', '&quot;'],
    ['\'', '&#039;'],
]

function escapeStringForHTML(string: string): string {
    return htmlReplacements.reduce((str, [find, replace]) => str.replaceAll(find, replace), string)
}

type Result = { result: 'success', value: USSRawValue } | { result: 'lexFailure' | 'parseFailure' | 'execFailure', globalError?: string }

const resultPriority = {
    success: 0,
    execFailure: 0,
    parseFailure: 1,
    lexFailure: 2,
} as const

function stringToHtml(string: string, colors: Colors): { html: string, result: Result } {
    if (!string.endsWith('\n')) {
        string = `${string}\n`
    }

    const lexTokens = lex(string)

    function shift(tokens: { location: LocInfo }[], line: number, offset: number, delta: number, kind: 'replace' | 'insertBefore'): void {
        for (const token of tokens) {
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
                shift(lexTokens, line, offset + accumulatedDelta, delta, 'replace')
                accumulatedDelta += delta
                return replace
            })
        }
    }

    for (const [find, replace] of htmlReplacements) {
        replaceAll(find, replace)
    }

    const brackets = new DefaultMap<string, number>(() => 0)

    function span(token: AnnotatedToken['token'] | ParseError): string {
        const style: Record<string, string> = {}
        let title: string | undefined

        switch (token.type) {
            case 'bracket':
                function levelColor(level: number): string {
                    switch (level % 3) {
                        case 0:
                            return colors.hueColors.yellow
                        case 1:
                            return colors.hueColors.pink
                        case 2:
                            return colors.hueColors.blue
                        default:
                            throw Error()
                    }
                }

                if (token.value === '(' || token.value === '[' || token.value === '{') {
                    const level = Array.from(brackets.values()).reduce((sum, next) => sum + next, 0)
                    brackets.set(token.value, brackets.get(token.value) + 1)
                    style.color = levelColor(level)
                }
                else {
                    const openEquivalent = ({
                        ')': '(',
                        ']': '[',
                        '}': '{',
                    } as const)[token.value]
                    if (brackets.get(openEquivalent) === 0) {
                        style.color = colors.hueColors.red
                    }
                    else {
                        brackets.set(openEquivalent, brackets.get(openEquivalent) - 1)
                        const level = Array.from(brackets.values()).reduce((sum, next) => sum + next, 0)
                        style.color = levelColor(level)
                    }
                }
                break
            case 'number':
                style.color = colors.hueColors.blue
                break
            case 'string':
                style.color = colors.hueColors.green
                break
            case 'error':
                // Safari doesn't support the shorthand 🙄
                style['text-decoration-color'] = colors.hueColors.red
                style['text-decoration-style'] = 'wavy'
                style['text-decoration-line'] = 'underline'

                title = token.value
                break
            case 'operator':
                style.color = colors.hueColors.orange
                break
        }
        return `<span style="${Object.entries(style).map(([key, value]) => `${key}:${value};`).join('')}" ${title !== undefined ? `title="${escapeStringForHTML(title)}"` : ''}>`
    }

    // Insert lex spans
    for (const token of lexTokens) {
        if (token.token.type === 'operator' && token.token.value === 'EOL') {
            continue
        }
        for (const pos of ['start', 'end'] as const) {
            const loc = token.location[pos]
            const line = lines[loc.lineIdx]
            const tag = pos === 'start' ? span(token.token) : `</span>`
            lines[loc.lineIdx] = `${line.slice(0, loc.colIdx)}${tag}${line.slice(loc.colIdx)}`
            shift(lexTokens, loc.lineIdx, loc.colIdx, tag.length, pos === 'start' ? 'replace' : 'insertBefore')
        }
    }

    let result: Result

    if (lexTokens.some(token => token.token.type === 'error')) {
        result = { result: 'lexFailure' }
    }
    else if (lexTokens.every(token => token.token.type === 'operator' && token.token.value === 'EOL')) {
        result = { result: 'parseFailure', globalError: 'No input' }
    }
    else {
        const parsed = parseTokens(lexTokens)

        if (parsed.type === 'error') {
            for (const error of parsed.errors) {
                for (const pos of ['start', 'end'] as const) {
                    const loc = error.location[pos]
                    const line = lines[loc.lineIdx]
                    const tag = pos === 'start' ? span(error) : `</span>`
                    lines[loc.lineIdx] = `${line.slice(0, loc.colIdx)}${tag}${line.slice(loc.colIdx)}`
                    shift(parsed.errors, loc.lineIdx, loc.colIdx, tag.length, pos === 'start' ? 'replace' : 'insertBefore')
                }
            }
            result = { result: 'parseFailure' }
        }
        else {
            try {
                const executed = execute(parsed, emptyContext())
                result = { result: 'success', value: executed.value }
            }
            catch (e) {
                if (e instanceof InterpretationError) {
                    result = { result: 'execFailure', globalError: e.shortMessage }
                    for (const pos of ['start', 'end'] as const) {
                        const loc = e.location[pos]
                        const line = lines[loc.lineIdx]
                        const tag = pos === 'start' ? span({ type: 'error', value: e.shortMessage }) : `</span>`
                        lines[loc.lineIdx] = `${line.slice(0, loc.colIdx)}${tag}${line.slice(loc.colIdx)}`
                        shift([e], loc.lineIdx, loc.colIdx, tag.length, pos === 'start' ? 'replace' : 'insertBefore')
                    }
                }
                else {
                    console.error('Unknown error while evaluating script', e)
                    result = { result: 'execFailure', globalError: 'Unknown error' }
                }
            }
        }
    }

    const html = lines.join('\n')

    console.log({ string, lines, html, lexResults: lexTokens })
    return { html, result }
}
