import { Selector } from 'testcafe'

/**
 * Selectors and helpers for the tables' edit mode -- the statistic category/group checkbox
 * tree -- shared by the article and comparison test files.
 */

export const editButton = Selector('[data-test-id=edit-mode-edit]')
export const doneButton = Selector('[data-test-id=edit-mode-done]')
export const filterBox = Selector('[data-test-id=edit-mode-filter]')

/** The category collapse/expand is a grid-template-rows transition. */
export const collapseAnimationMs = 400

/** Edit mode is ephemeral, so it has to be reopened after any reload or navigation. */
export async function enterEditMode(t: TestController): Promise<void> {
    // Neither is present until the table renders, and `exists` doesn't wait, so a check
    // straight after a navigation would otherwise read the loading page and skip the click.
    await t.expect(Selector('[data-test-id=edit-mode-edit], [data-test-id=edit-mode-filter]').exists).ok()
    if (await editButton.exists) {
        await t.click(editButton)
    }
    await t.expect(filterBox.exists).ok()
}

export async function exitEditMode(t: TestController): Promise<void> {
    await t.click(doneButton)
    await t.expect(editButton.exists).ok()
}

export async function withEditMode(t: TestController, block: () => Promise<void>): Promise<void> {
    await enterEditMode(t)
    await block()
    await exitEditMode(t)
}

/**
 * The `data-test-id` prefix each kind of edit-tree checkbox carries. Sources use a space
 * because their id embeds the category and source names.
 */
export const editCheckboxPrefixes = { category: 'edit_category_', group: 'edit_group_', year: 'edit_year_', source: 'edit_source ' } as const

/**
 * A checkbox with its `indeterminate` state readable. It's a DOM property rather than an
 * attribute, so TestCafe only sees it via addCustomDOMProperties, which isn't typed.
 */
export type CheckboxSelector = Selector & { indeterminate: Promise<boolean> }

function checkboxByTestId(testId: string, extraCss = ''): CheckboxSelector {
    return Selector(`input[data-test-id="${testId}"]${extraCss}`)
        .addCustomDOMProperties({ indeterminate: el => (el as HTMLInputElement).indeterminate }) as CheckboxSelector
}

/** A category's checkbox, which is reachable whether or not the category is expanded. */
export function categoryCheckbox(categoryId: string): CheckboxSelector {
    return checkboxByTestId(`${editCheckboxPrefixes.category}${categoryId}`)
}

/**
 * A group's checkbox. Groups live inside their category's collapsible section, so this is
 * only interactable once the category is expanded -- see `setCategoryExpanded`.
 */
export function groupCheckbox(groupId: string): CheckboxSelector {
    return checkboxByTestId(`${editCheckboxPrefixes.group}${groupId}`)
}

/** As `groupCheckbox`, but only matching while the group's category is actually expanded. */
export function interactableGroupCheckbox(groupId: string): CheckboxSelector {
    return checkboxByTestId(`${editCheckboxPrefixes.group}${groupId}`, ':not([inert] *)')
}

export function yearCheckbox(year: number): CheckboxSelector {
    return checkboxByTestId(`${editCheckboxPrefixes.year}${year}`)
}

export function sourceCheckbox(category: string, name: string): CheckboxSelector {
    return checkboxByTestId(`${editCheckboxPrefixes.source}${category} ${name}`)
}

/**
 * A checkbox of the table's edit mode, by the text of the row it sits on: a statistic
 * category, a year, a data source, or a group that carries its own checkbox. Rows that
 * point at another row's checkbox with `for` are excluded, since a group's statistics
 * repeat text (a year, a source) that also names a checkbox of its own further up.
 */
export function editCheckbox(txt: string): Selector {
    return Selector('label:not([for]):not([inert] *)')
        .filter(node => (node as HTMLElement).innerText === txt, { txt })
        .find('input')
}

/** Scopes the edit tree's selectors to the table it's on, rather than the rest of the page. */
export const articleTableScope = '.stats_table'
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
