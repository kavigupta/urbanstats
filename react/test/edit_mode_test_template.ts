import { Selector } from 'testcafe'

import { doneButton, editButton, filterBox } from './article_edit_test_utils'
import { safeReload, screencap, urbanstatsFixture } from './test_utils'

/**
 * The parts of edit mode that behave the same on the article table and the comparison
 * table: that it doesn't survive a reload, that arriving via a settings link opens it with
 * the staging controls on the table, and that a metadata extra renders below its row.
 *
 * The table-specific behavior (layout, columns, transposition) lives in each caller's file.
 */
export function editModeSharedTests(spec: {
    /** Prefixes the fixture names, so the two callers' fixtures stay distinguishable. */
    name: string
    page: string
    /** The table the edit tree lives on, which the staging controls are looked up inside. */
    scope: string
    /** A page whose regions have congressional representatives, and the ones to expect. */
    congressional: { page: string, expectedRegions: string[] }
}): void {
    const table = Selector(spec.scope)
    const stagingControls = table.find('[data-test-id=staging_controls]')

    urbanstatsFixture(`${spec.name} edit mode shared`, spec.page)

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

    // The congressional representatives table is a metadata "extra"; it should render below
    // its row in edit mode once the stat is enabled, covering every region on the table.
    urbanstatsFixture(`${spec.name} edit mode congressional`, spec.congressional.page)

    const congressionalGroup = Selector('input[data-test-id=edit_group_metadata_show_metadata_congressional_representatives]')
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
