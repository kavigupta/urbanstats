import { Selector } from 'testcafe'

import { checkBox, getCodeFromMainField, getErrors, toggleCustomScript, urlFromCode } from './mapper-utils'
import { urbanstatsFixture, waitForLoading } from './test_utils'

function mapperTest(name: string, code: string, opts: { onlyTest?: true }, testFn: (t: TestController) => Promise<void>): void {
    // use Iceland and Subnational Region as a quick test (less data to load)
    urbanstatsFixture(`quick-${code}`, urlFromCode('Subnational Region', 'Iceland', code))
    if (opts.onlyTest) {
        // eslint-disable-next-line no-only-tests/no-only-tests -- conditional, we dissalow onlyTest: true separately
        test.only(name, testFn)
    }
    else {
        test(name, testFn)
    }
}

async function replaceInput(t: TestController, original: string | RegExp, newv: string): Promise<void> {
    const inputSelector = Selector('input').withAttribute('value', original)
    await t.click(inputSelector)
    await t.selectText(inputSelector)
    await t.typeText(inputSelector, newv)
    await t.pressKey('enter')
}

mapperTest('manipulate point map', 'pMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', {}, async (t) => {
    await toggleCustomScript(t)
    await t.expect(await getErrors()).eql([])
})

mapperTest('manipulate insets', 'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis)', {}, async (t) => {
    await toggleCustomScript(t)
    await t.expect(await getErrors()).eql([])
    await checkBox(t, /^Insets/)
    await replaceInput(t, 'Default Insets', 'Custom Inset')
    await waitForLoading(t)
    await replaceInput(t, 'Iceland', 'Custom Inset')
    await waitForLoading(t)
    await replaceInput(t, /^-13\.4/, '-13')
    await waitForLoading(t)
    await t.expect(await getErrors()).eql([])
    await toggleCustomScript(t)
    await t.expect(await getCodeFromMainField()).eql(
        'cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, insets=constructInsets([constructInset(screenBounds={north: 1, east: 1, south: 0, west: 0}, mapBounds={north: 66.54638908819885, east: -13, south: 63.38379679465158, west: -24.54201452954334}, mainMap=true, name="Iceland")]))\n',
    )
})
