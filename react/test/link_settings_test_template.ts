import { Selector } from 'testcafe'

import { ensureCategoryExpanded, enterEditMode, withEditMode } from './edit_mode_test_utils'
import { arrayFromSelector, getLocation, safeReload, screencap, target, urbanstatsFixture } from './test_utils'

/**
 * Which tree the page chooses its statistics from: the article table has one of its own, in edit
 * mode, while the comparison table still uses the sidebar's.
 */
type StatisticTree = 'edit-table' | 'sidebar'

const sidebarMainToggle = Selector('.expandButton[data-category-id=main]')

export function linkSettingsTests(baseLink: string, tree: StatisticTree): void {
    const editing = tree === 'edit-table'

    /** The edit table's controls carry the same names as the sidebar's, under `edit_` ids. */
    const treeId = (testId: string): string => editing ? `edit_${testId}` : testId

    /**
     * Main has to be expanded to reach the Population group whenever Population is unselected (a
     * selected group is shown either way). Needed again after leaving staging, since the
     * Discard/Apply buttons double as Done.
     */
    async function openTree(t: TestController): Promise<void> {
        if (!editing) {
            // `exists` doesn't wait, so the toggle has to be there before asking which way it points.
            await t.expect(sidebarMainToggle.exists).ok()
            if (await sidebarMainToggle.withAttribute('aria-label', /^Expand /).exists) {
                await t.click(sidebarMainToggle)
            }
            return
        }
        await enterEditMode(t)
        await ensureCategoryExpanded(t, 'main')
    }

    /** The sidebar's tree is always on the page; the edit table's has to be opened first. */
    async function withTree(t: TestController, block: () => Promise<void>): Promise<void> {
        if (editing) {
            await withEditMode(t, block)
        }
        else {
            await block()
        }
    }

    urbanstatsFixture('generate link', baseLink, async (t) => {
        await openTree(t)
    })

    let defaultLink: string
    let expectedLink: string

    test('formulates correct link', async (t) => {
        defaultLink = await getLocation()

        // Check imperial, uncheck population
        await t.click('input[data-test-id=use_imperial]')
        await t.click(`input[data-test-id=${treeId('group_population')}]:not([inert] *)`)

        expectedLink = await getLocation()
    })

    urbanstatsFixture('paste link new visitor', target, async (t) => {
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
        await openTree(t)

        // Should be no staging menu as this was first visit so we steal the settings from the vector
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()

        await expectInputTestIdValues(t, {
            use_imperial: true,
            [treeId('group_population')]: false,
        })

        await screencap(t)
    })

    test('settings are not saved for new visitor if they do not make any modifications', async (t) => {
        await t.navigateTo(baseLink)

        await openTree(t)

        await expectInputTestIdValues(t, {
            use_imperial: false,
            [treeId('group_population')]: true,
        })

        await t.expect(getLocation())
            .eql(defaultLink)

        await screencap(t)
    })

    test('settings are saved for new visitor if they do make a modification', async (t) => {
        await withTree(t, async () => {
            await t.click(`input[data-test-id=${treeId('year_2010')}]`)
        })

        await t.navigateTo(baseLink)

        await openTree(t)

        await expectInputTestIdValues(t, {
            use_imperial: true,
            [treeId('group_population')]: false,
            [treeId('year_2010')]: true,
        })

        await screencap(t)
    })

    urbanstatsFixture('paste link previous visitor', baseLink, async (t) => {
        await withTree(t, async () => {
            await t.click(`input[data-test-id=${treeId('year_2010')}]`) // change a setting so settings are saved
        })
        await t.navigateTo(expectedLink)
        await openTree(t)
    })

    /** An open edit table repeats the sidebar's statistic controls under its own ids. */
    const bothTrees = (testIds: string[]): string[] => editing ? [...testIds, ...testIds.map(treeId)] : testIds

    /** Compared as a set: the sidebar's tree and the edit table's both render a checkbox per group. */
    async function expectHighlightedInputTestIds(t: TestController, testIds: string[]): Promise<void> {
        const highlightedInputs = await arrayFromSelector(Selector('input[data-test-highlight=true]:not([inert] *)'))
        const actual = await Promise.all(highlightedInputs.map(input => input.getAttribute('data-test-id')))

        await t.expect(actual.slice().sort()).eql(testIds.slice().sort())
    }

    test('should have the staging controls', async (t) => {
        await t.expect(Selector('[data-test-id=staging_controls]').exists).ok()

        await expectHighlightedInputTestIds(t, ['use_imperial', ...bothTrees(['year_2010', 'category_main', 'group_population'])])

        await screencap(t)
    })

    test('discard staged settings', async (t) => {
        await t.click('button[data-test-id=discard]')
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()
        await openTree(t)
        await expectHighlightedInputTestIds(t, [])
        await expectInputTestIdValues(t, {
            use_imperial: false,
            [treeId('group_population')]: true,
            [treeId('year_2010')]: true,
        })

        await screencap(t)
    })

    test('apply staged settings', async (t) => {
        await t.click('button[data-test-id=apply]')
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()
        await openTree(t)
        await expectHighlightedInputTestIds(t, [])
        await expectInputTestIdValues(t, {
            use_imperial: true,
            [treeId('group_population')]: false,
            [treeId('year_2010')]: false,
        })

        await safeReload(t)
        await openTree(t)

        // Settings persist after reload without staging
        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()
        await expectInputTestIdValues(t, {
            use_imperial: true,
            [treeId('group_population')]: false,
            [treeId('year_2010')]: false,
        })

        await screencap(t)
    })

    test('manually discard changes', async (t) => {
        await t.click('input[data-test-id=use_imperial]')
        await t.click(`input[data-test-id=${treeId('group_population')}]:not([inert] *)`)

        await expectHighlightedInputTestIds(t, bothTrees(['year_2010'])) // category is unhighlighted because its groups aren't highlighted

        await t.click(`input[data-test-id=${treeId('year_2010')}]`)

        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()

        await expectInputTestIdValues(t, {
            use_imperial: false,
            [treeId('group_population')]: true,
            [treeId('year_2010')]: true,
        })

        await screencap(t)
    })

    test('apply some changes', async (t) => {
        // Apply everything but use_imperial
        await t.click('input[data-test-id=use_imperial]')

        await expectHighlightedInputTestIds(t, bothTrees(['year_2010', 'category_main', 'group_population']))

        await t.click('button[data-test-id=apply]')

        await t.expect(Selector('[data-test-id=staging_controls]').exists).notOk()

        await openTree(t)

        await expectInputTestIdValues(t, {
            use_imperial: false,
            [treeId('group_population')]: false,
            [treeId('year_2010')]: false,
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
            .click(histogramTypeSelect.find('option').withExactText('Bar'))

        histogramLinkWithBar = await getLocation()
    })

    urbanstatsFixture('paste histogram link', target, async (t) => {
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

    urbanstatsFixture('paste histogram relative changed link', target, async (t) => {
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

    urbanstatsFixture('paste histogram bar link', target, async (t) => {
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
        await withTree(t, async () => {
            await t.click(Selector(`[data-test-id=${treeId('category_main')}]`))
        })

        hiddenHistogramLink = await getLocation()
    })

    urbanstatsFixture('visit hidden histogram link and reopen stats', target, async (t) => {
        await t.navigateTo(hiddenHistogramLink)
        await withTree(t, async () => {
            await t.click(Selector(`[data-test-id=${treeId('category_main')}]`))
        })
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
