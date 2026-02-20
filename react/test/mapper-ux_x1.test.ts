import { Selector } from 'testcafe'

import { nthEditor, typeInEditor } from './editor_test_utils'
import { getCodeFromMainField, getErrors, getInput, replaceInput, toggleCustomScript, urlFromCode } from './mapper-utils'
import { checkTextboxesDirect, downloadImage, getLocation, mapper, screencap, target, urbanstatsFixture, waitForLoading, withHamburgerMenu } from './test_utils'

urbanstatsFixture('mapper default', `${target}/mapper.html`)

test('mobile appearance', async (t) => {
    await t.resizeWindow(400, 800)
    await screencap(t, { selector: Selector('.content_panel_mobile') })
})

test('showing a popover does not clip in split view', async (t) => {
    await toggleCustomScript(t)
    await t.hover(Selector('span').withText(/^linearScale/))
    await t.wait(1000)
    const doc = Selector('div').withText(/^Creates a linear scale/)
    const editor = Selector('#test-editor-body')
    await t.expect((await doc.boundingClientRect).right).lt((await editor.boundingClientRect).right)
    await screencap(t, { fullPage: false, selector: Selector('[data-test=split-left]') }) // Fullpage false so we don't hover and close the popover
})

for (const platform of ['desktop', 'mobile']) {
    test(`open sidebar ${platform}`, async (t) => {
        if (platform === 'mobile') {
            await t.resizeWindow(400, 800)
        }
        await withHamburgerMenu(t, async () => {
            await screencap(t)
            await t.click(Selector('a').withExactText('Home'))
            await t.expect(getLocation()).eql(`${target}/`)
        })
    })
}

test('change theme setting in sidebar menu', async (t) => {
    await withHamburgerMenu(t, async () => {
        const themeSelect = Selector('.theme-setting').find('select')
        await t.click(themeSelect).click(Selector('option').withExactText('Dark Mode'))
        await t.expect(themeSelect.value).eql('Dark Mode')
    })
})

for (const constant of ['linearScale', 'rampUridis']) {
    test(`hover editor click link to documentation of constant ${constant}`, async (t) => {
        await toggleCustomScript(t)
        await t.hover(Selector('span').withExactText(constant))
        await screencap(t, { fullPage: false })
        await t.click(Selector('a').withExactText(constant))
        await t.expect(getLocation()).eql(`${target}/uss-documentation.html#constant-${constant}`)
        await screencap(t, { fullPage: false })
    })
}

test('custom node propagation linear scale', async (t) => {
    await checkTextboxesDirect(t, ['center'])
    await replaceInput(t, 'Constant', 'Custom Expression')
    await typeInEditor(t, 0, '2 + 3', true)
    // switch whole thing to a custom expression
    await replaceInput(t, 'Linear Scale', 'Custom Expression')
    await t.expect(nthEditor(0).textContent).eql('linearScale(center=2 + 3)\n')
    // switch back to linear scale
    await replaceInput(t, 'Custom Expression', 'Linear Scale')
    await t.expect(nthEditor(0).textContent).eql('2 + 3\n')
})

urbanstatsFixture('mapper default', `${target}/mapper.html?settings=H4sIAAAAAAAAAy2NwQrCMAxAf2Xk1MEuXpUd9Cp6cOw2GHENM7ilpWkVGf67HS6H8HgPkgVGcmNA%2F%2FicWSzsoUl3wchOcCpuNGaACpLwi4JS7m1zzEKHwD7CfoGkmu2QNLr56iyZDjooD50MTiyvhwoTQ6Iymwt600mRx2LE2pIox0%2Fv3%2F3uOVf%2FogNOVE8shKFZ2ZRbCTj7el1tYMu62Tsqzehrcac%2FmfyphO%2F3B5Qv%2BrjbAAAA`)

test('download file via site screencap button', async (t) => {
    await downloadImage(t)
})

mapper(() => test)('universe navigation', { code: `cMap(
    data=density_pw_1km,
    scale=logScale(),
    ramp=rampUridis,
    basemap=noBasemap()
)` }, async (t) => {
    await waitForLoading()
    await screencap(t)
    await downloadImage(t)
    const universeSelector = Selector('.universe-selector')
    // assert the current universe in the mapper settings is Iceland
    await t.expect(universeSelector.exists).ok()
    await t.expect(universeSelector.getAttribute('alt')).eql('Iceland')
    await t.expect(getInput('Iceland').exists).ok()
    // Step 1: change universe via universe selector in the mapper settings
    await replaceInput(t, 'Iceland', 'Denmark')
    await waitForLoading()
    await screencap(t)
    await downloadImage(t)
    await t.expect(universeSelector.getAttribute('alt')).eql('Denmark') // change reflected in universe selector
    await t.expect(getInput('Denmark').exists).ok() // change reflected in mapper settings
    // Step 2: change universe via header universe selector
    await t.click(universeSelector)
    await t.click(Selector('div').withExactText('Ireland').nth(0))
    await waitForLoading()
    await screencap(t)
    await downloadImage(t)
    await t.expect(universeSelector.getAttribute('alt')).eql('Ireland') // change reflected in universe selector
    await t.expect(getInput('Ireland').exists).ok() // change reflected in mapper settings
})

mapper(() => test)('add custom elements to vector', { code: 'pMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Insets'])
    await replaceInput(t, 'Iceland', 'Custom Expression', 1)
    await t.click(Selector('button[data-test-id="test-add-vector-element-button"]'))
})

mapper(() => test)('add non-custom elements to vector', { code: 'pMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await toggleCustomScript(t)
    await checkTextboxesDirect(t, ['Insets'])
    await replaceInput(t, 'Iceland', 'Custom Inset', 1)
    await t.click(Selector('button[data-test-id="test-add-vector-element-button"]'))
})

// Tests for Convert to Table button
const simpleMapCodeForConvert = `cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, basemap=noBasemap())`
const expectedSimpleTableCode = `table(columns=[column(values=density_pw_1km)])
`

urbanstatsFixture('convert-map-to-table', urlFromCode('County', 'California, USA', simpleMapCodeForConvert))

test('convert-map-to-table', async (t) => {
    await t.wait(1000)
    // Disable custom mode first (mapper starts in custom mode)
    await toggleCustomScript(t)
    // Click the Convert to Table button
    await t.click(Selector('button[data-test-id="convert-to-table"]'))
    await waitForLoading()
    // Should be on the statistic page
    const location = await getLocation()
    await t.expect(location).contains('/statistic.html')
    await t.expect(location).contains('uss=')
    await t.expect(location).contains('article_type=County')
    await t.expect(location).contains('universe=California')
    // make sure autoux is fully expanded
    await t.expect(getInput('PW Density (r=1km)').exists).ok()
    // Toggle custom script to view the code
    await toggleCustomScript(t)
    const code = await nthEditor(0).textContent
    await t.expect(code).eql(expectedSimpleTableCode)
})

// Test that AST structure is preserved with conditions
const mapWithConditionForConvert = `condition (population > 100000)
cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, basemap=noBasemap())`
const expectedTableWithCondition = `condition (population > 100000)
table(columns=[column(values=density_pw_1km)])
`

urbanstatsFixture('convert-map-to-table-preserves-condition', urlFromCode('County', 'California, USA', mapWithConditionForConvert))

test('convert-map-to-table-preserves-condition', async (t) => {
    await t.wait(1000)
    // Disable custom mode first (mapper starts in custom mode)
    await toggleCustomScript(t)
    // Click the Convert to Table button
    await t.click(Selector('button[data-test-id="convert-to-table"]'))
    await waitForLoading()
    // make sure autoux is fully expanded
    await t.expect(getInput('PW Density (r=1km)').exists).ok()
    // Toggle custom script to view the code
    await toggleCustomScript(t)
    const code = await nthEditor(0).textContent
    await t.expect(code).eql(expectedTableWithCondition)
})

// Tests for when Convert to Table button should be hidden
const convertToTableButtonSelector = Selector('button[data-test-id="convert-to-table"]')

urbanstatsFixture('convert-map-to-table-button-hidden - not a map', urlFromCode('County', 'California, USA', 'linearScale()'))

test('convert-map-to-table-button-hidden-for-non-map', async (t) => {
    await t.wait(1000)
    await t.expect(convertToTableButtonSelector.exists).notOk()
})

urbanstatsFixture('convert-map-to-table-button-hidden - cMap without data', urlFromCode('County', 'California, USA', 'cMap(scale=linearScale())'))

test('convert-map-to-table-button-hidden-for-cmap-without-data', async (t) => {
    await t.wait(1000)
    await t.expect(convertToTableButtonSelector.exists).notOk()
})

urbanstatsFixture('convert-map-to-table-button-hidden - identifier', urlFromCode('County', 'California, USA', 'density_pw_1km'))

test('convert-map-to-table-button-hidden-for-identifier', async (t) => {
    await t.wait(1000)
    await t.expect(convertToTableButtonSelector.exists).notOk()
})

mapper(() => test)('convert mapper to table', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, label="Population Density", unit=unitDensity)' }, async (t) => {
    await waitForLoading()
    // Click the "Convert to Table" button
    await t.click(Selector('button[data-test-id="convert-to-table"]'))
    await waitForLoading()
    // make sure autoux is fully expanded
    await t.expect(getInput('PW Density (r=1km)').exists).ok()
    // Toggle custom script to verify the converted code
    await toggleCustomScript(t)
    const code = await getCodeFromMainField()
    const expectedCode = `table(
    columns=[column(values=density_pw_1km, name="Population Density", unit=unitDensity)]
)
`
    await t.expect(code).eql(expectedCode)
})

mapper(() => test)('convert mapper to table with custom', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km + 2, scale=linearScale(), ramp=rampUridis, label="Population Density", unit=unitDensity)' }, async (t) => {
    await waitForLoading()
    // Click the "Convert to Table" button
    await t.click(Selector('button[data-test-id="convert-to-table"]'))
    await waitForLoading()
    // make sure a field with density_pw_1km + 2 exists
    await t.expect(nthEditor(0).textContent).contains('density_pw_1km + 2')
    // Toggle custom script to verify the converted code
    await toggleCustomScript(t)
    const code = await getCodeFromMainField()
    const expectedCode = `table(
    columns=[
        column(
            values=density_pw_1km + 2,
            name="Population Density",
            unit=unitDensity
        )
    ]
)
`
    await t.expect(code).eql(expectedCode)
})

mapper(() => test)('convert mapper to table preserves preamble', { code: 'customNode("let x = 5");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    await waitForLoading()
    await t.click(Selector('button[data-test-id="convert-to-table"]'))
    await waitForLoading()
    // make sure autoux is fully expanded
    await t.expect(getInput('PW Density (r=1km)').exists).ok()
    // Toggle custom script to verify the converted code
    await toggleCustomScript(t)
    const code = await getCodeFromMainField()
    const expectedCode = `let x = 5;
table(columns=[column(values=density_pw_1km)])
`
    await t.expect(code).eql(expectedCode)
})

mapper(() => test)('convert mapper to table and back preserves fields', { code: 'customNode("");\ncondition (true)\ncMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, label="Test Label", unit=unitDensity)' }, async (t) => {
    await waitForLoading()
    // Convert to table
    await t.click(Selector('button[data-test-id="convert-to-table"]'))
    await waitForLoading()
    // make sure autoux is fully expanded
    await t.expect(getInput('PW Density (r=1km)').exists).ok()
    await t.click(Selector('button[data-test-id="view"]'))
    // Convert back to mapper
    await t.click(Selector('button[data-test-id="convert-to-map"]'))
    await waitForLoading()
    // Verify the mapper code has the label and unit preserved
    await toggleCustomScript(t)
    const code = await getCodeFromMainField()
    const expectedCode = `cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    label="Test Label",
    unit=unitDensity
)
`
    await t.expect(code).eql(expectedCode)
})

mapper(() => test)('deprecation warning for deprecated transportation statistic', { code: 'pMap(data=commute_walk_incl_wfh, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    const warning = 'Deprecated: Use commute_walk (Commute Walk %) instead, which excludes work-from-home from the denominator and is more accurate for comparisons'
    await waitForLoading()
    await t.expect(getErrors()).eql([`${warning} at 1:11-31`])
    await toggleCustomScript(t)
    await waitForLoading()
    await t.expect(getErrors()).eql([warning])
})

mapper(() => test)('deprecation warning for deprecated weather statistic', { code: 'pMap(data=high_temp_fall, scale=linearScale(), ramp=rampUridis)' }, async (t) => {
    const warning = 'Deprecated: Use high_temp_son (Mean high temperature in Sep/Oct/Nov) instead, which uses month-based seasons instead and is valid in the southern hemisphere'
    await toggleCustomScript(t)
    await t.expect(getErrors()).eql([warning])
})
