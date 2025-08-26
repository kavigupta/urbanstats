import { getSelectionAnchor, getSelectionFocus, nthEditor, selectionIsNthEditor, typeInEditor } from './editor_test_utils'
import { checkBox, getCodeFromMainField, getErrors, getInput, replaceInput, toggleCustomScript, urlFromCode } from './mapper-utils'
import { screencap, urbanstatsFixture, waitForLoading } from './test_utils'

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
    await t.wait(1000)
    await replaceInput(t, 'Iceland', 'USA')
    await t.wait(1000)
    await replaceInput(t, 'PW Density (r=1km)', 'Custom Expression')
    await t.wait(1000)
    await typeInEditor(t, 0, '⌂"Hello, World"\n')
    await t.wait(1000)
    await replaceInput(t, 'Uridis', 'Custom Expression')
    await t.wait(1000)
    await typeInEditor(t, 1, '⌂"Hello, World"\n')
    await t.wait(1000)

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

    await t.pressKey('ctrl+z')
    await t.expect(getInput('Urban Center').exists).ok()

    await t.pressKey('ctrl+y')
    await t.expect(getInput('Subnational Region').exists).ok()

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
