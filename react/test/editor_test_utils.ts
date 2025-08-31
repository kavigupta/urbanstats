import { ClientFunction, Selector } from 'testcafe'

import {
    screencap,
} from './test_utils'

const keyMapping = new Map<string, string>(Object.entries({
    '\n': 'enter',
    '\t': 'tab',
    '\b': 'backspace',
    '⬆': 'up',
    '➡': 'right',
    '⬇': 'down',
    '⬅': 'left',
    '⌂': 'home',
}))

// Helper function to type text using individual key presses
export async function typeTextWithKeys(t: TestController, inputText: string): Promise<void> {
    const cdp = await t.getCurrentCDPSession()
    for (const char of inputText) {
        let key
        if ((key = keyMapping.get(char)) !== undefined) {
            await t.pressKey(key)
        }
        else {
            // Faster than t.pressKey, can't figure out how to get to work reliably for special characters
            await cdp.Input.dispatchKeyEvent({
                text: char,
                type: 'char',
            })
        }
    }
}

export function nthEditor(n: number): Selector {
    return Selector('pre[contenteditable="plaintext-only"]').nth(n)
}

export async function typeInEditor(t: TestController, n: number, text: string, clear = false): Promise<void> {
    await t.expect(nthEditor(n).exists).ok()
    await t.expect(nthEditor(n).visible).ok()
    await t.click(nthEditor(n))
    if (clear) {
        await t.pressKey('ctrl+a backspace')
    }
    await typeTextWithKeys(t, text)
}

export const result = Selector('#test-editor-result')

export async function checkCode(t: TestController, code: string, expected: string | undefined): Promise<void> {
    await typeInEditor(t, 0, code)

    await screencap(t, { selector: Selector('#test-editor-panel') })

    // Check output
    if (expected !== undefined) {
        await t.expect(result.exists).ok()
        await t.expect(result.textContent).eql(expected)
    }
    else {
        await t.expect(result.exists).notOk()
    }
}

export const getSelectionAnchor = ClientFunction(() => window.getSelection()?.anchorOffset)

export const getSelectionFocus = ClientFunction(() => window.getSelection()?.focusOffset)

export const selectionNotPoint = ClientFunction(() => window.getSelection()?.anchorOffset !== window.getSelection()?.focusOffset)

export function selectionIsNthEditor(n: number | null): Promise<boolean> {
    return ClientFunction(() => {
        if (n === null) {
            return document.activeElement === document.body
        }
        else {
            return document.activeElement === document.querySelectorAll('pre[contenteditable="plaintext-only"]').item(n)
        }
    }, { dependencies: { n } })()
}
