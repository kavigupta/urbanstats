import { createContext, useContext } from 'react'

/**
 * Shared state for the article table's "edit mode", in which the statistic
 * category/group checkbox tree is replicated directly on the table.
 *
 * The context is only provided on pages that support editing (currently the
 * single-article page). Where it is absent, the table renders normally and the
 * top-left header shows no Edit button.
 */
export interface EditModeState {
    editMode: boolean
    setEditMode: (editMode: boolean) => void
    filter: string
    setFilter: (filter: string) => void
}

// eslint-disable-next-line no-restricted-syntax -- Context declaration
export const EditModeContext = createContext<EditModeState | undefined>(undefined)

export function useEditMode(): EditModeState | undefined {
    return useContext(EditModeContext)
}
