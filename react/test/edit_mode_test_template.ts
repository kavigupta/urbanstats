import { Selector } from 'testcafe'

import { categoryCheckbox, clearFilterButton, doneButton, editButton, filterBox, groupCheckbox, groupWarning, interactableGroupCheckbox, yearCheckbox } from './edit_mode_test_utils'
import { resizeForPlatform, safeReload, screencap, uncheckAllCategories, urbanstatsFixture } from './test_utils'

/**
 * The parts of edit mode that behave the same on the article table and the comparison table.
 * The table-specific behavior (transposition, the per-region columns) lives in each caller's
 * file.
 */
export function editModeSharedTests(spec: {
    /** Prefixes the fixture names, so the two callers' fixtures stay distinguishable. */
    name: string
    page: string
    /** A selector for the table the edit tree lives on. */
    scope: string
    editButtonLabel: string
    /**
     * Names the expanded plot should carry a series for. Empty for a table with a single
     * column, where the plot has nothing to distinguish.
     */
    expectedPlotSeries: string[]
    congressional: { page: string, expectedRegions: string[] }
}): void {
    const table = Selector(spec.scope)
    // Above the table rather than on it, so it stays out of the table's horizontal scroll.
    const stagingControls = Selector('[data-test-id=staging_controls]')
    const mainCategory = categoryCheckbox('main')
    // Population is a single-stat group, so its row is the one carrying the group checkbox.
    const populationGroup = groupCheckbox('population')
    const year2020 = yearCheckbox(2020)

    urbanstatsFixture(`${spec.name} edit mode shared`, spec.page)

    test('edit mode toggles the checkbox tree on the table', async (t) => {
        await t.expect(editButton.innerText).eql(spec.editButtonLabel)
        await t.expect(mainCategory.exists).notOk()
        await screencap(t)

        await t.click(editButton)

        await t.expect(doneButton.exists).ok()
        await t.expect(filterBox.exists).ok()
        await t.expect(mainCategory.checked).ok()
        await screencap(t)

        await t.click(doneButton)
        await t.expect(editButton.exists).ok()
        await t.expect(mainCategory.exists).notOk()
    })

    test('the filter narrows the tree', async (t) => {
        await t.click(editButton)
        await t.typeText(filterBox, 'gene')

        await t.expect(interactableGroupCheckbox('generation_genx').exists).ok()
        await t.expect(mainCategory.exists).notOk()

        await t.selectText(filterBox).pressKey('delete')
        await t.expect(mainCategory.exists).ok()
    })

    test('the filter can be cleared with its x button', async (t) => {
        await t.click(editButton)
        await t.expect(clearFilterButton.exists).notOk()

        await t.typeText(filterBox, 'gene')
        await t.expect(mainCategory.exists).notOk()

        await t.click(clearFilterButton)

        await t.expect(filterBox.value).eql('')
        await t.expect(clearFilterButton.exists).notOk()
        await t.expect(mainCategory.exists).ok()
    })

    test('a stat can be expanded in edit mode', async (t) => {
        await t.click(editButton)

        const expandToggle = table.find('.expand-toggle:not([inert] *)')
        await t.expect(expandToggle.exists).ok()
        await t.click(expandToggle.nth(0))

        const histogram = table.find('.histogram-svg-panel')
        await t.expect(histogram.exists).ok()
        for (const series of spec.expectedPlotSeries) {
            await t.expect(histogram.textContent).contains(series)
        }
    })

    test('a group the year selection empties warns in its own row', async (t) => {
        await t.click(editButton)
        await t.expect(year2020.checked).eql(true)
        const populationRow = populationGroup.parent('.for-testing-table-row')
        await t.expect(populationRow.find('.testing-statistic-value').exists).ok()

        await t.click(year2020)

        // The row stays -- it's the only way back to the checkbox -- and the warning takes the
        // place of its values.
        await t.expect(groupWarning('population').innerText).match(/^\s*Select .*2020.* to see this statistic\.\s*$/)
        await t.expect(populationRow.find('.testing-statistic-value').exists).notOk()
        await screencap(t)

        await t.click(year2020)
        await t.expect(populationRow.find('.testing-statistic-value').exists).ok()
        await t.expect(groupWarning('population').exists).notOk()
    })

    test('a warning is a way into edit mode', async (t) => {
        await t.click(editButton)
        await t.click(year2020)
        // The tree's own warning names settings that are already on screen, so it offers no button.
        await t.expect(groupWarning('population').find('[data-test-id=warning-edit-action]').exists).notOk()
        await t.click(doneButton)

        const editAction = table.find('[data-test-id=warning-edit-action]')
        await t.expect(editAction.nth(0).innerText).eql('Select')

        await t.click(editAction.nth(0))

        // Edit mode, open on the year checkboxes the warning named.
        await t.expect(filterBox.exists).ok()
        await t.expect(year2020.checked).eql(false)
    })

    test('unselecting every category leaves the tree unwarned', async (t) => {
        await t.click(editButton)
        await uncheckAllCategories(t)

        // The tree the user fixes this with is right there, so there's nothing to warn about.
        await t.expect(table.find('[data-test-id=article-warning]').exists).notOk()
        // A collapsed category keeps its rows mounted for the height transition, so the check is
        // for rows on display rather than rows in the DOM.
        await t.expect(table.find('.testing-statistic-value:not([inert] *)').exists).notOk()
        await t.expect(mainCategory.exists).ok()

        await t.click(doneButton)
        await t.expect(table.find('[data-test-id=article-warning]').innerText).match(/^\s*No Statistics are selected\s*$/)
    })

    test('edit mode is ephemeral across reloads', async (t) => {
        await t.click(editButton)
        await t.expect(doneButton.exists).ok()

        await safeReload(t)

        await t.expect(editButton.exists).ok()
        await t.expect(doneButton.exists).notOk()
    })

    urbanstatsFixture(`${spec.name} edit mode staging`, spec.page, async (t) => {
        // Save a setting first, so the link enters staging instead of silently applying.
        await t.click(Selector('input[data-test-id=use_imperial]'))
        await t.navigateTo(`${spec.page}&s=29ZqGgHgeNSXMA9`)
    })

    test('edit mode auto-opens in staging', async (t) => {
        await t.expect(filterBox.exists).ok()
        await t.expect(stagingControls.exists).ok()
        // Discard/Apply replace the Done button.
        await t.expect(doneButton.exists).notOk()
        await t.expect(table.find('input[data-test-highlight=true]').exists).ok()
        await screencap(t)
    })

    test('applying staged changes also exits edit mode', async (t) => {
        await t.click(stagingControls.find('button[data-test-id=apply]'))
        await t.expect(stagingControls.exists).notOk()
        await t.expect(editButton.exists).ok()
    })

    test('discarding staged changes also exits edit mode', async (t) => {
        await t.click(stagingControls.find('button[data-test-id=discard]'))
        await t.expect(stagingControls.exists).notOk()
        await t.expect(editButton.exists).ok()
    })

    urbanstatsFixture(`${spec.name} edit mode mobile`, spec.page, async (t) => {
        await resizeForPlatform(t, 'mobile')
    })

    test('mobile edit mode drops every column but the value', async (t) => {
        await t.click(editButton)
        await t.expect(filterBox.exists).ok()
        await t.expect(table.find('.testing-statistic-value').exists).ok()
        await t.expect(table.find('[data-test-id=statistic-ordinal]').exists).notOk()
        await screencap(t, { fullPage: false })
    })

    urbanstatsFixture(`${spec.name} edit mode congressional`, spec.congressional.page)

    const congressionalGroup = groupCheckbox('metadata_show_metadata_congressional_representatives')
    const congressionalWidget = table.find('[data-test-id=congressional-representatives]')

    test('congressional representatives table shows when the stat is enabled', async (t) => {
        await t.click(editButton)
        await t.typeText(filterBox, 'Congressional')
        await t.expect(congressionalGroup.exists).ok()

        await t.expect(congressionalWidget.exists).notOk()

        await t.click(congressionalGroup)
        await t.expect(congressionalWidget.exists).ok()
        for (const region of spec.congressional.expectedRegions) {
            await t.expect(congressionalWidget.textContent).contains(region)
        }
        await screencap(t)
    })
}
