import { ClientFunction, Selector } from 'testcafe'

import { drag, getCodeFromMainField, getErrors, nastyDiff, toggleCustomScript, urlFromCode } from './mapper-utils'
import { screencap, urbanstatsFixture } from './test_utils'

urbanstatsFixture(`default map`, '/mapper.html')

test('basic add box', async (t) => {
    await t.click(Selector('button').withExactText('Edit Text Boxes'))
    await t.click('[data-test="add"]')
    await t.typeText('.ql-editor', 'Hello, World!')
    await screencap(t)
    await t.click(Selector('button:not(:disabled)').withExactText('Accept'))

    await t.expect(Selector('p').withExactText('Hello,\u00a0World!').exists).ok()
    await t.expect(Selector('button').withExactText('Edit Text Boxes').exists).ok()
    await screencap(t)
})

async function clickIframeInput(t: TestController, i: number, selector: string): Promise<void> {
    await t.switchToIframe(Selector(`${selector} + iframe`).nth(i))
    await t.click(selector)
    await t.switchToMainWindow()
}

async function changeValue(t: TestController, i: number, from: string, to: string): Promise<void> {
    await clickIframeInput(t, i, `input[value="${from}"]`)
    await t.click(Selector('div').withExactText(to))
}

const expectedNewTextBoxCode = 'cMap('
    + 'data=density_pw_1km, '
    + 'scale=linearScale(), '
    + 'ramp=rampUridis, '
    + 'textBoxes=['
    + 'textBox('
    + 'screenBounds={north: 0.75, east: 0.75, south: 0.25, west: 0.25}, '
    + 'text=rtfDocument(['
    + 'rtfString("Hello, World!", size=36, font="Courier New", bold=true, underline=true), '
    + 'rtfString("\\n", align=alignCenter), '
    + 'rtfString("This is text", size=36, font="Courier New", bold=true, underline=true), '
    + 'rtfString("\\n", align=alignCenter)'
    + ']), '
    + 'backgroundColor=rgb(1, 0.973, 0.941), '
    + 'borderColor=rgb(0.2, 0.2, 0.2), '
    + 'borderWidth=1'
    + ')'
    + ']'
    + ')\n'

test('create a new text box with formatting', async (t) => {
    // Open the "Edit Text Boxes" dialog and add a new text box
    await t.click(Selector('button').withExactText('Edit Text Boxes'))
    await t.click('[data-test="add"]')

    // Set font, size, and formatting
    await changeValue(t, 0, 'Jost', 'Courier New')
    await changeValue(t, 0, '16', '36')
    await t.click(Selector('button').withExactText('B')) // Bold
    await t.click(Selector('button').withExactText('U')) // Underline
    await t.click('button[icon="center"]') // Center alignment

    // Add text content
    await t.expect(Selector('.ql-editor').focused).ok()
    await t.typeText('.ql-editor', 'Hello, World!\rThis is text')

    // Finalize changes and verify still editable
    await screencap(t)
    await t.click(Selector('button').withExactText('Accept'))
    await t.expect(Selector('button').withExactText('Edit Text Boxes').exists).ok()

    // Verify no errors and expected code
    await toggleCustomScript(t)
    await t.expect(getErrors()).eql([])
    nastyDiff(await getCodeFromMainField(), expectedNewTextBoxCode)
})

// This weird workaround is necessary here instead of typeText when text is selected... thanks TestCafe
async function inputColor(t: TestController, selector: string, value: string): Promise<void> {
    await ClientFunction(() => {
        const input: HTMLInputElement = document.querySelector(selector)!
        // https://stackoverflow.com/a/46012210/724702
        // eslint-disable-next-line @typescript-eslint/unbound-method -- Hack
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value')!.set!
        nativeInputValueSetter.call(input, value)
        const event = new Event('input', { bubbles: true })
        input.dispatchEvent(event)
    }, { dependencies: { selector, value } })()
}

test('change background color, border color, border width, insert images, insert formulas, format formulas', async (t) => {
    await t.click(Selector('button').withExactText('Edit Text Boxes'))
    await t.click('[data-test="add"]')

    // Change background color
    // eslint-disable-next-line no-restricted-syntax -- Color constant for tests
    await t.typeText(Selector('[data-test="backgroundColor"] input[type="color"]'), '#0000FF', { replace: true })

    // Change border color
    // eslint-disable-next-line no-restricted-syntax -- Color constant for tests
    await t.typeText(Selector('[data-test="borderColor"] input[type="color"]'), '#FF0000', { replace: true })

    // Insert a formula using prompt
    await t.setNativeDialogHandler(() => 'E=mc^2 + AI')
    await t.click('button[icon="formula"]')

    // Insert an image
    await t.setNativeDialogHandler(() => 'https://http.cat/images/301.jpg')
    await t.click('button[icon="image"]')

    // Change border width
    await changeValue(t, 0, '1', '5')

    // Format the formula
    await t.click('.ql-editor').pressKey('ctrl+a')
    // eslint-disable-next-line no-restricted-syntax -- Color constant for tests
    await inputColor(t, '[data-test="textColor"] input[type="color"]', '#00FF00')

    // Insert text before the formula and make it black
    // TODO It's technically a bug that you have to insert a space before you get different formatting
    await t.pressKey('left').typeText('.ql-editor', ' ').pressKey('left')
    // eslint-disable-next-line no-restricted-syntax -- Color constant for tests
    await inputColor(t, '[data-test="textColor"] input[type="color"]', '#000000')

    await t.typeText('.ql-editor', 'some stuff')

    // Select everything and resize
    await t.pressKey('ctrl+a')
    await changeValue(t, 0, '16', '24')

    // Accept changes and verify the "Edit Text Boxes" button is visible
    await t.click(Selector('button').withExactText('Accept'))
    await t.expect(Selector('button').withExactText('Edit Text Boxes').exists).ok()

    // Ensure no errors, take a screenshot, and toggle custom script
    await t.expect(getErrors()).eql([])
    await screencap(t)
    await toggleCustomScript(t)

    // Verify the expected code
    const expected = 'cMap('
        + 'data=density_pw_1km, '
        + 'scale=linearScale(), '
        + 'ramp=rampUridis, '
        + 'textBoxes=['
        + 'textBox('
        + 'screenBounds={north: 0.75, east: 0.75, south: 0.25, west: 0.25}, '
        + 'text=rtfDocument(['
        + 'rtfString("some stuff", size=24, color=rgb(0, 0, 0)), '
        + 'rtfString(" ", size=24, color=rgb(0, 1, 0)), '
        + 'rtfFormula("E=mc^2 + AI", size=24, color=rgb(0, 1, 0)), '
        + 'rtfImage("https://http.cat/images/301.jpg", size=24, color=rgb(0, 1, 0)), '
        + 'rtfString("\\n")'
        + ']), '
        + 'backgroundColor=rgb(0, 0, 1), '
        + 'borderColor=rgb(1, 0, 0), '
        + 'borderWidth=5'
        + ')'
        + ']'
        + ')\n'
    nastyDiff(await getCodeFromMainField(), expected)

    // Reopen dialog, duplicate, delete, and finalize changes
    await toggleCustomScript(t)
    await t.click(Selector('button').withExactText('Edit Text Boxes'))
    await t.click('[data-test="duplicate"]')
    await t.click(Selector('[data-test="delete"]').nth(1))
    await t.click(Selector('button').withExactText('Accept'))

    // Verify code is still the same
    await toggleCustomScript(t)
    nastyDiff(await getCodeFromMainField(), expected)
})

urbanstatsFixture('with previous text box', urlFromCode('Subnational Region', 'USA', expectedNewTextBoxCode), async (t) => {
    await toggleCustomScript(t)
})

function getSelection(): Promise<Selection | null> {
    return ClientFunction(() => window.getSelection())()
}

test('duplicate text box, edit, resize, resposition, move down', async (t) => {
    // Open dialog and duplicate text box
    await t.click(Selector('button').withExactText('Edit Text Boxes'))
    await t.click('[data-test="duplicate"]')

    // Edit duplicated text box
    await t.selectEditableContent(Selector('.ql-editor').nth(1).find('p').nth(1), Selector('.ql-editor').nth(1).find('p').nth(1))
    const selection1 = await getSelection()
    await changeValue(t, 0, 'Courier New', 'Times New Roman')
    await t.typeText(Selector('.ql-editor').nth(1), 'A line\rAnother line')
    await t.expect(Selector('.ql-editor').nth(1).textContent).eql('Hello, World!A\u00a0lineAnother\u00a0line')
    const selection2 = await getSelection()

    // Undo/Redo changes
    await t.pressKey('ctrl+z')
    await t.expect(Selector('.ql-editor').nth(1).textContent).eql('Hello, World!This is text')
    await t.expect(getSelection()).eql(selection1)
    await t.pressKey('ctrl+y')
    await t.expect(Selector('.ql-editor').nth(1).textContent).eql('Hello, World!A\u00a0lineAnother\u00a0line')
    await t.expect(getSelection()).eql(selection2)

    // Move, resize, and reorder text box
    await drag(t, Selector('[data-test="move"]').nth(1), 100, 100)
    await drag(t, Selector('[data-test="bottomRight"]').nth(1), 100, 100)
    await t.click('[data-test="moveDown"]')
    await drag(t, Selector('[data-test="move"]').nth(1), -100, -100)

    // Finalize and verify
    await t.click(Selector('button').withExactText('Accept'))
    await t.expect(Selector('button').withExactText('Edit Text Boxes').exists).ok()
    await t.expect(getErrors()).eql([])
    await screencap(t)
    await toggleCustomScript(t)
    nastyDiff(
        await getCodeFromMainField(),
        'cMap('
        + 'data=density_pw_1km, '
        + 'scale=linearScale(), '
        + 'ramp=rampUridis, '
        + 'textBoxes=['
        + 'textBox('
        + 'screenBounds={north: 0.627, east: 0.985, south: 0, west: 0.392}, '
        + 'text=rtfDocument(['
        + 'rtfString("Hello, World!", size=36, font="Courier New", bold=true, underline=true), '
        + 'rtfString("\\n", align=alignCenter), '
        + 'rtfString("A line", size=36, font="Times New Roman", bold=true, underline=true), '
        + 'rtfString("\\n", align=alignCenter), '
        + 'rtfString("Another line", size=36, font="Times New Roman", bold=true, underline=true), '
        + 'rtfString("\\n", align=alignCenter)'
        + ']'
        + '), '
        + 'backgroundColor=rgb(1, 0.973, 0.941), '
        + 'borderColor=rgb(0.2, 0.2, 0.2), '
        + 'borderWidth=1'
        + '), '
        + 'textBox('
        + 'screenBounds={north: 0.923, east: 0.658, south: 0.423, west: 0.158}, '
        + 'text=rtfDocument(['
        + 'rtfString("Hello, World!", size=36, font="Courier New", bold=true, underline=true), '
        + 'rtfString("\\n", align=alignCenter), '
        + 'rtfString("This is text", size=36, font="Courier New", bold=true, underline=true), '
        + 'rtfString("\\n", align=alignCenter)'
        + ']'
        + '), '
        + 'backgroundColor=rgb(1, 0.973, 0.941), '
        + 'borderColor=rgb(0.2, 0.2, 0.2), '
        + 'borderWidth=1'
        + ')'
        + ']'
        + ')\n',
    )
})
