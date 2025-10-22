import { Selector } from 'testcafe'

import { checkCode, getSelectionAnchor, getSelectionFocus, nthEditor, result, selectionIsNthEditor, typeTextWithKeys } from './editor_test_utils'
import { safeReload, screencap, target, urbanstatsFixture } from './test_utils'

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
    await t.expect(result.textContent).eql('158')
})

test('tab inserts spaces', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, 'if (true) {\n\t"hello"\n}')
    await t.expect(nthEditor(0).textContent).eql('if (true) {\n    "hello"\n}\n')
})

test('deletes whole indent', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, 'if (true) {\n\t"hello"\n}⬆➡➡➡\b')
    await t.expect(nthEditor(0).textContent).eql('if (true) {\n"hello"\n}\n')
})

test('autocomplete pi with enter', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, 'p\n')
    await t.expect(nthEditor(0).textContent).eql('pi\n')
    await t.expect(result.textContent).eql('3.141592653589793')
})

test('autocomplete exp with tab', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, 'e⬇\t(1)')
    await t.expect(nthEditor(0).textContent).eql('exp(1)\n')
    await t.expect(result.textContent).eql('2.718281828459045')
})

test('autocomplete sum with click', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, 's')
    await t.click(Selector('div').withExactText('sum'))
    await typeTextWithKeys(t, '([1, 2])')
    await t.expect(nthEditor(0).textContent).eql('sum([1, 2])\n')
    await t.expect(result.textContent).eql('3')
})

urbanstatsFixture('editor (undoChunking = 10000)', `${target}/editor.html?undoChunking=10000`)
// Long undo chunking above catches problems with initial undo chunk
test('undo autocomplete', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, 'p\n')
    await t.expect(nthEditor(0).textContent).eql('pi\n')
    await t.expect(result.textContent).eql('3.141592653589793')
    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(0).textContent).eql('Enter Urban Stats Script\n')
    await t.expect(result.textContent).eql('null')
    await t.pressKey('ctrl+y')
    await t.expect(nthEditor(0).textContent).eql('pi\n')
    await t.expect(result.textContent).eql('3.141592653589793')
    await t.expect(getSelectionAnchor()).eql(2)
})

urbanstatsFixture('editor (undoChunking = 0)', `${target}/editor.html?undoChunking=0`)

test('undo redo selection select all', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, 'null')
    await t.pressKey('ctrl+a')
    await t.expect(getSelectionAnchor()).eql(0)
    await t.expect(getSelectionFocus()).eql(4)
    await t.pressKey('backspace')
    await t.expect(nthEditor(0).textContent).eql('Enter Urban Stats Script\n')
    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(0).textContent).eql('null\n')
    await t.expect(getSelectionAnchor()).eql(0)
    await t.expect(getSelectionFocus()).eql(4)
    await t.pressKey('ctrl+y')
    await t.expect(nthEditor(0).textContent).eql('Enter Urban Stats Script\n')
    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(0).textContent).eql('null\n')
    await t.expect(getSelectionAnchor()).eql(0)
    await t.expect(getSelectionFocus()).eql(4)
})

urbanstatsFixture('editor (undoChunking = 500)', `${target}/editor.html?undoChunking=500`)

test('undo redo chunking middle', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, '"the quick brown fox"')
    await t.wait(1000)
    await t.pressKey('left')
    await typeTextWithKeys(t, ' jumped over the lazy dog')
    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(0).textContent).eql('"the quick brown fox"\n')
    await t.expect(getSelectionAnchor()).eql('"the quick brown fox'.length)
    await t.expect(getSelectionFocus()).eql('"the quick brown fox'.length)
    await typeTextWithKeys(t, ' was cool')
    await t.pressKey('ctrl+y')
    await t.expect(nthEditor(0).textContent).eql('"the quick brown fox was cool"\n')
    await t.expect(result.textContent).eql('"the quick brown fox was cool"')
})

test('deselect', async (t) => {
    await t.click(nthEditor(0))
    await t.expect(selectionIsNthEditor(0)).ok()
    await t.pressKey('ctrl+shift+d')
    await t.expect(selectionIsNthEditor(null)).ok()
})

test('switch selection undo', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, '1')
    await t.wait(1000)
    await typeTextWithKeys(t, ' + 2')
    await t.wait(1000)
    await t.pressKey('ctrl+shift+s')
    await t.expect(selectionIsNthEditor(1)).ok()
    await typeTextWithKeys(t, ' + 3')
    await t.expect(result.textContent).eql('6')
    await t.pressKey('ctrl+z')
    await t.expect(selectionIsNthEditor(1)).ok()
    await t.pressKey('ctrl+z')
    await t.expect(selectionIsNthEditor(0)).ok()
    await t.pressKey('ctrl+y')
    await t.expect(selectionIsNthEditor(1)).ok()
    await t.pressKey('ctrl+y')
    await t.expect(selectionIsNthEditor(1)).ok()
    await t.expect(result.textContent).eql('6')
})

test('show documentation popover', async (t) => {
    await t.click(nthEditor(0))
    await typeTextWithKeys(t, 'pi')
    await t.expect(Selector('div').withExactText('colorPink').exists).ok() // Autocomplete menu
    await t.hover(Selector('span').withText(/^pi/))
    await t.wait(1000)
    await t.expect(Selector('div').withExactText('colorPink').exists).notOk() // Autocomplete menu is closed
    const doc = Selector('div').withText(/^The mathematical constant/)
    await t.expect(doc.exists).ok()
    await screencap(t, { fullPage: false, selector: Selector('#test-editor-panel') }) // Fullpage so we don't hover and close the popover

    // hovering on the popover shouldn't close it
    await t.hover(doc)
    await t.expect(doc.exists).ok()

    // hovering elsewhere should close the docs
    await t.hover(Selector('#searchbox'))
    await t.expect(doc.exists).notOk()

    // Continuing to type should reopen autocomplete
    await typeTextWithKeys(t, 'n')
    await t.expect(Selector('div').withExactText('colorPink').exists).ok() // Autocomplete menu
})
