import { Colors } from '../page_template/color-themes'
import { DefaultMap } from '../utils/DefaultMap'

import { renderLocInfo } from './interpreter'
import { AnnotatedToken, lex, SingleLocationWithinBlock } from './lexer'
import { ParseError } from './parser'

export type EditorError = ParseError

export function longMessage(error: EditorError): string {
    return `${error.value} at ${renderLocInfo(error.location)}`
}

export function renderCode(uss: string, colors: Colors, errors: EditorError[]): (Node | string)[] {
    if (!uss.endsWith('\n')) {
        uss = `${uss}\n`
    }

    const span = spanFactory(colors)

    const lexTokens = lex({ type: 'single', ident: 'editor' }, uss)

    const lines = uss.split('\n')

    const lexSpans: (Node | string)[] = []
    let lineIdx = 0
    let colIdx = 0
    let indexInTokens = 0
    while (indexInTokens < lexTokens.length && lineIdx < lines.length && (lineIdx < lines.length - 1 || colIdx < lines[lines.length - 1].length)) {
        const token = lexTokens[indexInTokens]
        if (lineIdx === token.location.start.lineIdx && colIdx === token.location.start.colIdx) {
            lexSpans.push(span(token.token, getString(lines, token.location)))
            lineIdx = token.location.end.lineIdx
            colIdx = token.location.end.colIdx
            indexInTokens++
        }
        else if (lineIdx < token.location.start.lineIdx || colIdx < token.location.start.colIdx) {
            lexSpans.push(getString(lines, { start: { lineIdx, colIdx }, end: token.location.start }))
            lineIdx = token.location.start.lineIdx
            colIdx = token.location.start.colIdx
        }
        else {
            throw new Error('invalid state')
        }
    }

    return lexSpans
}

function getString(lines: string[], loc: { start: SingleLocationWithinBlock, end: SingleLocationWithinBlock }): string {
    return lines.slice(loc.start.lineIdx, loc.end.lineIdx + 1).map((line, idx, lineSlice) => {
        if (idx === 0 && idx === lineSlice.length - 1) {
            return line.slice(loc.start.colIdx, loc.end.colIdx)
        }
        else if (idx === 0) {
            return line.slice(loc.start.colIdx)
        }
        else if (idx === lineSlice.length - 1) {
            return line.slice(0, loc.end.colIdx)
        }
        return line
    }).join('\n')
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

function spanFactory(colors: Colors): (token: AnnotatedToken['token'] | ParseError, content: string) => HTMLSpanElement {
    const brackets = new DefaultMap<string, number>(() => 0)

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
        }

        const result = document.createElement('span')
        result.setAttribute('style', styleToString(style))
        result.title = title ?? ''
        result.textContent = content
        return result
    }
}

function styleToString(style: Record<string, string>): string {
    return Object.entries(style).map(([key, value]) => `${key}:${value};`).join('')
}
