import { Colors } from '../page_template/color-themes'
import { TestUtils } from '../utils/TestUtils'
import { isAMatch } from '../utils/isAMatch'
import { totalOffset } from '../utils/layout'

import { AnnotatedToken } from './lexer'
import { TypeEnvironment } from './types-values'

export function getAutocompleteOptions(typeEnvironment: TypeEnvironment, tokens: AnnotatedToken[], currentIdentifer: string): string[] {
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
        'z-index': '3',
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

export function createDocumentationPopover(colors: Colors, editor: HTMLPreElement, elemOffset: number): HTMLElement {
    const width = Math.min(400, editor.offsetWidth)

    const tokenOffset = elemOffset - totalOffset(editor).left

    const style = {
        'position': 'absolute',
        'top': '100%',
        'left': '0%',
        'user-select': 'none',
        'z-index': '3',
        'overflow': 'scroll',
        'max-height': `10lh`,
        'border-radius': TestUtils.shared.isTesting ? '0' : '5px',
        'border': `1px solid ${colors.borderNonShadow}`,
        'color': colors.textMain,
        'background-color': colors.slightlyDifferentBackground,
        'width': `${width}px`,
        'padding': '0 1.33em',
        'transform': `translateX(${Math.min(0, editor.offsetWidth - (tokenOffset + width))}px)`,
    }

    const result = document.createElement('div')
    result.setAttribute('contenteditable', 'false')
    result.setAttribute('style', styleToString(style))
    result.className = 'serif'

    return result
}

function styleToString(style: Record<string, string>): string {
    return Object.entries(style).map(([key, value]) => `${key}:${value};`).join('')
}
