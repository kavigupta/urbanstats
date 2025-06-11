import React, { CSSProperties, ReactNode, RefObject, useEffect, useRef, useState } from 'react'

import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { DefaultMap } from '../utils/DefaultMap'

import { InterpretationError, renderLocInfo } from './interpreter'
import { AnnotatedToken, lex, LocInfo } from './lexer'
import { locationOfLastExpression, ParseError, parseTokens, UrbanStatsASTStatement } from './parser'
import { renderValue, USSValue } from './types-values'

interface Range { start: number, end: number }

type Execute = (expr: UrbanStatsASTStatement) => USSValue

export type ValueChecker = (value: USSValue) => { ok: true } | { ok: false, problem: string }

// If we do a different default every time, the component will keep outputting a new script and go into a loop
const defaultCheckValue: ValueChecker = () => ({ ok: true })

export function Editor(
    {
        script,
        setScript,
        execute,
        autocomplete = [],
        checkValue = defaultCheckValue,
        showOutput = true,
    }:
    {
        script: string
        setScript: (newScript: string) => void
        execute: Execute
        autocomplete?: string[]
        checkValue?: ValueChecker
        showOutput?: boolean
    },
): ReactNode {
    const colors = useColors()

    const editorRef = useRef<HTMLPreElement>(null)

    const rangeRef = useRef<Range | undefined>()

    const [result, setResult] = useState<Result>({ result: 'failure', errors: ['No input'] })

    function getRange(): Range | undefined {
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
                    while (node !== editor) {
                        let sibling = node.previousSibling
                        while (sibling !== null) {
                            offset += sibling.textContent?.length ?? 0
                            sibling = sibling.previousSibling
                        }
                        node = node.parentNode!
                    }
                    return offset
                }

                return { start: positionInEditor(range.startContainer, range.startOffset), end: positionInEditor(range.endContainer, range.endOffset) }
            }
        }

        return undefined
    }

    function setRange({ start, end }: Range): void {
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

    useEffect(() => {
        const editor = editorRef.current!
        const { html, result: newResult } = stringToHtml(script, colors, execute, checkValue)
        if (editor.innerHTML !== html) {
            const range = getRange()
            editor.innerHTML = html
            if (range !== undefined) {
                setRange(range)
            }
        }
        setResult(newResult)
    }, [script, colors, execute, checkValue])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            setScript(htmlToString(editor.innerHTML))
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [setScript])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (e: KeyboardEvent): void => {
            function editScript(newScript: string, newRange: Range): void {
                const { html, result: newResult } = stringToHtml(newScript, colors, execute, checkValue)
                setResult(newResult)
                editor.innerHTML = html
                setRange(newRange)
                setScript(newScript)
            }

            if (e.key === 'Tab') {
                e.preventDefault()
                const range = getRange()
                if (range !== undefined) {
                    editScript(
                        `${script.slice(0, range.start)}    ${script.slice(range.end)}`,
                        { start: range.start + 4, end: range.start + 4 },
                    )
                }
            }
            else if (e.key === 'Backspace') {
                const range = getRange()
                if (range !== undefined && range.start === range.end && range.start >= 4 && script.slice(range.start - 4, range.start) === '    ') {
                    e.preventDefault()
                    editScript(
                        `${script.slice(0, range.start - 4)}${script.slice(range.start)}`,
                        { start: range.start - 4, end: range.start - 4 },
                    )
                }
            }
        }
        editor.addEventListener('keydown', listener)
        return () => { editor.removeEventListener('keydown', listener) }
    }, [script, colors, setScript, execute, checkValue])

    const error = result.result === 'failure'

    return (
        <div style={{ margin: '2em' }}>
            <pre
                style={{
                    ...codeStyle,
                    caretColor: colors.textMain,
                    border: `1px solid ${error ? colors.hueColors.red : (showOutput ? colors.hueColors.green : colors.borderShadow)}`,
                    borderRadius: error || showOutput ? '5px 5px 0 0' : '5px',
                }}
                ref={editorRef}
                contentEditable="plaintext-only"
                spellCheck="false"
            />
            <DisplayResult result={result} showOutput={showOutput} />
        </div>
    )
}

const codeStyle: CSSProperties = {
    whiteSpace: 'pre-wrap',
    fontFamily: 'monospace',
    lineHeight: '175%',
    margin: 0,
    padding: '1em',
}

function DisplayResult(props: { result: Result, showOutput: boolean }): ReactNode {
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
    if (props.result.result === 'success') {
        if (props.showOutput) {
            return (
                <pre style={style(colors.hueColors.green)}>
                    {renderValue(props.result.value)}
                </pre>
            )
        }
        else {
            return null
        }
    }
    else {
        return (
            <pre style={style(colors.hueColors.red)}>
                {props.result.errors.map((error, _, errors) => `${errors.length > 1 ? '- ' : ''}${error}`).join('\n')}
            </pre>
        )
    }
}

function htmlToString(html: string): string {
    const domParser = new DOMParser()
    const string
        = domParser.parseFromString(html
            .replaceAll(/<.*?>/g, ''), 'text/html').documentElement.textContent!
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

type Result = { result: 'success', value: USSValue } | { result: 'failure', errors: string[] }

function stringToHtml(string: string, colors: Colors, execute: Execute, checkValue: ValueChecker): { html: string, result: Result } {
    if (!string.endsWith('\n')) {
        string = `${string}\n`
    }

    const lexTokens = lex(string)

    function shift(tokens: { location: LocInfo }[], line: number, offset: number, delta: number, kind: 'replace' | 'insertBefore'): void {
        for (const token of tokens) {
            for (const pos of ['start', 'end'] as const) {
                if (token.location.shifted[pos].lineIdx === line) {
                    if (
                        (kind === 'replace' && token.location.shifted[pos].colIdx > offset)
                        || (kind === 'insertBefore' && token.location.shifted[pos].colIdx >= offset)
                    ) {
                        token.location.shifted[pos].colIdx += delta
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
                style['text-decoration-skip-ink'] = 'none'

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
            const loc = token.location.shifted[pos]
            const line = lines[loc.lineIdx]
            const tag = pos === 'start' ? span(token.token) : `</span>`
            lines[loc.lineIdx] = `${line.slice(0, loc.colIdx)}${tag}${line.slice(loc.colIdx)}`
            shift(lexTokens, loc.lineIdx, loc.colIdx, tag.length, pos === 'start' ? 'replace' : 'insertBefore')
        }
    }

    let result: Result

    if (lexTokens.some(token => token.token.type === 'error')) {
        result = { result: 'failure', errors: lexTokens.flatMap(token => token.token.type === 'error' ? [`${token.token.value} at ${renderLocInfo(token.location)}`] : []) }
    }
    else if (lexTokens.every(token => token.token.type === 'operator' && token.token.value === 'EOL')) {
        result = { result: 'failure', errors: ['No input'] }
    }
    else {
        const parsed = parseTokens(lexTokens)

        if (parsed.type === 'error') {
            for (const error of parsed.errors) {
                for (const pos of ['start', 'end'] as const) {
                    const loc = error.location.shifted[pos]
                    const line = lines[loc.lineIdx]
                    const tag = pos === 'start' ? span(error) : `</span>`
                    lines[loc.lineIdx] = `${line.slice(0, loc.colIdx)}${tag}${line.slice(loc.colIdx)}`
                    shift(parsed.errors, loc.lineIdx, loc.colIdx, tag.length, pos === 'start' ? 'replace' : 'insertBefore')
                }
            }
            result = { result: 'failure', errors: parsed.errors.map(e => `${e.value} at ${renderLocInfo(e.location)}`) }
        }
        else {
            try {
                const value = execute(parsed)
                const checkResult = checkValue(value)
                if (!checkResult.ok) {
                    throw new InterpretationError(checkResult.problem, locationOfLastExpression(parsed))
                }
                result = { result: 'success', value }
            }
            catch (e) {
                if (e instanceof InterpretationError) {
                    result = { result: 'failure', errors: [e.message] }
                    for (const pos of ['start', 'end'] as const) {
                        const loc = e.location.shifted[pos]
                        const line = lines[loc.lineIdx]
                        const tag = pos === 'start' ? span({ type: 'error', value: e.shortMessage }) : `</span>`
                        lines[loc.lineIdx] = `${line.slice(0, loc.colIdx)}${tag}${line.slice(loc.colIdx)}`
                        shift([e], loc.lineIdx, loc.colIdx, tag.length, pos === 'start' ? 'replace' : 'insertBefore')
                    }
                }
                else {
                    console.error('Unknown error while evaluating script', e)
                    result = { result: 'failure', errors: ['Unknown error'] }
                }
            }
        }
    }

    const html = lines.join('\n')

    return { html, result }
}
