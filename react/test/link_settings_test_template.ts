import { Selector } from 'testcafe'

import { arrayFromSelector, getLocation, safeReload, screencap, TARGET, urbanstatsFixture } from './test_utils'

export function linkSettingsTests(baseLink: string): void {
    urbanstatsFixture('generate link', baseLink, async (t) => {
        await t.click('.expandButton[data-category-id=main]')
    })

    let defaultLink: string
    let expectedLink: string

    test('formulates correct link', async (t) => {
        defaultLink = await getLocation()

        // Check imperial, uncheck population
        await t.click('input[data-test-id=use_imperial]')
        await t.click('input[data-test-id=group_population]:not([inert] *)')

        expectedLink = await getLocation()
    })

    urbanstatsFixture('paste link new visitor', TARGET, async (t) => {
        await t.navigateTo(expectedLink)
    })

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
            .eql(defaultLink)

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

        await safeReload(t)

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

    let histogramLink: string
    let histogramLinkWithRelativeChanged: string
    let histogramLinkWithBar: string

    urbanstatsFixture('generate histogram link', baseLink)

    test('open histogram', async (t) => {
        await t.click(Selector('.expand-toggle'))

        histogramLink = await getLocation()
    })

    test('open histogram with relative changed', async (t) => {
        await t.click(Selector('.expand-toggle'))
        await t.click(Selector('[data-test-id=histogram_relative]'))

        histogramLinkWithRelativeChanged = await getLocation()
    })

    const histogramTypeSelect = Selector('[data-test-id=histogram_type]')

    test('open bar histogram', async (t) => {
        await t.click(Selector('.expand-toggle'))
        await t.click(histogramTypeSelect)
            .click(histogramTypeSelect.find('option').withText('Bar'))

        histogramLinkWithBar = await getLocation()
    })

    urbanstatsFixture('paste histogram link', TARGET, async (t) => {
        await t.navigateTo(histogramLink)
    })

    test('histogram is visible', async (t) => {
        await t.expect(Selector('.histogram-svg-panel').exists).ok()
        await screencap(t)
    })

    test('not in staging mode', async (t) => {
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()
    })

    test('settings are not saved for new visitor', async (t) => {
        await t.navigateTo(baseLink)
        await t.expect(Selector('.histogram-svg-panel').exists).notOk()
    })

    test('settings are saved for new visitor once they make a change', async (t) => {
        await t.click(Selector('[data-test-id=histogram_relative]'))
        await t.navigateTo(baseLink)
        await t.expect(Selector('.histogram-svg-panel').exists).ok()
    })

    urbanstatsFixture('paste histogram relative changed link', TARGET, async (t) => {
        await t.navigateTo(histogramLinkWithRelativeChanged)
    })

    test('relative changed histogram is visible', async (t) => {
        await t.expect(Selector('.histogram-svg-panel').exists).ok()
        await t.expect(Selector('[data-test-id=histogram_relative]').checked).notOk()
        await screencap(t)
    })

    test('relative changed histogram is not in staging mode', async (t) => {
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()
    })

    urbanstatsFixture('paste histogram bar link', TARGET, async (t) => {
        await t.navigateTo(histogramLinkWithBar)
    })

    test('histogram has bar selected', async (t) => {
        await t.expect(histogramTypeSelect.value).eql('Bar')
    })

    let hiddenHistogramLink: string

    /*
     * Test that settings included in the link, but not visible, are not applied
     */
    urbanstatsFixture('generate hidden histogram link', baseLink)

    test('open histogram, and changed to non-relative, but then hide stat path', async (t) => {
        await t.click(Selector('.expand-toggle'))
        await t.click(Selector('[data-test-id=histogram_relative]'))

        // uncheck the main stats
        await t.click(Selector('[data-test-id=category_main]'))

        hiddenHistogramLink = await getLocation()
    })

    urbanstatsFixture('visit hidden histogram link and reopen stats', TARGET, async (t) => {
        await t.navigateTo(hiddenHistogramLink)
        await t.click(Selector('[data-test-id=category_main]'))
    })

    test('histogram should not be visible', async (t) => {
        await t.expect(Selector('.histogram-svg-panel').exists).notOk()
    })

    test('upon opening histogram, relative setting should be correct (not like the previous setting)', async (t) => {
        await t.click(Selector('.expand-toggle'))
        await t.expect(Selector('[data-test-id=histogram_relative]').checked).ok()
    })

    test('link should not include histogram settings', async (t) => {
        await t.expect(getLocation()).notEql(hiddenHistogramLink)
    })
}
