import { useCallback, useEffect, useRef } from 'react'

import { Colors } from '../page_template/color-themes'
import { DefaultMap } from '../utils/DefaultMap'
import { TestUtils } from '../utils/TestUtils'
import { isAMatch } from '../utils/isAMatch'

import { renderLocInfo } from './interpreter'
import { AnnotatedToken, lex, LocInfo } from './lexer'
import { ParseError } from './parser'
import { renderValue, USSDocumentedType, USSValue } from './types-values'

export type EditorError = ParseError & { kind: 'error' | 'warning' }
export type EditorResult = EditorError | { kind: 'success', result: USSValue }

export function longMessage(result: EditorResult): string {
    switch (result.kind) {
        case 'error':
        case 'warning':
            return `${result.value} at ${renderLocInfo(result.location)}`
        case 'success':
            return renderValue(result.result)
    }
}

export interface Script { uss: string, tokens: AnnotatedToken[] }

export function makeScript(uss: string): Script {
    if (!uss.endsWith('\n')) {
        uss = `${uss}\n`
    }
    return { uss, tokens: lex({ type: 'single', ident: 'editor' }, uss) }
}

export type AutocompleteState = {
    location: LocInfo
    options: string[]
    element: HTMLElement
    apply: (optionIdx: number) => void
} | undefined

// `errors` may not overlap
export function renderCode(script: Script, colors: Colors, errors: EditorError[], modfiyTokenContent: (token: AnnotatedToken, content: Node[]) => void): Node[] {
    const span = spanFactory(colors)

    const lexSpans: Node[] = []
    let errorSpans: { error: EditorError, spans: Node[] } | undefined = undefined
    let charIdx = 0
    let indexInTokens = 0
    let indexInErrors = 0
    while (indexInTokens < script.tokens.length && charIdx < script.uss.length) {
        if (indexInErrors < errors.length) {
            const errorLoc = errors[indexInErrors].location
            if (charIdx >= errorLoc.start.charIdx) {
                errorSpans = { spans: [], error: errors[indexInErrors] }
                indexInErrors++
            }
        }
        if (errorSpans !== undefined) {
            const errorLoc = errorSpans.error.location
            if (charIdx >= errorLoc.end.charIdx) {
                lexSpans.push(span(errorSpans.error, errorSpans.spans))
                errorSpans = undefined
            }
        }

        const token = script.tokens[indexInTokens]
        if (charIdx === token.location.start.charIdx) {
            const content: Node[] = [document.createTextNode(script.uss.slice(token.location.start.charIdx, token.location.end.charIdx))]
            modfiyTokenContent(token, content);
            (errorSpans?.spans ?? lexSpans).push(span(token.token, content))
            charIdx = token.location.end.charIdx
            indexInTokens++
        }
        else if (charIdx < token.location.start.charIdx) {
            (errorSpans?.spans ?? lexSpans).push(document.createTextNode(script.uss.slice(charIdx, token.location.start.charIdx)))
            charIdx = token.location.start.charIdx
        }
        else {
            throw new Error('invalid state')
        }
    }

    if (errorSpans !== undefined) {
        lexSpans.push(span(errorSpans.error, errorSpans.spans))
        errorSpans = undefined
    }

    return lexSpans
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

export function getRange(editor: HTMLElement): Range | null {
    const selection = window.getSelection()
    if (selection?.rangeCount === 1) {
        const range = selection.getRangeAt(0)
        if (editor.contains(range.startContainer) && editor.contains(range.endContainer)) {
            if (editor === range.startContainer || editor === range.endContainer) {
                return { start: 0, end: 0 }
            }
            return { start: positionInEditor(editor, range.startContainer, range.startOffset), end: positionInEditor(editor, range.endContainer, range.endOffset) }
        }
    }

    return null
}

// Traverse up the tree, counting text content of previous siblings along the way
function positionInEditor(editor: Node, node: Node, offset: number): number {
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

export function setRange(editor: HTMLElement, newRange: Range | null): void {
    const currentRange = getRange(editor)

    if (currentRange?.start === newRange?.start && currentRange?.end === newRange?.end) {
        return
    }

    const selection = window.getSelection()!

    if (newRange === null) {
        selection.removeAllRanges()
        editor.blur()
        return
    }

    if (currentRange === null) {
        editor.focus()
    }

    const [anchorNode, anchorOffset] = getContainerOffset(editor, newRange.start)
    const [focusNode, focusOffset] = getContainerOffset(editor, newRange.end)

    selection.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
}

// Inverse of `positionInEditor`
// Traverse down the tree, always keeping the text content behind us lte position
export function getContainerOffset(node: Node, position: number): [Node, number] {
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

function spanFactory(colors: Colors): (token: AnnotatedToken['token'] | ParseError, content: (Node | string)[]) => HTMLSpanElement {
    const brackets = new DefaultMap<string, number>(() => 0)

    const keywords = ['if', 'else', 'do', 'condition', 'true', 'false', 'null']

    return (token, content) => {
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
            case 'identifier':
                if (keywords.includes(token.value)) {
                    style.color = colors.hueColors.orange
                }
                break
            case 'keyword':
                style.color = colors.hueColors.purple
                break
        }

        const result = document.createElement('span')
        result.setAttribute('style', styleToString(style))
        result.title = title ?? ''
        result.replaceChildren(...content)
        return result
    }
}

function styleToString(style: Record<string, string>): string {
    return Object.entries(style).map(([key, value]) => `${key}:${value};`).join('')
}

export function getAutocompleteOptions(typeEnvironment: Map<string, USSDocumentedType>, tokens: AnnotatedToken[], currentIdentifer: string): string[] {
    const allIdentifiers = new Set<string>()
    for (const t of tokens) {
        if (t.token.type === 'identifier') {
            allIdentifiers.add(t.token.value)
        }
    }
    for (const [id] of typeEnvironment) {
        allIdentifiers.add(id)
    }
    allIdentifiers.delete(currentIdentifer)

    const sortedIdentifiers = Array.from(allIdentifiers).flatMap((option) => {
        const match = isAMatch(currentIdentifer.toLowerCase(), option.toLowerCase())
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

    return sortedIdentifiers
}

export function createAutocompleteMenu(colors: Colors): HTMLElement {
    const style = {
        'position': 'absolute',
        'top': '100%',
        'left': '100%',
        'user-select': 'none',
        'z-index': '1',
        'overflow': 'scroll',
        'max-height': `10lh`,
        'border-radius': TestUtils.shared.isTesting ? '0' : '5px',
        'border': `1px solid ${colors.borderNonShadow}`,
        'color': colors.textMain,
    }

    const result = document.createElement('div')
    result.setAttribute('contenteditable', 'false')
    result.setAttribute('style', styleToString(style))

    return result
}

export function createPlaceholder(colors: Colors, placeholderText: string): HTMLElement {
    const style = {
        'position': 'absolute',
        'user-select': 'none',
        'white-space': 'pre',
        'color': colors.hueColors.grey,
        'pointer-events': 'none',
    }

    const result = document.createElement('span')
    result.setAttribute('contenteditable', 'false')
    result.setAttribute('style', styleToString(style))

    result.textContent = placeholderText

    return result
}

// Custom hook interfaces

interface UndoRedoItem<T, S> {
    time: number
    state: T
    selection: S
}

export interface UndoRedoOptions {
    undoChunking?: number
    undoHistory?: number
    onlyElement?: { current: HTMLElement | null }
}

export function useUndoRedo<T, S>(
    initialState: T,
    initialSelection: S,
    onStateChange: (state: T) => void,
    onSelectionChange: (selection: S) => void,
    { undoChunking = 1000, undoHistory = 100, onlyElement }: UndoRedoOptions = {},
): {
        addState: (state: T, selection: S) => void
        updateCurrentSelection: (selection: S) => void
    } {
    const undoStack = useRef<UndoRedoItem<T, S>[]>([
        { time: 0, state: initialState, selection: initialSelection },
    ])
    const redoStack = useRef<UndoRedoItem<T, S>[]>([])

    const addState = useCallback((state: T, selection: S): void => {
        const currentUndoState = undoStack.current[undoStack.current.length - 1]

        if (currentUndoState.time + undoChunking > Date.now()) {
            // Amend current item rather than making a new one
            currentUndoState.state = state
            currentUndoState.selection = selection
        }
        else {
            undoStack.current.push({ time: Date.now(), state, selection })
            while (undoStack.current.length > undoHistory) {
                undoStack.current.shift()
            }
        }
        redoStack.current = []
    }, [undoChunking, undoHistory])

    const updateCurrentSelection = useCallback((selection: S): void => {
        undoStack.current[undoStack.current.length - 1].selection = selection
    }, [])

    const undo = useCallback((): void => {
        if (undoStack.current.length >= 2) {
            const prevState = undoStack.current[undoStack.current.length - 2]
            // Prev state becomes current state, current state becomes redo state
            redoStack.current.push(undoStack.current.pop()!)
            onStateChange(prevState.state)
            onSelectionChange(prevState.selection)
        }
    }, [onStateChange, onSelectionChange])

    const redo = useCallback((): void => {
        const futureState = redoStack.current.pop()
        if (futureState !== undefined) {
            undoStack.current.push(futureState)
            onStateChange(futureState.state)
            onSelectionChange(futureState.selection)
        }
    }, [onStateChange, onSelectionChange])

    // Set up keyboard shortcuts
    useEffect(() => {
        const listener = (e: KeyboardEvent): void => {
            if (onlyElement !== undefined && document.activeElement !== null && document.activeElement !== onlyElement.current) {
                return
            }

            const isMac = navigator.userAgent.includes('Mac') && !TestUtils.shared.isTesting
            if (isMac ? e.key.toLowerCase() === 'z' && e.metaKey && !e.shiftKey : e.key.toLowerCase() === 'z' && e.ctrlKey) {
                e.preventDefault()
                undo()
            }
            else if (isMac ? e.key.toLowerCase() === 'z' && e.metaKey && e.shiftKey : e.key.toLowerCase() === 'y' && e.ctrlKey) {
                e.preventDefault()
                redo()
            }
        }

        window.addEventListener('keydown', listener)
        return () => { window.removeEventListener('keydown', listener) }
    }, [undo, redo, onlyElement])

    return {
        addState,
        updateCurrentSelection,
    }
}
