import { Selector } from 'testcafe'

export const editButton = Selector('[data-test-id=edit-mode-edit]')
export const warningEditAction = Selector('[data-test-id=warning-edit-action]')
export const doneButton = Selector('[data-test-id=edit-mode-done]')
export const filterBox = Selector('[data-test-id=edit-mode-filter]')
export const clearFilterButton = Selector('[data-test-id=edit-mode-filter-clear]')

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

export async function withEditMode<T>(t: TestController, block: () => Promise<T>): Promise<T> {
    await enterEditMode(t)
    const result = await block()
    await exitEditMode(t)
    return result
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

export function categoryCheckbox(categoryId: string): CheckboxSelector {
    return checkboxByTestId(`${editCheckboxPrefixes.category}${categoryId}`)
}

/**
 * An unselected group lives inside its category's collapsible section, so it is only
 * interactable once the category is expanded -- see `interactableGroupCheckbox` and
 * `setCategoryExpanded`. Selected groups are shown whether or not their category is.
 */
export function groupCheckbox(groupId: string): CheckboxSelector {
    return checkboxByTestId(`${editCheckboxPrefixes.group}${groupId}`)
}

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
 * Rows that point at another row's checkbox with `for` are excluded, since a group's
 * statistics repeat text (a year, a source) that also names a checkbox of its own further up.
 */
export function editCheckbox(txt: string): Selector {
    return Selector('label:not([for]):not([inert] *)')
        .filter(node => (node as HTMLElement).innerText === txt, { txt })
        .find('input')
}

/**
 * Matched via the group checkbox it points at, which distinguishes these rows from the year
 * and source rows above (whose labels carry the same text). A group with a single row
 * collapses into that row, so it has none of these.
 */
export function groupMemberRow(groupId: string, name: string): Selector {
    return Selector(`label[for=edit-checkbox-${groupId}]`).withExactText(name)
}

/**
 * A group whose whole category is missing for the same reason carries the category's warning,
 * since its groups are rows apart on the tree.
 */
export function groupWarning(groupId: string): Selector {
    return groupCheckbox(groupId).parent('.for-testing-table-row').find('[data-test-id=article-warning]')
}

export const articleTableScope = '.stats_table'
export const comparisonTableScope = '[data-test-id=comparison-table]'

/**
 * Matched by the direction the toggle currently offers, so its presence also tells you which
 * state the category is in. A category with every group selected has no toggle at all, since
 * collapsing it would hide nothing.
 */
export function categoryToggleButton(categoryId: string, direction: 'Expand' | 'Collapse'): Selector {
    return Selector(`[data-category-id=${categoryId}]`).withAttribute('aria-label', new RegExp(`^${direction} `))
}

export async function setCategoryExpanded(t: TestController, categoryId: string, expanded: boolean): Promise<void> {
    await t.click(categoryToggleButton(categoryId, expanded ? 'Expand' : 'Collapse'))
    await t.wait(collapseAnimationMs)
}

/** For a category whose state the caller doesn't know, since expansion is a persisted setting. */
export async function ensureCategoryExpanded(t: TestController, categoryId: string): Promise<void> {
    if (await categoryToggleButton(categoryId, 'Expand').exists) {
        await setCategoryExpanded(t, categoryId, true)
    }
}

export async function ensureCategoryCollapsed(t: TestController, categoryId: string): Promise<void> {
    if (await categoryToggleButton(categoryId, 'Collapse').exists) {
        await setCategoryExpanded(t, categoryId, false)
    }
}
