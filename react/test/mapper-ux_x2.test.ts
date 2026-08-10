import fs from 'fs/promises'

import { Selector } from 'testcafe'

import { nthEditor, typeInEditor } from './editor_test_utils'
import { checkBox, checkSelector, downloadPNG, getCodeFromMainField, getErrors, getInput, replaceInput, settingsFromURL, toggleCustomScript } from './mapper-utils'
import { tempfileName } from './quiz_test_utils'
import { getLocation, mapper, safeReload, screencap, waitForDownload, waitForLoading } from './test_utils'

mapper(() => test)('custom ramp', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await replaceInput(t, 'Uridis', 'Custom Ramp')
    // eslint-disable-next-line no-restricted-syntax -- Test color
    await t.typeText(Selector('input[type="color"]:not([inert] *)'), '#ff0000')
    await replaceInput(t, '0.353', '1')
    await screencap(t, { selector: Selector('#auto-ux-editor-ro_ramp'), removeEntireMap: false })
    await replaceInput(t, 'Custom Ramp', 'Custom Expression')
    await t.expect(nthEditor(0).textContent).eql(`constructRamp([
    {value: 0, color: rgb(1, 0, 0)},
    {value: 0.25, color: rgb(1, 0.49, 0.765)},
    {value: 0.5, color: rgb(0.027, 0.647, 0.686)},
    {value: 0.75, color: rgb(0.541, 0.765, 0.353)},
    {value: 1, color: rgb(0.722, 0.639, 0.184)}
])\n`)
})

mapper(() => test)('able to reload in invalid state', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await replaceInput(t, 'Uridis', 'Custom Ramp')
    await replaceInput(t, '0.353', ' ')
    await safeReload(t)
    await t.expect(Selector('#pageState_kind').value).eql('loaded')
    await t.expect(Selector('#pageState_current_descriptor_kind').value).eql('mapper')
})

mapper(() => test)('correct errors on initial', { code: 'customNode("");\ncondition (true)\ncMap(data=customNode("\\""), scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await t.expect(getErrors()).eql(['Unrecognized token: Unterminated string at 1:1']) // Error message has the 1:1 if on an editor
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

for (const [typedValue, errorCase, inCode, simplifiedValue] of [['0.001', false, '0.001', '0.001'], ['23.000', false, '23', '23'], ['23a', true, 'toNumber("23a")', '23a']] as const) {
    mapper(() => test)(`${typedValue} through custom expression toggle to ${simplifiedValue}`, { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
        const messages = errorCase ? ['Error while executing function: Error: Expected a number or a string that can be converted to a number, got 23a'] : []
        await checkBox(t, /^max/)
        await replaceInput(t, '0', typedValue)
        await t.expect(getErrors()).eql(messages)
        if (errorCase) {
            await screencap(t, { removeEntireMap: false })
        }
        await toggleCustomScript(t)
        await t.expect(nthEditor(0).textContent).contains(inCode)
        await toggleCustomScript(t)
        if (errorCase) {
            await screencap(t, { removeEntireMap: false })
        }
        await t.expect(getErrors()).eql(messages)
        await t.expect(getInput(simplifiedValue).exists).ok()
    })
}

mapper(() => test)('selection preserved on reload', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=constructRamp([{value: 0, color: rgb(customNode("\\"abc\\""), 0.353, 0.765)}, {value: 0.25, color: rgb(0.353, 0.49, 0.765)}, {value: 0.5, color: rgb(0.027, 0.647, 0.686)}, {value: 0.75, color: rgb(0.541, 0.765, 0.353)}, {value: 1, color: rgb(0.722, 0.639, 0.184)}]))' }, async (t) => {
    async function checkErrors(): Promise<void> {
        await waitForLoading()
        await t.expect(getErrors()).eql(['Custom expression expected to return type number, but got string at 1:1-0'])
    }
    await checkErrors()
    await toggleCustomScript(t)
    const checkCode = async (): Promise<void> => {
        const code = `cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=constructRamp([
        {value: 0, color: rgb("abc", 0.353, 0.765)},
        {value: 0.25, color: rgb(0.353, 0.49, 0.765)},
        {value: 0.5, color: rgb(0.027, 0.647, 0.686)},
        {value: 0.75, color: rgb(0.541, 0.765, 0.353)},
        {value: 1, color: rgb(0.722, 0.639, 0.184)}
    ])
)`
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
    await t.expect(nthEditor(0).textContent).eql(`constructRamp([
    {value: 0, color: rgb(0.592, 0.353, 0.765)},
    {value: 0.25, color: rgb(0.353, 0.49, 0.765)},
    {value: 0.5, color: rgb(0.027, 0.647, 0.686)},
    {value: 0.75, color: rgb(0.541, 0.765, 0.353)},
    {value: 1, color: rgb(0.722, 0.639, 0.184)}
])\n`)
    await safeReload(t)
    await t.expect(nthEditor(0).textContent).eql(`constructRamp([
    {value: 0, color: rgb(0.592, 0.353, 0.765)},
    {value: 0.25, color: rgb(0.353, 0.49, 0.765)},
    {value: 0.5, color: rgb(0.027, 0.647, 0.686)},
    {value: 0.75, color: rgb(0.541, 0.765, 0.353)},
    {value: 1, color: rgb(0.722, 0.639, 0.184)}
])\n`)
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
    await screencap(t, { fullPage: false, selector: Selector('#auto-ux-editor-ro_ramp:not([inert] *)'), removeEntireMap: false })
})

const expectedExportOutput = `meta(kind="mapper", universe="USA", geographyKind="Urban Area")
customNode("regr = regression(y=traffic_fatalities_per_capita, x1=ln(density_pw_1km), x2=commute_car, weight=population);\\ny = (regr.residuals) * 100000");
condition (customNode("population > 10000"))
pMap(
    data=customNode("y"),
    scale=linearScale(center=0, min=customNode("percentile(y, 1)")),
    ramp=divergingRamp(first=colorBlue, last=colorYellow),
    label="Pedestrian fatalities per 100k (controlled for car commute % and density)",
    unit=unitNumber,
    maxRadius=20,
    relativeArea=population
)`

const userCode = `customNode("regr = regression(y=traffic_fatalities_per_capita, x1=ln(density_pw_1km), x2=commute_car, weight=population);\\ny = (regr.residuals) * 100000");
condition (customNode("population > 10000"))
pMap(
    data=customNode("y"),
    scale=linearScale(center=0, min=customNode("percentile(y, 1)")),
    ramp=divergingRamp(first=colorBlue, last=colorYellow),
    label="Pedestrian fatalities per 100k (controlled for car commute % and density)",
    unit=unitNumber,
    maxRadius=20,
    relativeArea=population
)`

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

mapper(() => test)('disable basemap labels', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, basemap=osmBasemap())', universe: 'USA', geo: 'Subnational Region' }, async (t) => {
    await checkBox(t, /Disable Basemap Labels/)
    await t.expect(Selector('#auto-ux-editor-ro_basemap_noLabels input').value).eql('true')
})

mapper(() => test)('preamble checkbox syncs with undo/redo operations', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    const preamble = checkSelector(/^Preamble/)
    await t.expect(preamble.checked).notOk()
    await t.click(preamble)
    await t.expect(preamble.checked).ok()
    await typeInEditor(t, 0, 'myVar = 42', true)
    await t.expect(preamble.checked).ok()
    while (await preamble.checked) {
        await t.pressKey('ctrl+z')
    }
    await t.expect(preamble.checked).notOk()
    await t.pressKey('ctrl+y')
    await t.expect(preamble.checked).ok()
    await t.pressKey('ctrl+z')
    await t.expect(preamble.checked).notOk()
})
