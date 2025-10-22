import { Selector } from 'testcafe'

import { nthEditor, selectionNotPoint } from './editor_test_utils'
import { downloadOrCheckString, urbanstatsFixture, waitForLoading } from './test_utils'

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

async function colorsOfResults(t: TestController): Promise<Set<string>> {
    // get all nodes with id test-editor-result and return classes of the form color-${cKey} for each
    const results = Selector('#test-editor-result')
    const count = await results.count
    const colors: string[] = []
    for (let i = 0; i < count; i++) {
        let classNames = (await results.nth(i).getAttribute('class'))?.split(' ') ?? []
        classNames = classNames.filter(c => c.startsWith('color-'))
        await t.expect(classNames.length).eql(1)
        colors.push(classNames[0])
    }
    return new Set(colors)
}

async function rightPanelText(t: TestController): Promise<string> {
    await waitForLoading()
    await t.expect(await colorsOfResults(t)).eql(new Set(['color-g']))
    const rightPanel = Selector('.right_panel')
    return rightPanel.textContent
}

test('documentation screenshot collapsed', async (t) => {
    await downloadOrCheckString(t, await rightPanelText(t), 'uss-documentation-collapsed', 'txt', false)
})

test('documentation screenshot expanded', async (t) => {
    const expand = Selector('span').withExactText('▶')
    for (let i = 0; i < await expand.count; i++) {
        await t.click(expand.nth(i))
    }
    await downloadOrCheckString(t, await rightPanelText(t), 'uss-documentation-expanded', 'txt', false)
})
