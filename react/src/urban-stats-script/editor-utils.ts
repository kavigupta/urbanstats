import { Colors } from '../page_template/color-themes'
import { DefaultMap } from '../utils/DefaultMap'

import { InterpretationError, renderLocInfo } from './interpreter'
import { AnnotatedToken, lex, LocInfo, SingleLocation } from './lexer'
import { locationOfLastExpression, ParseError, parseTokens, UrbanStatsASTStatement } from './parser'
import { USSValue } from './types-values'

export function stringIndexToLocation(lines: string[], colIdx: number): SingleLocation {
    let lineIdx = 0
    while (lineIdx < lines.length - 1 && lines[lineIdx].length < colIdx) {
        colIdx -= lines[lineIdx].length + 1
        lineIdx++
    }
    return {
        lineIdx,
        colIdx,
    }
}

function locationsEqual(a: SingleLocation, b: SingleLocation): boolean {
    return a.lineIdx === b.lineIdx && a.colIdx === b.colIdx
}

export function nodeContent(node: Node): string {
    if (node instanceof HTMLElement) {
        if (!node.isContentEditable) {
            return ''
        }
        return Array.from(node.childNodes).map(nodeContent).join('')
    }
    else {
        return node.textContent ?? ''
    }
}

export interface Range { start: number, end: number }

export function getRange(editor: HTMLElement): Range | undefined {
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
                        offset += nodeContent(sibling).length
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

export function setRange(editor: HTMLElement, { start, end }: Range): void {
    // Inverse of `positionInEditor`
    // Traverse down the tree, always keeping the text content behind us lte position
    function getContainerOffset(position: number): [Node, number] {
        let node: Node = editor
        let offset = 0
        while (node.childNodes.length > 0) {
            node = node.childNodes.item(0)
            while (offset + nodeContent(node).length < position && node.nextSibling !== null) {
                offset += nodeContent(node).length
                node = node.nextSibling
            }
        }
        return [node, position - offset]
    }

    const selection = window.getSelection()!

    const range = document.createRange()

    range.setStart(...getContainerOffset(start))
    range.setEnd(...getContainerOffset(end))

    selection.removeAllRanges()
    selection.addRange(range)
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

export type Result = { result: 'success', value: USSValue } | { result: 'failure', errors: string[] }

export interface AutocompleteMenu {
    action: (editor: HTMLElement, action: KeyboardEvent) => { consumed: boolean, stopListening: boolean }
    attachListeners: (editor: HTMLElement) => void // call once the returned html is rendered
}

export type Execute = (expr: UrbanStatsASTStatement) => USSValue

export type ValueChecker = (value: USSValue) => { ok: true } | { ok: false, problem: string }

export type Action = 'input' | 'select' | undefined

export function stringToHtml(
    string: string,
    colors: Colors,
    execute: Execute,
    checkValue: ValueChecker,
    lastAction: Action,
    autocomplete: {
        collapsedRangeIndex: number | undefined
        options: string[]
        apply: (completion: string, index: number) => void // Insert `completion` (the rest of the option) at `index`.
    },
): { html: string, result: Result, autocomplete: AutocompleteMenu | undefined } {
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

    if (autocomplete.collapsedRangeIndex !== undefined && lastAction === 'input') {
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

    const span = spanFactory(colors)

    let autocompleteMenu: AutocompleteMenu | undefined

    function maybeAutocompleteMenu(token: AnnotatedToken): string {
        const identifierToken = token.token
        if (autocompleteLocation !== undefined && identifierToken.type === 'identifier' && locationsEqual(token.location.end, autocompleteLocation)) {
            const includeOption = (option: string): boolean => {
                return option.startsWith(identifierToken.value) && option !== identifierToken.value
            }

            const allIdentifiers = Array.from(
                new Set(lexTokens
                    .flatMap(t => t.token.type === 'identifier' && includeOption(t.token.value) && t !== token ? [t.token.value] : [])
                    .concat(autocomplete.options.filter(includeOption))),
            ).sort()

            if (allIdentifiers.length === 0) {
                return ''
            }

            const completions = allIdentifiers.map(identifier => identifier.slice(identifierToken.value.length))

            autocompleteMenu = autocompleteMenuCallbacks(
                colors,
                completions.length,
                (completionIndex) => {
                    autocomplete.apply(completions[completionIndex], autocomplete.collapsedRangeIndex!)
                },
            )

            return renderAutocompleteMenu(colors, allIdentifiers)
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

function spanFactory(colors: Colors): (token: AnnotatedToken['token'] | ParseError) => string {
    const brackets = new DefaultMap<string, number>(() => 0)

    return (token) => {
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
        return `<span style="${styleToString(style)}" ${title !== undefined ? `title="${escapeStringForHTML(title)}"` : ''}>`
    }
}

function styleToString(style: Record<string, string>): string {
    return Object.entries(style).map(([key, value]) => `${key}:${value};`).join('')
}

function renderAutocompleteMenu(colors: Colors, identifiers: string[]): string {
    const style = {
        'position': 'absolute',
        'top': '100%',
        'left': '100%',
        'user-select': 'none',
        'z-index': '1',
    }

    const contents = identifiers
        .map((identifier, index) => `<div data-autocomplete-option data-index="${index}" style="${autocompleteSpanStyle(colors, identifiers.length, index, index === 0)}">${identifier}</div>`)
        .join('')

    return `<div data-autocomplete-menu contenteditable="false" style="${styleToString(style)}">${contents}</div>`
}

function autocompleteSpanStyle(colors: Colors, total: number, index: number, selected: boolean): string {
    return styleToString({
        'cursor': 'pointer',
        'background-color': (selected ? colors.slightlyDifferentBackgroundFocused : index % 2 === 0 ? colors.background : colors.slightlyDifferentBackground),
        'padding': '0 0.5em',
        'border-radius': index === 0 ? '0.5em 0.5em 0 0' : index === total - 1 ? '0 0 0.5em 0.5em' : 'none',
    })
}

function autocompleteMenuCallbacks(colors: Colors, numOptions: number, apply: (optionIndex: number) => void): AutocompleteMenu {
    let selectedIndex = 0

    return {
        attachListeners(editor) {
            editor.querySelectorAll('[data-autocomplete-option]').forEach((option) => {
                const index = parseInt(option.getAttribute('data-index')!)
                option.addEventListener('click', () => {
                    apply(index)
                })
                option.addEventListener('mouseenter', () => {
                    option.setAttribute('style', autocompleteSpanStyle(colors, numOptions, index, true))
                })
                option.addEventListener('mouseleave', () => {
                    option.setAttribute('style', autocompleteSpanStyle(colors, numOptions, index, index === selectedIndex))
                })
            })
        },
        action(editor, event) {
            switch (event.key) {
                case 'Enter':
                case 'Tab':
                    event.preventDefault()
                    apply(selectedIndex)
                    return { consumed: true, stopListening: true }
                case 'Escape':
                    event.preventDefault()
                    editor.querySelector('[data-autocomplete-menu]')?.remove()
                    return { consumed: true, stopListening: true }
                case 'ArrowDown':
                case 'ArrowUp':
                    event.preventDefault()
                    editor.querySelector(`[data-autocomplete-option][data-index="${selectedIndex}"]`)?.setAttribute('style', autocompleteSpanStyle(colors, numOptions, selectedIndex, false))
                    if (event.key === 'ArrowDown') {
                        selectedIndex++
                    }
                    else {
                        selectedIndex--
                    }
                    // wrap around
                    if (selectedIndex < 0) {
                        selectedIndex = numOptions - 1
                    }
                    else if (selectedIndex > numOptions - 1) {
                        selectedIndex = 0
                    }
                    editor.querySelector(`[data-autocomplete-option][data-index="${selectedIndex}"]`)?.setAttribute('style', autocompleteSpanStyle(colors, numOptions, selectedIndex, true))
                    return { consumed: true, stopListening: false }
            }
            return { consumed: false, stopListening: false }
        },
    }
}
