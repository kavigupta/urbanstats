import { Selector } from 'testcafe'

import { categoryCheckbox, clearFilterButton, doneButton, editButton, filterBox, groupCheckbox, interactableGroupCheckbox } from './edit_mode_test_utils'
import { resizeForPlatform, safeReload, screencap, urbanstatsFixture } from './test_utils'

/**
 * The parts of edit mode that behave the same on the article table and the comparison
 * table: that the Edit button opens and closes the tree, that it doesn't survive a reload,
 * that arriving via a settings link opens it with the staging controls on the table, that
 * the filter narrows the tree, that a stat's plot and its metadata extras render below its
 * row, and what the mobile layout gives up.
 *
 * The table-specific behavior (transposition, the per-region columns) lives in each
 * caller's file.
 */
export function editModeSharedTests(spec: {
    /** Prefixes the fixture names, so the two callers' fixtures stay distinguishable. */
    name: string
    page: string
    /** The table the edit tree lives on, which the staging controls are looked up inside. */
    scope: string
    /** The Edit button's text, which names what that table is editing. */
    editButtonLabel: string
    /**
     * Names the expanded plot should carry a series for. Empty for a table with a single
     * column, where the plot has nothing to distinguish.
     */
    expectedPlotSeries: string[]
    /** A page whose regions have congressional representatives, and the ones to expect. */
    congressional: { page: string, expectedRegions: string[] }
}): void {
    const table = Selector(spec.scope)
    const stagingControls = table.find('[data-test-id=staging_controls]')
    const mainCategory = categoryCheckbox('main')

    urbanstatsFixture(`${spec.name} edit mode shared`, spec.page)

    test('edit mode toggles the checkbox tree on the table', async (t) => {
        // Normal view: the Edit button, and no tree.
        await t.expect(editButton.innerText).eql(spec.editButtonLabel)
        await t.expect(mainCategory.exists).notOk()
        await screencap(t)

        await t.click(editButton)

        // Edit view: Done + filter, and the tree with Main checked by default.
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

        // Filtering expands the matching categories and drops the rest.
        await t.expect(interactableGroupCheckbox('generation_genx').exists).ok()
        await t.expect(mainCategory.exists).notOk()

        await t.selectText(filterBox).pressKey('delete')
        await t.expect(mainCategory.exists).ok()
    })

    test('the filter can be cleared with its x button', async (t) => {
        await t.click(editButton)
        // The button is only offered when there is something to clear.
        await t.expect(clearFilterButton.exists).notOk()

        await t.typeText(filterBox, 'gene')
        await t.expect(mainCategory.exists).notOk()

        await t.click(clearFilterButton)

        await t.expect(filterBox.value).eql('')
        await t.expect(clearFilterButton.exists).notOk()
        // The whole tree is back, not just the box emptied.
        await t.expect(mainCategory.exists).ok()
    })

    test('a stat can be expanded in edit mode', async (t) => {
        await t.click(editButton)

        const expandToggle = table.find('.expand-toggle:not([inert] *)')
        await t.expect(expandToggle.exists).ok()
        await t.click(expandToggle.nth(0))

        const histogram = table.find('.histogram-svg-panel')
        await t.expect(histogram.exists).ok()
        // Every column is plotted, not just the first.
        for (const series of spec.expectedPlotSeries) {
            await t.expect(histogram.textContent).contains(series)
        }
    })

    test('edit mode is ephemeral across reloads', async (t) => {
        await t.click(editButton)
        await t.expect(doneButton.exists).ok()

        await safeReload(t)

        // Not persisted: we come back in the normal (non-edit) view.
        await t.expect(editButton.exists).ok()
        await t.expect(doneButton.exists).notOk()
    })

    // Reaching the page via a settings link that differs from the saved settings should open
    // edit mode automatically and surface the staging controls on the table.
    urbanstatsFixture(`${spec.name} edit mode staging`, spec.page, async (t) => {
        // Save a setting first, so the link enters staging instead of silently applying.
        await t.click(Selector('input[data-test-id=use_imperial]'))
        await t.navigateTo(`${spec.page}&s=29ZqGgHgeNSXMA9`)
    })

    test('edit mode auto-opens in staging', async (t) => {
        // Auto-opened into edit mode (filter present)...
        await t.expect(filterBox.exists).ok()
        // ...with the staging box above the table, and no Done button (Discard/Apply replace it).
        await t.expect(stagingControls.exists).ok()
        await t.expect(doneButton.exists).notOk()
        // Staged-changed group checkboxes are highlighted.
        await t.expect(table.find('input[data-test-highlight=true]').exists).ok()
        await screencap(t)
    })

    test('applying staged changes also exits edit mode', async (t) => {
        await t.click(table.find('button[data-test-id=apply]'))
        await t.expect(stagingControls.exists).notOk()
        await t.expect(editButton.exists).ok()
    })

    test('discarding staged changes also exits edit mode', async (t) => {
        await t.click(table.find('button[data-test-id=discard]'))
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

    // The congressional representatives table is a metadata "extra"; it should render below
    // its row in edit mode once the stat is enabled, covering every region on the table.
    urbanstatsFixture(`${spec.name} edit mode congressional`, spec.congressional.page)

    const congressionalGroup = groupCheckbox('metadata_show_metadata_congressional_representatives')
    const congressionalWidget = table.find('[data-test-id=congressional-representatives]')

    test('congressional representatives table shows when the stat is enabled', async (t) => {
        await t.click(editButton)
        await t.typeText(filterBox, 'Congressional')
        await t.expect(congressionalGroup.exists).ok()

        // Unchecked: just the row, no table.
        await t.expect(congressionalWidget.exists).notOk()

        await t.click(congressionalGroup)
        await t.expect(congressionalWidget.exists).ok()
        for (const region of spec.congressional.expectedRegions) {
            await t.expect(congressionalWidget.textContent).contains(region)
        }
        await screencap(t)
    })
}
