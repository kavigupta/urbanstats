import { Selector } from 'testcafe'

import {
    screencap,
    target, urbanstatsFixture,
} from './test_utils'

// Helper function to type text using individual key presses
async function typeTextWithKeys(t: TestController, text: string): Promise<void> {
    for (const char of text) {
        if (char === ' ') {
            await t.pressKey('space')
        }
        else {
            await t.pressKey(char)
        }
    }
}

async function fillInField(t: TestController, text: string): Promise<void> {
    const firstEditor = Selector('pre[contenteditable="plaintext-only"]').nth(0)
    await t.expect(firstEditor.exists).ok()
    await t.expect(firstEditor.visible).ok()
    await t.click(firstEditor)
    await typeTextWithKeys(t, text)
    // await t.typeText(firstEditor, text)
}

async function getOutput(): Promise<string> {
    const result = Selector('#test-editor-result')
    return await result.textContent
}

async function checkCode(t: TestController, code: string, expected: string): Promise<void> {
    await fillInField(t, code)
    const output = await getOutput()
    await t.expect(output).eql(expected)
    await screencap(t, { selector: Selector('#test-editor-panel') })
}

urbanstatsFixture('editor test', `${target}/editor.html`)

test('editor arithmetic', async (t) => {
    await checkCode(t, '2 + 3 ** 4 + 5 ** 2 * 3', '158')
})
