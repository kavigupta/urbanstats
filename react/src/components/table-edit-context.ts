import { createContext, useContext } from 'react'

/**
 * Shared state for the article table's "edit mode", in which the statistic
 * category/group checkbox tree is replicated directly on the table.
 *
 * Whether edit mode is on is the `edit_mode` setting — read it with
 * `useSetting('edit_mode')`. This context only carries the transient filter text
 * and, by its presence, signals that the current page supports editing (only the
 * single-article page provides it). Where it is absent, the table renders
 * normally and the top-left header shows no Edit button.
 */
export interface EditModeState {
    filter: string
    setFilter: (filter: string) => void
}

// eslint-disable-next-line no-restricted-syntax -- Context declaration
export const EditModeContext = createContext<EditModeState | undefined>(undefined)

export function useEditMode(): EditModeState | undefined {
    return useContext(EditModeContext)
}
