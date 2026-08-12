import { Selector } from 'testcafe'

import { getSelectionAnchor, getSelectionFocus, nthEditor, selectionIsNthEditor, typeInEditor } from './editor_test_utils'
import { checkBox, getCodeFromMainField, getErrors, getInput, replaceInput, toggleCustomScript } from './mapper-utils'
import { mapper, screencap } from './test_utils'

mapper(() => test)('manipulate point map', { code: 'pMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await toggleCustomScript(t)
    await t.expect(getErrors()).eql([])
})

mapper(() => test)('manipulate insets', { code: 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await toggleCustomScript(t)
    await t.expect(getErrors()).eql([])
    await checkBox(t, /^Insets/)
    await t.expect(getInput('Custom Insets').exists).ok() // Insets immediately deconsturct when checked
    await replaceInput(t, 'Iceland', 'Custom Inset', 1) // second one, since the first is the universe selector
    await replaceInput(t, /^-13\.4/, '-13')
    await t.expect(getErrors()).eql([])
    await toggleCustomScript(t)
    await t.expect(getCodeFromMainField()).eql(
        `cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    insets=constructInsets([
        constructInset(
            screenBounds={north: 1, east: 1, south: 0, west: 0},
            mapBounds={north: 66.546, east: -13, south: 63.384, west: -24.542},
            mainMap=true,
            name="Iceland"
        )
    ])
)\n`,
    )
})

mapper(() => test)('cluster map enable insets', { code: 'clusterMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await toggleCustomScript(t)
    await t.expect(getErrors()).eql([])
    await checkBox(t, /^Insets/)
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false })
})

const errorInSubfield = (testFn: () => TestFn) => (category: string, errorCausingCode: string, error: string): void => {
    mapper(testFn)(`${category} error in subfield`, { code: 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
        await toggleCustomScript(t)
        await t.expect(getErrors()).eql([])
        await replaceInput(t, 'Linear Scale', 'Custom Expression')
        await typeInEditor(t, 0, errorCausingCode, true)
        await t.expect(getErrors()).eql([error])
        await screencap(t, { removeEntireMap: false })
    })
}

errorInSubfield(() => test)('syntax', 'linearScale(max=)', 'Unexpected bracket ) at 1:17')
errorInSubfield(() => test)('semantic', 'linearScale(max=2 + "hi")', 'Invalid types for operator +: number and string at 1:17-24')

const errorInSubsubfield = (testFn: () => TestFn) => (category: string, errorCausingCode: string, error: string): void => {
    mapper(testFn)(`${category} error in subsubfield`, { code: 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
        await toggleCustomScript(t)
        await t.expect(getErrors()).eql([])
        await checkBox(t, /^max/)
        await replaceInput(t, 'Constant', 'Custom Expression')
        await typeInEditor(t, 0, errorCausingCode, true)
        await t.expect(getErrors()).eql([error])
        await screencap(t, { removeEntireMap: false })
    })
}

errorInSubsubfield(() => test)('syntax', '0.1 + ', 'Unexpected end of input at 1:5')
errorInSubsubfield(() => test)('semantic', 'unknownFunction()', 'Undefined variable: unknownFunction at 1:1-15')

mapper(() => test)('race condition', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    for (let i = 0; i < 10; i++) {
        await replaceInput(t, 'Urban Center', 'Subnational Region')
        await replaceInput(t, 'Iceland', 'USA')

        await t.pressKey('ctrl+z')
        await t.expect(getInput('Iceland').exists).ok()

        await t.pressKey('ctrl+z')
        await t.expect(getInput('Urban Center').exists).ok()
    }
})

undoRedoTest(() => test, 'desktop', {
    doUndo: t => t.pressKey('ctrl+z'),
    doRedo: t => t.pressKey('ctrl+y'),
})

undoRedoTest(() => test, 'mobile', {
    before: t => t.resizeWindow(400, 800),
    doUndo: t => t.click(Selector('button:not(:disabled)').withExactText('Undo')),
    doRedo: t => t.click(Selector('button:not(:disabled)').withExactText('Redo')),
    canUndo: () => Selector('button:not(:disabled)').withExactText('Undo').exists,
    canRedo: () => Selector('button:not(:disabled)').withExactText('Redo').exists,
})

function undoRedoTest(testFn: () => TestFn, name: string, { doUndo, doRedo, canUndo, canRedo, before }: {
    doUndo: (t: TestController) => Promise<void>
    doRedo: (t: TestController) => Promise<void>
    canUndo?: (t: TestController) => Promise<boolean>
    canRedo?: (t: TestController) => Promise<boolean>
    before?: (t: TestController) => Promise<void>
}): void {
    mapper(testFn)(`undo redo ${name}`, { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
        await before?.(t)

        if (canUndo) {
            await t.expect(canUndo(t)).notOk()
        }

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

        await doUndo(t)
        await t.expect(nthEditor(1).textContent).eql('rampUridis\n')
        await t.expect(nthEditor(0).textContent).eql('"Hello, World"\ndensity_pw_1km\n')
        await t.expect(selectionIsNthEditor(1)).ok()
        await t.expect(getSelectionAnchor()).eql(0)
        await t.expect(getSelectionFocus()).eql(0)

        await doUndo(t)
        await t.expect(getInput('Uridis').exists).ok()
        await t.expect(nthEditor(0).textContent).eql('"Hello, World"\ndensity_pw_1km\n')
        await t.expect(nthEditor(1).exists).notOk()
        await t.expect(selectionIsNthEditor(null)).ok()

        await doUndo(t)
        await t.expect(nthEditor(0).textContent).eql('density_pw_1km\n')
        await t.expect(selectionIsNthEditor(0)).ok()
        await t.expect(getSelectionAnchor()).eql(0)
        await t.expect(getSelectionFocus()).eql(0)

        await doUndo(t)
        await t.expect(getInput('PW Density (r=1km)').exists).ok()
        await t.expect(nthEditor(0).exists).notOk()
        await t.expect(selectionIsNthEditor(null)).ok()

        await doUndo(t)
        await t.expect(getInput('Iceland').exists).ok()

        await doUndo(t)
        await t.expect(getInput('Urban Center').exists).ok()

        if (canUndo) {
            await t.expect(canUndo(t)).notOk()
        }

        if (canRedo) {
            await t.expect(canRedo(t)).ok()
        }

        await doRedo(t)
        await t.expect(getInput('Subnational Region').exists).ok()

        await doRedo(t)
        await t.expect(getInput('USA').exists).ok()
        await t.expect(selectionIsNthEditor(null)).ok()

        await doRedo(t)
        await t.expect(nthEditor(0).textContent).eql('density_pw_1km\n')
        await t.expect(selectionIsNthEditor(0)).ok()
        await t.expect(getSelectionAnchor()).eql(0)
        await t.expect(getSelectionFocus()).eql(0)

        await doRedo(t)
        await t.expect(nthEditor(0).textContent).eql('"Hello, World"\ndensity_pw_1km\n')
        await t.expect(selectionIsNthEditor(null)).ok()

        await doRedo(t)
        await t.expect(nthEditor(1).textContent).eql('rampUridis\n')
        await t.expect(selectionIsNthEditor(1)).ok()
        await t.expect(getSelectionAnchor()).eql(0)
        await t.expect(getSelectionFocus()).eql(0)

        await doRedo(t)
        await t.expect(nthEditor(1).textContent).eql('"Hello, World"\nrampUridis\n')
        await t.expect(selectionIsNthEditor(1)).ok()
        // On the next line
        await t.expect(getSelectionAnchor()).eql(1)
        await t.expect(getSelectionFocus()).eql(1)

        if (canUndo) {
            await t.expect(canUndo(t)).ok()
        }

        if (canRedo) {
            await t.expect(canRedo(t)).notOk()
        }
    })
}
