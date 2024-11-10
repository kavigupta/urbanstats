import { Selector } from 'testcafe'

import { arrayFromSelector, getLocation, screencap, TARGET, urbanstatsFixture } from './test_utils'

export function linkSettingsTests(baseLink: string): void {
    urbanstatsFixture('generate link', baseLink, async (t) => {
        await t.click('.expandButton[data-category-id=main]')
    })

    const defaultLink = `${baseLink}&s=BY6xv3Ds1ih`
    const expectedLink = `${baseLink}&s=BChctRbFJ1F`

    test('formulates correct link', async (t) => {
        // Check imperial, uncheck population
        await t.click('input[data-test-id=use_imperial]')
        await t.click('input[data-test-id=group_population]:not([inert] *)')

        await t.expect(getLocation())
            .eql(`${TARGET}${expectedLink}`)
    })

    urbanstatsFixture('paste link new visitor', expectedLink)

    async function expectInputTestIdValues(t: TestController, mapping: Record<string, boolean>): Promise<void> {
        for (const [testId, value] of Object.entries(mapping)) {
            const selector = `input[data-test-id=${testId}]:not([inert] *)`
            const isChecked = await Selector(selector).checked
            await t.expect(isChecked).eql(value, `expected selector '${selector}' to have 'checked' value ${value}, but instead had ${isChecked}`)
        }
    }

    test('settings are applied correctly to new visitor', async (t) => {
        // assuming localstorage is cleared (happens in the fixture)
        await t.click('.expandButton[data-category-id=main]')

        // Should be no staging menu as this was first visit so we steal the settings from the vector
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()

        await expectInputTestIdValues(t, {
            use_imperial: true,
            group_population: false,
        })

        await screencap(t)
    })

    test('settings are not saved for new visitor if they do not make any modifications', async (t) => {
        await t.navigateTo(baseLink)

        await t.click('.expandButton[data-category-id=main]')

        await expectInputTestIdValues(t, {
            use_imperial: false,
            group_population: true,
        })

        await t.expect(getLocation())
            .eql(`${TARGET}${defaultLink}`)

        await screencap(t)
    })

    test('settings are saved for new visitor if they do make a modification', async (t) => {
        await t.click('input[data-test-id=year_2010]')

        await t.navigateTo(baseLink)

        await t.click('.expandButton[data-category-id=main]')

        await expectInputTestIdValues(t, {
            use_imperial: true,
            group_population: false,
            year_2010: true,
        })

        await screencap(t)
    })

    urbanstatsFixture('paste link previous visitor', baseLink, async (t) => {
        await t.click('input[data-test-id=year_2010]') // change a setting so settings are saved
        await t.navigateTo(expectedLink)
        await t.click('.expandButton[data-category-id=main]')
    })

    async function expectHighlightedInputTestIds(t: TestController, testIds: string[]): Promise<void> {
        const highlightedInputs = await arrayFromSelector(Selector('input[data-test-highlight=true]:not([inert] *)'))

        await t.expect(await Promise.all(highlightedInputs.map(input => input.getAttribute('data-test-id')))).eql(testIds)
    }

    test('should have the staging controls', async (t) => {
        await t.expect(Selector('[data-test-id=staging_controls]').exists).ok()

        await expectHighlightedInputTestIds(t, ['use_imperial', 'year_2010', 'category_main', 'group_population'])

        await screencap(t)
    })

    test('discard staged settings', async (t) => {
        await t.click('button[data-test-id=discard]')
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()
        await expectHighlightedInputTestIds(t, [])
        await expectInputTestIdValues(t, {
            use_imperial: false,
            group_population: true,
            year_2010: true,
        })

        await screencap(t)
    })

    test('apply staged settings', async (t) => {
        await t.click('button[data-test-id=apply]')
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()
        await expectHighlightedInputTestIds(t, [])
        await expectInputTestIdValues(t, {
            use_imperial: true,
            group_population: false,
            year_2010: false,
        })

        await t.eval(() => { location.reload() })

        // Settings persist after reload without staging
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()
        await expectInputTestIdValues(t, {
            use_imperial: true,
            group_population: false,
            year_2010: false,
        })

        await screencap(t)
    })

    test('manually discard changes', async (t) => {
        await t.click('input[data-test-id=use_imperial]')
        await t.click('input[data-test-id=group_population]:not([inert] *)')

        await expectHighlightedInputTestIds(t, ['year_2010']) // category is unhighlighted because its groups aren't highlighted

        await t.click('input[data-test-id=year_2010]')

        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()

        await expectInputTestIdValues(t, {
            use_imperial: false,
            group_population: true,
            year_2010: true,
        })

        await screencap(t)
    })

    test('apply some changes', async (t) => {
        // Apply everything but use_imperial
        await t.click('input[data-test-id=use_imperial]')

        await expectHighlightedInputTestIds(t, ['year_2010', 'category_main', 'group_population'])

        await t.click('button[data-test-id=apply]')

        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()

        await expectInputTestIdValues(t, {
            use_imperial: false,
            group_population: false,
            year_2010: false,
        })

        await screencap(t)
    })

    const histogramLink = `${baseLink}&s=oWHKo6omJJwy`

    urbanstatsFixture('generate histogram link', baseLink)

    test('open histogram', async (t) => {
        await t.click(Selector('.expand-toggle'))

        await t.expect(getLocation())
            .eql(`${TARGET}${histogramLink}`)
    })

    urbanstatsFixture('paste histogram link', histogramLink)

    test('histogram is visible', async (t) => {
        await t.expect(Selector('.histogram-svg-panel').exists).ok()
        await screencap(t)
    })

    test('not in staging mode', async (t) => {
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()
    })
}
