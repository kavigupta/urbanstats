import React, { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { DefaultMap } from '../utils/DefaultMap'

import { getRange, locationsEqual, Range, setRange, stringIndexToLocation } from './editor-utils'
import { InterpretationError, renderLocInfo } from './interpreter'
import { AnnotatedToken, lex, LocInfo, SingleLocation } from './lexer'
import { locationOfLastExpression, ParseError, parseTokens, UrbanStatsASTStatement } from './parser'
import { renderValue, USSValue } from './types-values'

import '@fontsource/inconsolata/500.css'

type Execute = (expr: UrbanStatsASTStatement) => USSValue

export type ValueChecker = (value: USSValue) => { ok: true } | { ok: false, problem: string }

// If we do a different default every time, the component will keep outputting a new script and go into a loop
const defaultCheckValue: ValueChecker = () => ({ ok: true })
const defaultAutoCompleteValue: string[] = []

export function Editor(
    {
        script,
        setScript,
        execute,
        autocomplete = defaultAutoCompleteValue,
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

    const [result, setResult] = useState<Result>({ result: 'failure', errors: ['No input'] })

    const renderScript = useCallback((newScript: string, newRange: Range | undefined) => {
        let collapsedRangeIndex: number | undefined
        if (newRange !== undefined && newRange.start === newRange.end) {
            collapsedRangeIndex = newRange.start
        }
        return stringToHtml(newScript, colors, execute, checkValue, {
            collapsedRangeIndex,
            options: () => autocomplete,
            apply: () => undefined,
        })
    }, [colors, execute, checkValue, autocomplete])

    const displayScript = useCallback(() => {
        const editor = editorRef.current!
        const range = getRange(editor)
        const { html, result: newResult } = renderScript(script, range)
        if (editor.innerHTML !== html) {
            editor.innerHTML = html
            if (range !== undefined) {
                setRange(editor, range)
            }
        }
        setResult(newResult)
    }, [renderScript, script])

    useEffect(displayScript, [displayScript])

    useEffect(() => {
        const listener = (): void => {
            displayScript()
        }
        document.addEventListener('selectionchange', listener)
        return () => { document.removeEventListener('selectionchange', listener) }
    }, [displayScript])

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
                const { html, result: newResult } = renderScript(newScript, newRange)
                setResult(newResult)
                editor.innerHTML = html
                setRange(editor, newRange)
                setScript(newScript)
            }

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
        }
        editor.addEventListener('keydown', listener)
        return () => { editor.removeEventListener('keydown', listener) }
    }, [script, setScript, renderScript])

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
    fontFamily: 'Inconsolata, monospace',
    fontWeight: 500,
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
    const string = domParser.parseFromString(
        html
            .replaceAll(/<div.+?\/div>/g, '') // Everything inside a div is an autocomplete box
            .replaceAll(/<.*?>/g, ''),
        'text/html',
    ).documentElement.textContent!
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

interface AutocompleteMenu {
    action: (action: 'up' | 'down' | 'accept') => void
    attachListeners: () => void // call once the returned html is rendered
}

function stringToHtml(
    string: string,
    colors: Colors,
    execute: Execute,
    checkValue: ValueChecker,
    autocomplete: {
        collapsedRangeIndex: number | undefined
        options: (fragment: string) => string[]
        apply: (completion: string, index: number) => void // Insert `completion` (the rest of the option) at `index`.
    },
): {
        html: string
        result: Result
        autocomplete: AutocompleteMenu | undefined
    } {
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

    let autocompleteLocation: SingleLocation | undefined

    if (autocomplete.collapsedRangeIndex !== undefined) {
        autocompleteLocation = stringIndexToLocation(lines, autocomplete.collapsedRangeIndex)
    }

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
        const style: Record<string, string> = { position: 'relative' }
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

    let autocompleteMenu: AutocompleteMenu | undefined

    function maybeAutocompleteMenu(token: AnnotatedToken): string {
        if (autocompleteLocation !== undefined && token.token.type === 'identifier' && locationsEqual(token.location.end, autocompleteLocation)) {
            return `<div contenteditable="false" style="position:absolute;top:100%;left:100%;user-select:none;">hi</div>`
        }
        else {
            return ''
        }
    }

    // Insert lex spans
    for (const token of lexTokens) {
        if (token.token.type === 'operator' && token.token.value === 'EOL') {
            continue
        }
        for (const pos of ['start', 'end'] as const) {
            const loc = token.location.shifted[pos]
            const line = lines[loc.lineIdx]
            const tag = pos === 'start' ? `${span(token.token)}${maybeAutocompleteMenu(token)}` : `</span>`
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

    return { html, result, autocomplete: autocompleteMenu }
}
