import { ClientFunction, Selector } from 'testcafe'

import {
    safeReload,
    screencap,
    target, urbanstatsFixture,
} from './test_utils'

const keyMapping = new Map<string, string>(Object.entries({
    '\n': 'enter',
    '\t': 'tab',
    '\b': 'backspace',
    '⬆': 'up',
    '➡': 'right',
    '⬇': 'down',
    '⬅': 'left',
}))

// Helper function to type text using individual key presses
async function typeTextWithKeys(t: TestController, inputText: string): Promise<void> {
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

const firstEditor = Selector('pre[contenteditable="plaintext-only"]').nth(0)

async function fillInField(t: TestController, text: string): Promise<void> {
    await t.expect(firstEditor.exists).ok()
    await t.expect(firstEditor.visible).ok()
    await t.click(firstEditor)
    await typeTextWithKeys(t, text)
}

const result = Selector('#test-editor-result')

async function checkCode(t: TestController, code: string, expected: string | undefined): Promise<void> {
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
}

const getSelectionAnchor = ClientFunction(() => window.getSelection()?.anchorOffset)

const getSelectionFocus = ClientFunction(() => window.getSelection()?.focusOffset)

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
    await checkCode(t, '2 + (3 * 4', 'Expected closing bracket ) to match this one at 1:5')
})

test('syntax error halfway down', async (t) => {
    const code = `
x = [1, 2, 3, 4, 5]
y = [2, 3 4, 5]
z = [3, 4, 5, 6, 7]
`
    await checkCode(t, code, 'Expected comma , or closing bracket ] after vector element at 3:11')
})

test('post-reload', async (t) => {
    await checkCode(t, '2 + 3 ** 4 + 5 ** 2 * 3', '158')
    await safeReload(t)
    await t.wait(500)
    await t.expect(result.textContent).eql('158')
})

test('tab inserts spaces', async (t) => {
    await t.click(firstEditor)
    await typeTextWithKeys(t, 'if (true) {\n\t"hello"\n}')
    await t.expect(firstEditor.textContent).eql('if (true) {\n    "hello"\n}\n')
})

test('deletes whole indent', async (t) => {
    await t.click(firstEditor)
    await typeTextWithKeys(t, 'if (true) {\n\t"hello"\n}⬆➡➡➡\b')
    await t.expect(firstEditor.textContent).eql('if (true) {\n"hello"\n}\n')
})

test('autocomplete pi with enter', async (t) => {
    await t.click(firstEditor)
    await typeTextWithKeys(t, 'p\n')
    await t.expect(firstEditor.textContent).eql('pi\n')
    await t.expect(result.textContent).eql('3.141592653589793')
})

test('autocomplete exp with tab', async (t) => {
    await t.click(firstEditor)
    await typeTextWithKeys(t, 'e⬇\t(1)')
    await t.expect(firstEditor.textContent).eql('exp(1)\n')
    await t.expect(result.textContent).eql('2.718281828459045')
})

test('autocomplete sum with click', async (t) => {
    await t.click(firstEditor)
    await typeTextWithKeys(t, 's')
    await t.click(Selector('div').withExactText('sum'))
    await typeTextWithKeys(t, '([1, 2])')
    await t.expect(firstEditor.textContent).eql('sum([1, 2])\n')
    await t.expect(result.textContent).eql('3')
})

urbanstatsFixture('editor (undoChunking = 10000)', `${target}/editor.html?undoChunking=10000`)
// Long undo chunking above catches problems with initial undo chunk
test('undo autocomplete', async (t) => {
    await t.click(firstEditor)
    await typeTextWithKeys(t, 'p\n')
    await t.expect(firstEditor.textContent).eql('pi\n')
    await t.expect(result.textContent).eql('3.141592653589793')
    await t.pressKey('ctrl+z')
    await t.expect(firstEditor.textContent).eql('Enter Urban Stats Script\n')
    await t.expect(result.textContent).eql('null')
    await t.pressKey('ctrl+y')
    await t.expect(firstEditor.textContent).eql('pi\n')
    await t.expect(result.textContent).eql('3.141592653589793')
    await t.expect(getSelectionAnchor()).eql(2)
})

urbanstatsFixture('editor (undoChunking = 0)', `${target}/editor.html?undoChunking=0`)

test('undo redo selection select all', async (t) => {
    await t.click(firstEditor)
    await typeTextWithKeys(t, 'null')
    await t.pressKey('ctrl+a backspace')
    await t.expect(firstEditor.textContent).eql('Enter Urban Stats Script\n')
    await t.pressKey('ctrl+z')
    await t.expect(firstEditor.textContent).eql('null\n')
    await t.expect(getSelectionAnchor()).eql(0)
    await t.expect(getSelectionFocus()).eql(4)
    await t.pressKey('ctrl+y')
    await t.expect(firstEditor.textContent).eql('Enter Urban Stats Script\n')
    await t.pressKey('ctrl+z')
    await t.expect(firstEditor.textContent).eql('null\n')
    await t.expect(getSelectionAnchor()).eql(0)
    await t.expect(getSelectionFocus()).eql(4)
})

urbanstatsFixture('editor (undoChunking = 500)', `${target}/editor.html?undoChunking=500`)

test('undo redo chunking middle', async (t) => {
    await t.click(firstEditor)
    await typeTextWithKeys(t, '"the quick brown fox"')
    await t.wait(1000)
    await t.pressKey('left')
    await typeTextWithKeys(t, ' jumped over the lazy dog')
    await t.pressKey('ctrl+z')
    await t.expect(firstEditor.textContent).eql('"the quick brown fox"\n')
    await t.expect(getSelectionAnchor()).eql('"the quick brown fox'.length)
    await t.expect(getSelectionFocus()).eql('"the quick brown fox'.length)
    await typeTextWithKeys(t, ' was cool')
    await t.pressKey('ctrl+y')
    await t.expect(firstEditor.textContent).eql('"the quick brown fox was cool"\n')
    await t.expect(result.textContent).eql('"the quick brown fox was cool"')
})
