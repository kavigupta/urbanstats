import { Selector } from 'testcafe'

import { getCodeFromMainField, getErrors, toggleCustomScript } from './mapper-utils'
import { screencap, urbanstatsFixture } from './test_utils'

urbanstatsFixture(`default map`, '/mapper.html')

test('basic add box', async (t) => {
    await t.click(Selector('button').withExactText('Edit Text Boxes'))
    await t.click('[data-test="add"]')
    await t.typeText('.ql-editor', 'Hello, World!')
    await screencap(t)
    await t.click(Selector('button:not(:disabled)').withExactText('Accept'))

    await t.expect(Selector('p').withExactText('Hello,\u00a0World!').exists).ok()
    await screencap(t)
})

async function clickIframeInput(t: TestController, selector: string): Promise<void> {
    await t.switchToIframe(`${selector} + iframe`)
    await t.click(selector)
    await t.switchToMainWindow()
}

test('create a new text box with formatting', async (t) => {
    await t.click(Selector('button').withExactText('Edit Text Boxes'))
    await t.click('[data-test="add"]')
    await clickIframeInput(t, 'input[value="Jost"]')
    await t.click(Selector('div').withExactText('Courier New'))
    await clickIframeInput(t, 'input[value="16"]')
    await t.click(Selector('div').withExactText('36'))
    await t.click(Selector('button').withExactText('B'))
    await t.click(Selector('button').withExactText('U'))
    await t.click('button[icon="center"]')
    await t.expect(Selector('.ql-editor').focused).ok()
    await t.typeText('.ql-editor', 'Hello, World!\rThis is text')
    await screencap(t)
    await t.click(Selector('button').withExactText('Accept'))
    await toggleCustomScript(t)
    await t.expect(getErrors()).eql([])
    await t.expect((await getCodeFromMainField()).replaceAll('\u00a0', ' '))
        .eql('cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, textBoxes=[textBox(screenBounds={north: 0.75, east: 0.75, south: 0.25, west: 0.25}, text=rtfDocument([rtfString("Hello, World!", size=36, font="Courier New", bold=true, underline=true), rtfString("\\n", align=alignCenter), rtfString("This is text", size=36, font="Courier New", bold=true, underline=true), rtfString("\\n", align=alignCenter)]))])\n')
})
