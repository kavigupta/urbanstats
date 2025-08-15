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
        else if (char === '\n') {
            await t.pressKey('enter')
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
    if (await result.exists) {
        return await result.textContent
    }
    return ''
}

async function getErrors(): Promise<string> {
    const errors = Selector('#test-editor-errors')
    if (await errors.exists) {
        return await errors.textContent
    }
    return ''
}

async function checkCode(t: TestController, code: string, expected: string, error?: string): Promise<void> {
    await fillInField(t, code)
    const output = await getOutput()
    await t.expect(output).eql(expected)
    await screencap(t, { selector: Selector('#test-editor-panel') })
    const errors = await getErrors()
    if (error) {
        await t.expect(errors).eql(error)
    }
    else {
        await t.expect(errors).eql('')
    }
}

urbanstatsFixture('editor test', `${target}/editor.html`)

test('basic arithmetic', async (t) => {
    await checkCode(t, '2 + 3 ** 4 + 5 ** 2 * 3', '158')
})

test('functions', async (t) => {
    await checkCode(t, 'min([max([1, 2, 3]), sum([4, 5, 6])])', '3')
})

test('conditionals', async (t) => {
    const code = `
x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
if (x > 5) { y = x * 2 } else { y = x / 2 }
y`
    const output = `[
    0.5,
    1,
    1.5,
    2,
    2.5,
    12,
    14,
    16,
    18,
    20
]`
    await checkCode(t, code, output)
})

test.only('conditionals more complex', async (t) => {
    const code = `x = [2, 3, 4, 5]
y = [1, 2, 3, 4]
condition(x > 3)
y `
    const output = `[
    NaN,
    NaN,
    3,
    4
]`
    await checkCode(t, code, output)
})

test('syntax errors', async (t) => {
    await checkCode(t, '2 + (3 * 4', '', 'Expected closing bracket ) to match this one at 1:5')
})
