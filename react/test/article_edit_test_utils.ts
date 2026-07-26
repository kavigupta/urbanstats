import { Selector } from 'testcafe'

/** Selectors and helpers for the article table's edit mode, shared by its test files. */

export const editButton = Selector('[data-test-id=edit-mode-edit]')
export const doneButton = Selector('[data-test-id=edit-mode-done]')
export const filterBox = Selector('[data-test-id=edit-mode-filter]')

/** The category collapse/expand is a grid-template-rows transition. */
export const collapseAnimationMs = 400

/** Edit mode is ephemeral, so it has to be reopened after any reload or navigation. */
export async function enterEditMode(t: TestController): Promise<void> {
    if (await editButton.exists) {
        await t.click(editButton)
    }
    await t.expect(filterBox.exists).ok()
}

export async function exitEditMode(t: TestController): Promise<void> {
    await t.click(doneButton)
    await t.expect(editButton.exists).ok()
}

/** Scopes the edit tree's selectors to a table, so they don't also match the sidebar's tree. */
const articleTableScope = '.stats_table'
export const comparisonTableScope = '[data-test-id=comparison-table]'

/**
 * A category's toggle in the edit tree, matched by the direction it currently offers, so
 * its presence also tells you which state the category is in.
 */
export function categoryToggleButton(categoryId: string, direction: 'Expand' | 'Collapse', scope = articleTableScope): Selector {
    return Selector(`${scope} [data-category-id=${categoryId}]`).withAttribute('aria-label', new RegExp(`^${direction} `))
}

/** Categories are collapsed by default, and the toggle animates. */
export async function setCategoryExpanded(t: TestController, categoryId: string, expanded: boolean, scope = articleTableScope): Promise<void> {
    await t.click(categoryToggleButton(categoryId, expanded ? 'Expand' : 'Collapse', scope))
    await t.wait(collapseAnimationMs)
}
