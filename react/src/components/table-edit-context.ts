import { createContext, useContext } from 'react'

/**
 * Shared, ephemeral state for the article table's "edit mode", in which the
 * statistic category/group checkbox tree is replicated directly on the table.
 *
 * Edit mode is deliberately not persisted (not a setting) — it resets on
 * navigation/reload. The context is only provided on pages that support editing
 * (currently the single-article page). Where it is absent, the table renders
 * normally and the top-left header shows no Edit button.
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

/**
 * What the table's top-left cell offers. Passed down as part of the cell's spec rather
 * than read from the context there, so the generic table components stay unaware of
 * edit mode; a cell given no `EditModeHeader` renders the plain header.
 */
export type EditModeHeader =
    | { open: false, onEdit: () => void }
    | {
        open: true
        filter: string
        setFilter: (filter: string) => void
        /** Unset when something else on the page already offers a way out of edit mode. */
        onDone?: () => void
    }
