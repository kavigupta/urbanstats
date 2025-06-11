import { SingleLocation } from './lexer'

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

export function locationsEqual(a: SingleLocation, b: SingleLocation): boolean {
    return a.lineIdx === b.lineIdx && a.colIdx === b.colIdx
}

function nodeContentLength(node: Node): number {
    if (node instanceof HTMLDivElement) {
        return 0
    }
    else if (node instanceof HTMLElement) {
        return (node.textContent?.length ?? 0) - (node.querySelector('div')?.textContent?.length ?? 0)
    }
    else {
        return (node.textContent?.length ?? 0)
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
                        offset += nodeContentLength(sibling)
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
            while (offset + nodeContentLength(node) < position && node.nextSibling !== null) {
                offset += nodeContentLength(node)
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
