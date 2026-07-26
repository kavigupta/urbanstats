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

export function categoryExpandButton(category: string, expanded: boolean): Selector {
    return Selector(`.stats_table [aria-label="${expanded ? 'Expand' : 'Collapse'} ${category} category"]`)
}

/** Categories are collapsed by default, and the toggle animates. */
export async function setCategoryExpanded(t: TestController, category: string, expanded: boolean): Promise<void> {
    await t.click(categoryExpandButton(category, expanded))
    await t.wait(collapseAnimationMs)
}
