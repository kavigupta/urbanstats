import { Selector } from 'testcafe'

import { typeInEditor } from './editor_test_utils'
import { checkBox, getCodeFromMainField, getErrors, toggleCustomScript, urlFromCode } from './mapper-utils'
import { screencap, urbanstatsFixture, waitForLoading } from './test_utils'

function mapperTest(name: string, code: string, opts: { onlyTest?: true }, testFn: (t: TestController) => Promise<void>): void {
    // use Iceland and Urban Center as a quick test (less data to load)
    urbanstatsFixture(`quick-${code}`, urlFromCode('Urban Center', 'Iceland', code))
    if (opts.onlyTest) {
        // eslint-disable-next-line no-only-tests/no-only-tests -- conditional, we dissalow onlyTest: true separately
        test.only(name, testFn)
    }
    else {
        test(name, testFn)
    }
}

async function replaceInput(t: TestController, original: string | RegExp, newv: string, nth = 0): Promise<void> {
    const inputSelector = Selector('input').withAttribute('value', original).nth(nth)
    await t.click(inputSelector)
    await t.selectText(inputSelector)
    await t.typeText(inputSelector, newv)
    await t.pressKey('enter')
}

mapperTest('manipulate point map', 'pMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', {}, async (t) => {
    await toggleCustomScript(t)
    await t.expect(await getErrors()).eql([])
})

mapperTest('manipulate insets', 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', { }, async (t) => {
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

function errorInSubfield(category: string, errorCausingCode: string, error: string): void {
    mapperTest(`${category} error in subfield`, 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', { }, async (t) => {
        await toggleCustomScript(t)
        await t.expect(await getErrors()).eql([])
        await replaceInput(t, 'Linear Scale', 'Custom Expression')
        await typeInEditor(t, 0, errorCausingCode, true)
        await waitForLoading(t)
        await t.expect(await getErrors()).eql([error])
        await screencap(t)
    })
}

errorInSubfield('syntax', 'linearScale(max=)', 'Unexpected bracket ) at 1:17')
errorInSubfield('semantic', 'linearScale(max=2 + "hi")', 'Invalid types for operator +: number and string at 1:17-24')

function errorInSubsubfield(category: string, errorCausingCode: string, error: string): void {
    mapperTest(`${category} error in subsubfield`, 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', { }, async (t) => {
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

errorInSubsubfield('syntax', '0.1 + ', 'Unexpected end of input at 1:5')
errorInSubsubfield('semantic', 'unknownFunction()', 'Undefined variable: unknownFunction at 1:1-15')
