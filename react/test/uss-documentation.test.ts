import { Selector } from 'testcafe'

import { nthEditor, selectionNotPoint } from './editor_test_utils'
import { screencap, urbanstatsFixture } from './test_utils'

urbanstatsFixture('uss documentation', '/uss-documentation.html')

test('undo is scoped by editor', async (t) => {
    await t.click(nthEditor(0))
    await t.pressKey('ctrl+a')
    await t.expect(selectionNotPoint()).eql(true)
    await t.pressKey('backspace')
    await t.expect(nthEditor(0).textContent).eql('Enter Urban Stats Script\n')
    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(0).textContent).notEql('Enter Urban Stats Script\n')
    await t.pressKey('ctrl+y')
    await t.expect(nthEditor(0).textContent).eql('Enter Urban Stats Script\n')
    await t.click('h1')
    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(0).textContent).eql('Enter Urban Stats Script\n')
    await t.click(nthEditor(1))
    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(0).textContent).eql('Enter Urban Stats Script\n')
    await t.click(nthEditor(0))
    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(0).textContent).notEql('Enter Urban Stats Script\n')
})

test('documentation screenshot collapsed', async (t) => {
    await screencap(t)
})

test('documentation screenshot expanded', async (t) => {
    const expand = Selector('span').withExactText('▶')
    for (let i = 0; i < await expand.count; i++) {
        await t.click(expand.nth(i))
    }
    await screencap(t)
})
