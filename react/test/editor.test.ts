import { Selector } from 'testcafe'

import {
    safeReload,
    screencap,
    target, urbanstatsFixture,
} from './test_utils'

// Helper function to type text using individual key presses
async function typeTextWithKeys(t: TestController, text: string): Promise<void> {
    const cdp = await t.getCurrentCDPSession()
    for (let char of text) {
        // if (char === ' ') {
        //     char = 'space'
        // }
        if (char === '\n') {
            char = '\r'
        }
        // Faster than t.pressKey
        await cdp.Input.dispatchKeyEvent({
            text: char,
            type: 'char',
        })
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

const result = Selector('#test-editor-result')
const errors = Selector('#test-editor-errors')

async function checkCode(t: TestController, code: string, expected?: string, error?: string): Promise<void> {
    await fillInField(t, code)

    await screencap(t, { selector: Selector('#test-editor-panel') })

    // Check output
    if (expected !== undefined) {
        await t.expect(result.exists).ok()
        await t.expect(result.textContent).eql(expected)
    }
    else {
        await t.expect(result.exists).notOk()
    }

    // Check errors
    if (error !== undefined) {
        await t.expect(errors.exists).ok()
        await t.expect(errors.textContent).eql(error)
    }
    else {
        await t.expect(errors.exists).notOk()
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

test('conditionals more complex', async (t) => {
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
    await checkCode(t, '2 + (3 * 4', undefined, 'Expected closing bracket ) to match this one at 1:5')
})

test('syntax error halfway down', async (t) => {
    const code = `
x = [1, 2, 3, 4, 5]
y = [2, 3 4, 5]
z = [3, 4, 5, 6, 7]
`
    await checkCode(t, code, undefined, 'Expected comma , or closing bracket ] after vector element at 3:11')
})

test('post-reload', async (t) => {
    await checkCode(t, '2 + 3 ** 4 + 5 ** 2 * 3', '158')
    await safeReload(t)
    await t.wait(500)
    await t.expect(result.textContent).eql('158')
})
