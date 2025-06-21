import { Colors } from '../page_template/color-themes'
import { DefaultMap } from '../utils/DefaultMap'
import { isAMatch } from '../utils/isAMatch'

import { renderLocInfo } from './interpreter'
import { AnnotatedToken, lex, LocInfo, SingleLocation } from './lexer'
import { ParseError, parseTokens } from './parser'
import { USSValue } from './types-values'
import { executeAsync, USSExecutionDescriptor } from './workerManager'

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

type Result<T> = { result: 'success', value: T } | { result: 'failure', errors: string[] }

export interface AutocompleteMenu {
    action: (editor: HTMLElement, action: { key: string, preventDefault: () => void }) => boolean
    attachListeners: (editor: HTMLElement) => void // call once the returned html is rendered
}

export type Action = 'input' | 'select' | 'autocomplete' | undefined

/*
 * EditorParse -> html, result, autocomplete, execute
 * execute (async) -> html, result
 */

export type ParseResult = Result<() => Promise<{ html: string, result: ExecResult }>>
export type ExecResult = Result<USSValue>

export function stringToHtml(
    string: string,
    colors: Colors,
    executionDescriptor: USSExecutionDescriptor,
    autocompleteSymbols: string[],
    lastAction: Action,
    autocomplete: {
        collapsedRangeIndex: number | undefined
        apply: (completion: string, from: number, to: number, delta: number) => void // Replace the range from -> to with completion. delta = completion.length - (to - from) for convenience
    },
): { html: string, result: ParseResult, autocomplete: AutocompleteMenu | undefined } {
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

    let autocompleteMenu: () => AutocompleteMenu | undefined = () => undefined

    function maybeAutocompleteMenu(token: AnnotatedToken): string {
        const identifierToken = token.token
        if (autocompleteLocation !== undefined && identifierToken.type === 'identifier' && locationsEqual(token.location.end, autocompleteLocation)) {
            autocompleteMenu = () => {
                const allIdentifiers = new Set<string>()
                let longestHaystack = 0
                for (const t of lexTokens) {
                    if (t.token.type === 'identifier') {
                        allIdentifiers.add(t.token.value)
                        longestHaystack = Math.max(longestHaystack, t.token.value.length)
                    }
                }
                for (const id of autocompleteSymbols) {
                    allIdentifiers.add(id)
                    longestHaystack = Math.max(longestHaystack, id.length)
                }
                allIdentifiers.delete(identifierToken.value)

                const sortedIdentifiers = Array.from(allIdentifiers).flatMap((option) => {
                    const match = isAMatch(identifierToken.value.toLowerCase(), option.toLowerCase())
                    if (match === 0) {
                        return []
                    }
                    else {
                        return [{ option, match }]
                    }
                }).sort((a, b) => {
                    if (a.match !== b.match) {
                        return b.match - a.match
                    }
                    else if (a.option.length !== b.option.length) {
                        return a.option.length - b.option.length
                    }
                    else {
                        return a.option.localeCompare(b.option)
                    }
                }).map(({ option }) => option)

                return autocompleteMenuCallbacks(
                    colors,
                    sortedIdentifiers,
                    (completionIndex) => {
                        autocomplete.apply(
                            sortedIdentifiers[completionIndex],
                            autocomplete.collapsedRangeIndex! - identifierToken.value.length,
                            autocomplete.collapsedRangeIndex!,
                            sortedIdentifiers[completionIndex].length - identifierToken.value.length,
                        )
                    },
                )
            }

            return renderAutocompleteMenu(colors)
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

    let result: ParseResult

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
            result = {
                result: 'success',
                value: async () => {
                    const execResult = await executeAsync({ descriptor: executionDescriptor, stmts: parsed })
                    if (execResult.success) {
                        return { html: lines.join('\n'), result: { result: 'success', value: execResult.value } }
                    }
                    else {
                        for (const pos of ['start', 'end'] as const) {
                            const loc = execResult.error.location.shifted[pos]
                            const line = lines[loc.lineIdx]
                            const tag = pos === 'start' ? span({ type: 'error', value: execResult.error.shortMessage }) : `</span>`
                            lines[loc.lineIdx] = `${line.slice(0, loc.colIdx)}${tag}${line.slice(loc.colIdx)}`
                            shift([execResult.error], loc.lineIdx, loc.colIdx, tag.length, pos === 'start' ? 'replace' : 'insertBefore')
                        }
                        return {
                            html: lines.join('\n'),
                            result: { result: 'failure', errors: [execResult.error.message] },
                        }
                    }
                },
            }
        }
    }

    const html = lines.join('\n')

    return { html, result, autocomplete: autocompleteMenu() }
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

function renderAutocompleteIdentifiers(colors: Colors, identifiers: string[]): string {
    return identifiers
        .map((identifier, index) => `<div data-autocomplete-option data-index="${index}" style="${autocompleteSpanStyle(colors, index, index === 0)}">${identifier}</div>`)
        .join('')
}

function renderAutocompleteMenu(colors: Colors): string {
    const style = {
        'position': 'absolute',
        'top': '100%',
        'left': '100%',
        'user-select': 'none',
        'z-index': '1',
        'overflow': 'scroll',
        'max-height': `10lh`,
        'border-radius': '0.5em',
        'border': `1px solid ${colors.borderNonShadow}`,
    }

    return `<div data-autocomplete-menu contenteditable="false" style="${styleToString(style)}"></div>`
}

function autocompleteSpanStyle(colors: Colors, index: number, selected: boolean): string {
    return styleToString({
        'cursor': 'pointer',
        'background-color': (selected ? colors.slightlyDifferentBackgroundFocused : index % 2 === 0 ? colors.background : colors.slightlyDifferentBackground),
        'padding': '0 0.5em',
    })
}

function autocompleteMenuCallbacks(colors: Colors, options: string[], apply: (optionIndex: number) => void): AutocompleteMenu {
    let selectedIndex = 0
    let stopListening = false

    return {
        // Should be idempotent
        attachListeners(editor) {
            editor.querySelector('[data-autocomplete-menu]')!.innerHTML = renderAutocompleteIdentifiers(colors, options)
            editor.querySelectorAll('[data-autocomplete-option]').forEach((option) => {
                const index = parseInt(option.getAttribute('data-index')!)
                option.addEventListener('click', () => {
                    apply(index)
                })
                option.addEventListener('mouseenter', () => {
                    option.setAttribute('style', autocompleteSpanStyle(colors, index, true))
                })
                option.addEventListener('mouseleave', () => {
                    option.setAttribute('style', autocompleteSpanStyle(colors, index, index === selectedIndex))
                })
            })
        },
        action(editor, event) {
            if (stopListening) {
                return false
            }
            switch (event.key) {
                case 'Enter':
                case 'Tab':
                    event.preventDefault()
                    apply(selectedIndex)
                    stopListening = true
                    return true
                case 'Escape':
                    event.preventDefault()
                    editor.querySelector('[data-autocomplete-menu]')?.remove()
                    stopListening = true
                    return true
                case 'ArrowDown':
                case 'ArrowUp':
                    event.preventDefault()
                    editor.querySelector(`[data-autocomplete-option][data-index="${selectedIndex}"]`)?.setAttribute('style', autocompleteSpanStyle(colors, selectedIndex, false))
                    if (event.key === 'ArrowDown') {
                        selectedIndex++
                    }
                    else {
                        selectedIndex--
                    }
                    // wrap around
                    if (selectedIndex < 0) {
                        selectedIndex = options.length - 1
                    }
                    else if (selectedIndex > options.length - 1) {
                        selectedIndex = 0
                    }
                    const newSelection = editor.querySelector(`[data-autocomplete-option][data-index="${selectedIndex}"]`)
                    newSelection?.setAttribute('style', autocompleteSpanStyle(colors, selectedIndex, true))
                    newSelection?.scrollIntoView({ block: 'nearest' })
                    return true
            }
            return false
        },
    }
}
