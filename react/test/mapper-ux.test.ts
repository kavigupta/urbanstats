import { Selector } from 'testcafe'

import { getSelectionAnchor, getSelectionFocus, nthEditor, selectionIsNthEditor, typeInEditor } from './editor_test_utils'
import { checkBox, getCodeFromMainField, getErrors, getInput, replaceInput, toggleCustomScript, urlFromCode } from './mapper-utils'
import { safeReload, screencap, urbanstatsFixture, waitForLoading } from './test_utils'

const mapper = (testFn: () => TestFn) => (name: string, code: string, testBlock: (t: TestController) => Promise<void>): void => {
    // use Iceland and Urban Center as a quick test (less data to load)
    urbanstatsFixture(`quick-${code}`, urlFromCode('Urban Center', 'Iceland', code))
    testFn()(name, testBlock)
}

mapper(() => test)('manipulate point map', 'pMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', async (t) => {
    await toggleCustomScript(t)
    await t.expect(await getErrors()).eql([])
})

mapper(() => test)('manipulate insets', 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', async (t) => {
    await toggleCustomScript(t)
    await t.expect(await getErrors()).eql([])
    await checkBox(t, /^Insets/)
    await replaceInput(t, 'Default Insets', 'Custom Inset')
    await waitForLoading(t)
    await replaceInput(t, 'Iceland', 'Custom Inset', 1) // second one, since the first is the universe selector
    await waitForLoading(t)
    await replaceInput(t, /^-13\.4/, '-13')
    await waitForLoading(t)
    await t.expect(await getErrors()).eql([])
    await toggleCustomScript(t)
    await t.expect(await getCodeFromMainField()).eql(
        'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, insets=constructInsets([constructInset(screenBounds={north: 1, east: 1, south: 0, west: 0}, mapBounds={north: 66.54638908819885, east: -13, south: 63.38379679465158, west: -24.54201452954334}, mainMap=true, name="Iceland")]))\n',
    )
})

const errorInSubfield = (testFn: () => TestFn) => (category: string, errorCausingCode: string, error: string): void => {
    mapper(testFn)(`${category} error in subfield`, 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', async (t) => {
        await toggleCustomScript(t)
        await t.expect(await getErrors()).eql([])
        await replaceInput(t, 'Linear Scale', 'Custom Expression')
        await typeInEditor(t, 0, errorCausingCode, true)
        await waitForLoading(t)
        await t.expect(await getErrors()).eql([error])
        await screencap(t)
    })
}

errorInSubfield(() => test)('syntax', 'linearScale(max=)', 'Unexpected bracket ) at 1:17')
errorInSubfield(() => test)('semantic', 'linearScale(max=2 + "hi")', 'Invalid types for operator +: number and string at 1:17-24')

const errorInSubsubfield = (testFn: () => TestFn) => (category: string, errorCausingCode: string, error: string): void => {
    mapper(testFn)(`${category} error in subsubfield`, 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', async (t) => {
        await toggleCustomScript(t)
        await t.expect(await getErrors()).eql([])
        await checkBox(t, /^max/)
        await replaceInput(t, 'Constant', 'Custom Expression')
        await typeInEditor(t, 0, errorCausingCode, true)
        await waitForLoading(t)
        await t.expect(await getErrors()).eql([error])
        await screencap(t)
    })
}

errorInSubsubfield(() => test)('syntax', '0.1 + ', 'Unexpected end of input at 1:5')
errorInSubsubfield(() => test)('semantic', 'unknownFunction()', 'Undefined variable: unknownFunction at 1:1-15')

mapper(() => test)('undo redo', 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', async (t) => {
    await replaceInput(t, 'Urban Center', 'Subnational Region')
    await t.wait(2000)
    await replaceInput(t, 'Iceland', 'USA')
    await t.wait(2000)
    await replaceInput(t, 'PW Density (r=1km)', 'Custom Expression')
    await t.wait(2000)
    await typeInEditor(t, 0, '⌂"Hello, World"\n')
    await t.wait(2000)
    await replaceInput(t, 'Uridis', 'Custom Expression')
    await t.wait(2000)
    await typeInEditor(t, 1, '⌂"Hello, World"\n')
    await t.wait(2000)

    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(1).textContent).eql('rampUridis\n')
    await t.expect(nthEditor(0).textContent).eql('"Hello, World"\ndensity_pw_1km\n')
    await t.expect(selectionIsNthEditor(1)).ok()
    await t.expect(getSelectionAnchor()).eql(0)
    await t.expect(getSelectionFocus()).eql(0)

    await t.pressKey('ctrl+z')
    await t.expect(getInput('Uridis').exists).ok()
    await t.expect(nthEditor(0).textContent).eql('"Hello, World"\ndensity_pw_1km\n')
    await t.expect(nthEditor(1).exists).notOk()
    await t.expect(selectionIsNthEditor(null)).ok()

    await t.pressKey('ctrl+z')
    await t.expect(nthEditor(0).textContent).eql('density_pw_1km\n')
    await t.expect(selectionIsNthEditor(0)).ok()
    await t.expect(getSelectionAnchor()).eql(0)
    await t.expect(getSelectionFocus()).eql(0)

    await t.pressKey('ctrl+z')
    await t.expect(getInput('PW Density (r=1km)').exists).ok()
    await t.expect(nthEditor(0).exists).notOk()
    await t.expect(selectionIsNthEditor(null)).ok()

    await t.pressKey('ctrl+z')
    await t.expect(getInput('Iceland').exists).ok()
    await t.wait(2000)

    await t.pressKey('ctrl+z')
    await t.expect(getInput('Urban Center').exists).ok()
    await t.wait(2000)

    await t.pressKey('ctrl+y')
    await t.expect(getInput('Subnational Region').exists).ok()
    await t.wait(2000)

    await t.pressKey('ctrl+y')
    await t.expect(getInput('USA').exists).ok()
    await t.expect(selectionIsNthEditor(null)).ok()

    await t.pressKey('ctrl+y')
    await t.expect(nthEditor(0).textContent).eql('density_pw_1km\n')
    await t.expect(selectionIsNthEditor(0)).ok()
    await t.expect(getSelectionAnchor()).eql(0)
    await t.expect(getSelectionFocus()).eql(0)

    await t.pressKey('ctrl+y')
    await t.expect(nthEditor(0).textContent).eql('"Hello, World"\ndensity_pw_1km\n')
    await t.expect(selectionIsNthEditor(null)).ok()

    await t.pressKey('ctrl+y')
    await t.expect(nthEditor(1).textContent).eql('rampUridis\n')
    await t.expect(selectionIsNthEditor(1)).ok()
    await t.expect(getSelectionAnchor()).eql(0)
    await t.expect(getSelectionFocus()).eql(0)

    await t.pressKey('ctrl+y')
    await t.expect(nthEditor(1).textContent).eql('"Hello, World"\nrampUridis\n')
    await t.expect(selectionIsNthEditor(1)).ok()
    // On the next line
    await t.expect(getSelectionAnchor()).eql(1)
    await t.expect(getSelectionFocus()).eql(1)
})

mapper(() => test)('custom ramp', 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', async (t) => {
    await replaceInput(t, 'Uridis', 'Custom Ramp')
    // eslint-disable-next-line no-restricted-syntax -- Test color
    await t.typeText(Selector('input[type="color"]'), '#ff0000')
    await replaceInput(t, '0.353', '1')
    await screencap(t, { selector: Selector('#auto-ux-editor-ro_ramp') })
    await replaceInput(t, 'Custom Ramp', 'Custom Expression')
    await t.expect(nthEditor(0).textContent).eql('constructRamp([{value: 0, color: rgb(1, 0, 0)}, {value: 0.25, color: rgb(1, 0.49, 0.765)}, {value: 0.5, color: rgb(0.027, 0.647, 0.686)}, {value: 0.75, color: rgb(0.541, 0.765, 0.353)}, {value: 1, color: rgb(0.722, 0.639, 0.184)}])\n')
})

mapper(() => test)('able to reload in invalid state', 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', async (t) => {
    await replaceInput(t, 'Uridis', 'Custom Ramp')
    await replaceInput(t, '0.353', ' ')
    await safeReload(t)
    await t.expect(Selector('#pageState_kind').value).eql('loaded')
    await t.expect(Selector('#pageState_current_descriptor_kind').value).eql('mapper')
})

mapper(() => test)('correct errors on initial', 'customNode("");\ncondition (true)\ncMap(data=customNode("\\""), scale=linearScale(), ramp=rampUridis)', async (t) => {
    await waitForLoading(t)
    await t.expect(await getErrors()).eql(['Unrecognized token: Unterminated string at 1:1']) // Error message has the 1:1 if on an editor
})

mapper(() => test)('do not re quote when selecting custom expression again', 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', async (t) => {
    await replaceInput(t, 'Uridis', 'Custom Expression')
    await t.expect(nthEditor(0).textContent).eql('rampUridis\n')
    await replaceInput(t, 'Custom Expression', 'Custom Expression')
    await t.expect(nthEditor(0).textContent).eql('rampUridis\n')

    // Selecting again did not add a state
    await t.pressKey('ctrl+z')
    await t.expect(getInput('Uridis').exists).ok()
})

mapper(() => test)('selection preserved on reload', 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=constructRamp([{value: 0, color: rgb(customNode("\\"abc\\""), 0.353, 0.765)}, {value: 0.25, color: rgb(0.353, 0.49, 0.765)}, {value: 0.5, color: rgb(0.027, 0.647, 0.686)}, {value: 0.75, color: rgb(0.541, 0.765, 0.353)}, {value: 1, color: rgb(0.722, 0.639, 0.184)}]))', async (t) => {
    async function checkErrors(): Promise<void> {
        await t.wait(500) // just make sure the page has settled
        await waitForLoading(t)
        await t.expect(await getErrors()).eql(['Custom expression expected to return type number, but got string at 1:1-0'])
    }
    await checkErrors()
    await toggleCustomScript(t)
    const checkCode = async (): Promise<void> => {
        const code = 'cMap(data=density_pw_1km, scale=linearScale(), ramp=constructRamp([{value: 0, color: rgb("abc", 0.353, 0.765)}, {value: 0.25, color: rgb(0.353, 0.49, 0.765)}, {value: 0.5, color: rgb(0.027, 0.647, 0.686)}, {value: 0.75, color: rgb(0.541, 0.765, 0.353)}, {value: 1, color: rgb(0.722, 0.639, 0.184)}]))'
        await t.expect((await getCodeFromMainField()).trim()).eql(code)
    }
    await checkCode()
    await toggleCustomScript(t)
    await safeReload(t)
    await checkErrors()
    await toggleCustomScript(t)
    await checkCode()
})
