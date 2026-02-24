import { Colors } from '../page_template/color-themes'
import { DefaultMap } from '../utils/DefaultMap'

import { renderLocInfo } from './interpreter'
import { AnnotatedToken, lex } from './lexer'
import { ParseError } from './parser'
import { renderValue, USSValue } from './types-values'

export type EditorError = ParseError & { kind: 'error' | 'warning' }
export type EditorResult = EditorError | { kind: 'success', result: USSValue }

export function longMessage(result: EditorResult, includeLocationInfo: boolean): string {
    switch (result.kind) {
        case 'error':
        case 'warning':
            return includeLocationInfo ? `${result.value} at ${renderLocInfo(result.location)}` : result.value
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

// `errors` may not overlap
export function renderCode(
    script: Script,
    colors: Colors,
    errors: EditorError[],
    modfiyTokenContent: (token: AnnotatedToken, content: Node[]) => void,
    modifyTokenSpan: (token: AnnotatedToken, span: HTMLSpanElement) => void,
): Node[] {
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
            modfiyTokenContent(token, content)
            const tokenSpan = span(token.token, content)
            modifyTokenSpan(token, tokenSpan);
            (errorSpans?.spans ?? lexSpans).push(tokenSpan)
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

    const basicConstants = ['true', 'false', 'null']

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
                if (basicConstants.includes(token.value)) {
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
