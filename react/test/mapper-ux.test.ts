import fs from 'fs/promises'

import { Selector } from 'testcafe'

import { getSelectionAnchor, getSelectionFocus, nthEditor, selectionIsNthEditor, typeInEditor } from './editor_test_utils'
import { checkBox, downloadPNG, getCodeFromMainField, getErrors, getInput, replaceInput, settingsFromURL, toggleCustomScript, urlFromCode } from './mapper-utils'
import { tempfileName } from './quiz_test_utils'
import { getLocation, safeReload, screencap, target, urbanstatsFixture, waitForDownload, waitForLoading } from './test_utils'

const mapper = (testFn: () => TestFn) => (
    name: string,
    { code, geo = 'Urban Center', universe = 'Iceland' }: { code: string, geo?: string, universe?: string },
    testBlock: (t: TestController) => Promise<void>,
): void => {
    // use Iceland and Urban Center as a quick test (less data to load)
    urbanstatsFixture(`quick-${code}`, urlFromCode(geo, universe, code))
    testFn()(name, testBlock)
}

mapper(() => test)('manipulate point map', { code: 'pMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await toggleCustomScript(t)
    await t.expect(await getErrors()).eql([])
})

mapper(() => test)('manipulate insets', { code: 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
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
    mapper(testFn)(`${category} error in subfield`, { code: 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
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
    mapper(testFn)(`${category} error in subsubfield`, { code: 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
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
        await t.wait(2000)

        await doUndo(t)
        await t.expect(getInput('Urban Center').exists).ok()
        await t.wait(2000)

        if (canUndo) {
            await t.expect(canUndo(t)).notOk()
        }

        if (canRedo) {
            await t.expect(canRedo(t)).ok()
        }

        await doRedo(t)
        await t.expect(getInput('Subnational Region').exists).ok()
        await t.wait(2000)

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

mapper(() => test)('custom ramp', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await replaceInput(t, 'Uridis', 'Custom Ramp')
    // eslint-disable-next-line no-restricted-syntax -- Test color
    await t.typeText(Selector('input[type="color"]'), '#ff0000')
    await replaceInput(t, '0.353', '1')
    await screencap(t, { selector: Selector('#auto-ux-editor-ro_ramp') })
    await replaceInput(t, 'Custom Ramp', 'Custom Expression')
    await t.expect(nthEditor(0).textContent).eql('constructRamp([{value: 0, color: rgb(1, 0, 0)}, {value: 0.25, color: rgb(1, 0.49, 0.765)}, {value: 0.5, color: rgb(0.027, 0.647, 0.686)}, {value: 0.75, color: rgb(0.541, 0.765, 0.353)}, {value: 1, color: rgb(0.722, 0.639, 0.184)}])\n')
})

mapper(() => test)('able to reload in invalid state', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await replaceInput(t, 'Uridis', 'Custom Ramp')
    await replaceInput(t, '0.353', ' ')
    await safeReload(t)
    await t.expect(Selector('#pageState_kind').value).eql('loaded')
    await t.expect(Selector('#pageState_current_descriptor_kind').value).eql('mapper')
})

mapper(() => test)('correct errors on initial', { code: 'customNode("");\ncondition (true)\ncMap(data=customNode("\\""), scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await waitForLoading(t)
    await t.expect(await getErrors()).eql(['Unrecognized token: Unterminated string at 1:1']) // Error message has the 1:1 if on an editor
})

mapper(() => test)('do not re quote when selecting custom expression again', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await replaceInput(t, 'Uridis', 'Custom Expression')
    await t.expect(nthEditor(0).textContent).eql('rampUridis\n')
    await replaceInput(t, 'Custom Expression', 'Custom Expression')
    await t.expect(nthEditor(0).textContent).eql('rampUridis\n')

    // Selecting again did not add a state
    await t.pressKey('ctrl+z')
    await t.expect(getInput('Uridis').exists).ok()
})

mapper(() => test)('selection preserved on reload', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=constructRamp([{value: 0, color: rgb(customNode("\\"abc\\""), 0.353, 0.765)}, {value: 0.25, color: rgb(0.353, 0.49, 0.765)}, {value: 0.5, color: rgb(0.027, 0.647, 0.686)}, {value: 0.75, color: rgb(0.541, 0.765, 0.353)}, {value: 1, color: rgb(0.722, 0.639, 0.184)}]))' }, async (t) => {
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

mapper(() => test)('custom expression preference saved across reload even if expression is compatible with autoux', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await replaceInput(t, 'Uridis', 'Custom Ramp')
    await replaceInput(t, 'Custom Ramp', 'Custom Expression')
    await t.expect(nthEditor(0).textContent).eql('constructRamp([{value: 0, color: rgb(0.592, 0.353, 0.765)}, {value: 0.25, color: rgb(0.353, 0.49, 0.765)}, {value: 0.5, color: rgb(0.027, 0.647, 0.686)}, {value: 0.75, color: rgb(0.541, 0.765, 0.353)}, {value: 1, color: rgb(0.722, 0.639, 0.184)}])\n')
    await safeReload(t)
    await t.expect(nthEditor(0).textContent).eql('constructRamp([{value: 0, color: rgb(0.592, 0.353, 0.765)}, {value: 0.25, color: rgb(0.353, 0.49, 0.765)}, {value: 0.5, color: rgb(0.027, 0.647, 0.686)}, {value: 0.75, color: rgb(0.541, 0.765, 0.353)}, {value: 1, color: rgb(0.722, 0.639, 0.184)}])\n')
})

mapper(() => test)('common non-optional named arguments saved when switching functions', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await replaceInput(t, 'PW Density (r=1km)', 'Population')
    await replaceInput(t, 'Uridis', 'Hot')
    await replaceInput(t, 'Linear Scale', 'Custom Expression')
    await typeInEditor(t, 0, 'linearScale(min=10000000)', true)
    await replaceInput(t, 'Choropleth Map', 'Point Map')
    await t.expect(getInput('Population').exists).ok()
    await t.expect(getInput('Hot').exists).ok()
    await t.expect(nthEditor(0).textContent).eql('linearScale(min=10000000)\n')
    await checkBox(t, /Max Radius/)
    await replaceInput(t, 'Point Map', 'Choropleth Map')
    await t.expect(getInput('Population').exists).ok()
    await t.expect(getInput('Hot').exists).ok()
    await t.expect(nthEditor(0).textContent).eql('linearScale(min=10000000)\n')
})

mapper(() => test)('common optional named arguments saved when switching functions', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await checkBox(t, /min/)
    await checkBox(t, /center/)
    await checkBox(t, /max/)
    await replaceInput(t, 'Linear Scale', 'Logarithmic Scale')
    await t.expect(getInput('0', 0).exists).ok()
    await t.expect(getInput('0', 1).exists).ok()
    await t.expect(getInput('0', 2).exists).ok()
})

mapper(() => test)('custom rendering for selector options', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    const inputSelector = getInput('Uridis')
    await t.typeText(inputSelector, 'Custom', { replace: true })
    await t.hover(Selector('div').withExactText('Autumn'))
    await screencap(t, { fullPage: false, selector: Selector('#auto-ux-editor-ro_ramp') })
})

const expectedExportOutput = `meta(kind="mapper", universe="USA", geographyKind="Urban Area")
customNode("regr = regression(y=traffic_fatalities_per_capita, x1=ln(density_pw_1km), x2=commute_car, weight=population);\\ny = (regr.residuals) * 100000");
condition (customNode("population > 10000"))
pMap(data=customNode("y"), scale=linearScale(center=0, min=customNode("percentile(y, 1)")), ramp=divergingRamp(first=colorBlue, last=colorYellow), label="Pedestrian fatalities per 100k (controlled for car commute % and density)", unit=unitNumber, maxRadius=20, relativeArea=population)`

const userCode = `customNode("regr = regression(y=traffic_fatalities_per_capita, x1=ln(density_pw_1km), x2=commute_car, weight=population);\\ny = (regr.residuals) * 100000");
condition (customNode("population > 10000"))
pMap(data=customNode("y"), scale=linearScale(center=0, min=customNode("percentile(y, 1)")), ramp=divergingRamp(first=colorBlue, last=colorYellow), label="Pedestrian fatalities per 100k (controlled for car commute % and density)", unit=unitNumber, maxRadius=20, relativeArea=population)`

mapper(() => test)('export', { code: userCode, universe: 'USA', geo: 'Urban Area' }, async (t) => {
    const laterThan = new Date().getTime()
    await t.click(Selector('button').withExactText('Export Script'))
    const exportedContent = await fs.readFile(await waitForDownload(t, laterThan, '.uss'), 'utf-8')
    await t.expect(exportedContent).eql(expectedExportOutput)
})

mapper(() => test)('import', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    const tempfile = `${tempfileName()}.uss`
    await fs.writeFile(tempfile, expectedExportOutput)
    await t.click(Selector('button').withExactText('Import Script'))
    await t.setFilesToUpload('input[type=file]', [tempfile])
    await t.expect(settingsFromURL(await getLocation())).eql({
        geographyKind: 'Urban Area',
        universe: 'USA',
        script: {
            uss: userCode,
        },
    })
})

mapper(() => test)('disable basemap', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, basemap=osmBasemap())', universe: 'USA', geo: 'Subnational Region' }, async (t) => {
    await replaceInput(t, 'OSM Basemap', 'No Basemap')
    await downloadPNG(t)
})

urbanstatsFixture('mapper default', `${target}/mapper.html`)

test('mobile appearance', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t)
})
