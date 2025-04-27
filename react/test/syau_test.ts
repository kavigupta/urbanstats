import { Selector } from 'testcafe'

import { withMockedClipboard } from './quiz_test_utils'
import { safeReload, screencap, target, urbanstatsFixture } from './test_utils'

const syauInput = Selector('input[id="syau-input"]')

async function addInputText(t: TestController, text: string, expected: string | undefined = undefined): Promise<void> {
    await t.typeText(syauInput, text)
    await t.expect(syauInput.value).eql(expected ?? text)
}

async function clearInputText(t: TestController): Promise<void> {
    await t.selectText(syauInput).pressKey('ctrl+a delete')
}

async function allSyauPredictions(): Promise<string[]> {
    // Get text of all classes 'testing-syau-named'
    const elements = Selector('.testing-syau-named')
    const elementsCount = await elements.count
    const elementsText: string[] = []
    for (let i = 0; i < elementsCount; i++) {
        const element = elements.nth(i)
        const text = await element.innerText
        elementsText.push(text)
    }
    return elementsText
}

async function assertCopy(t: TestController, expected: string[]): Promise<void> {
    await t.expect(await withMockedClipboard(t, async () => {
        await t.click(Selector('button').withExactText('Copy'))
    })).eql(expected)
}

async function assertText(t: TestController, expected: string): Promise<void> {
    // get text of test-syau-status
    const element = Selector('#test-syau-status')
    const text = await element.innerText
    await t.expect(text).eql(expected)
}

urbanstatsFixture('california-cities', '/syau.html?typ=City&universe=California%2C+USA')

test('los-angeles', async (t) => {
    await addInputText(t, 'Los Angele')
    await t.expect(await allSyauPredictions()).eql([])
    await addInputText(t, 's', '')
    await t.expect(await allSyauPredictions()).eql(['1. Los Angeles city'])
})

test('oakland', async (t) => {
    await addInputText(t, 'Oakland', 'land')
    await t.expect(await allSyauPredictions()).eql(['421. Oak Park CDP', '510. Oak Hills CDP'])
    await clearInputText(t)
    await addInputText(t, 'Oakland', '')
    await t.expect(await allSyauPredictions()).eql(['8. Oakland city', '421. Oak Park CDP', '510. Oak Hills CDP'])
})

test('oak-partial', async (t) => {
    await addInputText(t, 'Oak', '')
    await screencap(t)
    await t.expect(await allSyauPredictions()).eql(['421. Oak Park CDP', '510. Oak Hills CDP'])
    await addInputText(t, 'Oak', 'Oak')
    await screencap(t)
})

test('la-canada', async (t) => {
    await addInputText(t, 'la canada flintridge', '')
    await t.expect(await allSyauPredictions()).eql(['344. La Cañada Flintridge city'])
})

test('ventura', async (t) => {
    await addInputText(t, 'san buenaventura', '')
    await t.expect(await allSyauPredictions()).eql(['61. San Buenaventura (Ventura) city'])
})

test('oakland-simulate-autocomplete', async (t) => {
    await t.typeText(syauInput, 'Oakland ', { paste: true })
    await t.expect(syauInput.value).eql('')
    await t.expect(await allSyauPredictions()).eql(['8. Oakland city'])
})

test.only('round-down', async (t) => {
    await addInputText(t, 'san francisco', '')
    await addInputText(t, 'san diego', '')
    await addInputText(t, 'fresno', '')
    await screencap(t)
    await assertCopy(t, [
        'I named 3/1607 Cities in California, USA\n'
        + '(7% of the population)\n'
        + '\n'
        + '🟥🟥🟥🟥🟥🟥🟥🟥🟥🟥\n'
        + '\n'
        + `${target}/syau.html?typ=City&universe=California%2C+USA`,
    ])
    await assertText(t, '3/1607 Cities named, which is 7% of the total population.')
    await safeReload(t)
    await addInputText(t, 'los angeles', '')
    await screencap(t)
    await assertCopy(t, [
        'I named 4/1607 Cities in California, USA\n'
        + '(18% of the population)\n'
        + '\n'
        + '🟩🟥🟥🟥🟥🟥🟥🟥🟥🟥\n'
        + '\n'
        + `${target}/syau.html?typ=City&universe=California%2C+USA`,
    ])
    await assertText(t, '4/1607 Cities named, which is 18% of the total population.')
})

urbanstatsFixture('missouri-cities', '/syau.html?typ=City&universe=Missouri%2C+USA')

test('o-fallon', async (t) => {
    await addInputText(t, 'o', '')
    await addInputText(t, 'o\'fallon', '')
    await t.expect(await allSyauPredictions()).eql(['7. O\'Fallon city', '865. Chain-O-Lakes village'])
})

test('o-fallon-smartquote', async (t) => {
    await addInputText(t, 'o', '')
    await addInputText(t, 'o’fallon', '')
    await t.expect(await allSyauPredictions()).eql(['7. O\'Fallon city', '865. Chain-O-Lakes village'])
})

urbanstatsFixture('usa-urban-areas', '/syau.html?typ=Urban+Area&universe=USA')
test('boise-ua', async (t) => {
    await addInputText(t, 'boise', '')
    await t.expect(await allSyauPredictions()).eql(['94. Boise City [Urban Area]'])
})

test('louisville-ua', async (t) => {
    await addInputText(t, 'louisville', '')
    await t.expect(await allSyauPredictions()).eql(['48. Louisville/Jefferson County [Urban Area]', '320. Lafayette-Erie-Louisville [Urban Area]'])
})

test('st-louis-ua', async (t) => {
    await addInputText(t, 'st louis', '')
    await t.expect(await allSyauPredictions()).eql(['22. St. Louis [Urban Area]', '1003. Alma-St. Louis [Urban Area]'])
})

test('st.-louis-ua', async (t) => {
    await addInputText(t, 'st. louis', '')
    await t.expect(await allSyauPredictions()).eql(['22. St. Louis [Urban Area]', '1003. Alma-St. Louis [Urban Area]'])
})

test('los-angeles-ua', async (t) => {
    await addInputText(t, 'los angeles', '')
    await t.expect(await allSyauPredictions()).eql(['2. Los Angeles-Long Beach-Anaheim [Urban Area]'])
})

test('anaheim-ua', async (t) => {
    await addInputText(t, 'anaheim', '')
    await t.expect(await allSyauPredictions()).eql(['2. Los Angeles-Long Beach-Anaheim [Urban Area]'])
})

urbanstatsFixture('us-urban-centers', '/syau.html?typ=Urban+Center&universe=USA')
test('washington-dc-urban-center', async (t) => {
    await addInputText(t, 'washington dc', '')
    await t.expect(await allSyauPredictions()).eql(['10. Washington D.C. Urban Center'])
})

test('tijuana-urban-center', async (t) => {
    await addInputText(t, 'tijuana', '')
    await t.expect(await allSyauPredictions()).eql(['8. Tijuana Urban Center'])
})

urbanstatsFixture('delaware-counties', '/syau.html?typ=County&universe=Delaware%2C+USA')

test('sussex-delaware', async (t) => {
    await addInputText(t, 'sussex', '')
    await t.expect(await allSyauPredictions()).eql(['2. Sussex County'])
})

urbanstatsFixture('canada-cma', '/syau.html?typ=CA+CMA&universe=Canada')
test('toronto-cma', async (t) => {
    await addInputText(t, 'toronto', '')
    await t.expect(await allSyauPredictions()).eql(['1. Toronto CMA'])
})

test('montreal-cma', async (t) => {
    await addInputText(t, 'montreal', '')
    await t.expect(await allSyauPredictions()).eql(['2. Montréal CMA'])
})

urbanstatsFixture('nevada-counties', '/syau.html?typ=County&universe=Nevada%2C+USA')

test('more-precise-percentages', async (t) => {
    await addInputText(t, 'clark', '')
    await assertText(t, '1/17 Counties named, which is 73% of the total population.')
    await assertCopy(t, [
        'I named 1/17 Counties in Nevada, USA\n'
        + '(73% of the population)\n'
        + '\n'
        + '🟩🟩🟩🟩🟩🟩🟩🟥🟥🟥\n'
        + '\n'
        + `${target}/syau.html?typ=County&universe=Nevada%2C+USA`,
    ])
    await safeReload(t)
    await addInputText(t, 'washoe', '')
    await addInputText(t, 'lyon', '')
    await assertText(t, '3/17 Counties named, which is 90.5% of the total population.')
    await assertCopy(t, [
        'I named 3/17 Counties in Nevada, USA\n'
        + '(90.5% of the population)\n'
        + '\n'
        + '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟥\n'
        + '\n'
        + `${target}/syau.html?typ=County&universe=Nevada%2C+USA`,
    ])
    await safeReload(t)
    await addInputText(t, 'carson city', '')
    await addInputText(t, 'elko', '')
    await addInputText(t, 'nye', '')
    await addInputText(t, 'douglas', '')
    await addInputText(t, 'churchill', '')
    await addInputText(t, 'humboldt', '')
    await addInputText(t, 'white pine', '')
    await assertText(t, '10/17 Counties named, which is 99.09% of the total population.')
    await assertCopy(t, [
        'I named 10/17 Counties in Nevada, USA\n'
        + '(99.09% of the population)\n'
        + '\n'
        + '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟥\n'
        + '\n'
        + `${target}/syau.html?typ=County&universe=Nevada%2C+USA`,
    ])
    await safeReload(t)
    await addInputText(t, 'pershing', '')
    await addInputText(t, 'lander', '')
    await addInputText(t, 'mineral', '')
    await addInputText(t, 'lincoln', '')
    await addInputText(t, 'storey', '')
    await assertText(t, '15/17 Counties named, which is 99.917% of the total population.')
    await assertCopy(t, [
        'I named 15/17 Counties in Nevada, USA\n'
        + '(99.917% of the population)\n'
        + '\n'
        + '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟥\n'
        + '\n'
        + `${target}/syau.html?typ=County&universe=Nevada%2C+USA`,
    ])
    await safeReload(t)
    await addInputText(t, 'eureka', '')
    await addInputText(t, 'esmeralda', '')
    await assertText(t, '17/17 Counties named, which is 100% of the total population.')
    await assertCopy(t, [
        'I named 17/17 Counties in Nevada, USA\n'
        + '(100% of the population)\n'
        + '\n'
        + '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩\n'
        + '\n'
        + `${target}/syau.html?typ=County&universe=Nevada%2C+USA`,
    ])
})
