import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { Selection, SelectionContext } from '../mapper/settings/SelectionContext'
import { Navigator } from '../navigation/Navigator'
import { Property } from '../utils/Property'
import { TestUtils } from '../utils/TestUtils'
import { useUndoRedo } from '../utils/useUndoRedo'

import { StatSettings, ActionOptions } from './types'
import { useStatGenerator } from './useStatGenerator'
import { pageDescriptor } from './utils'

export function StatisticPanel({ settings }: { settings: StatSettings }): ReactNode {
    const navContext = useContext(Navigator.Context)

    const [settingsState, setSettingsState] = useState(settings)

    const selectionContext = useMemo(() => new Property<Selection | undefined>(undefined), [])

    const setSettingsStateNav = useCallback((newSettings: StatSettings, actionOptions: ActionOptions) => {
        setSettingsState(newSettings)
        navContext.unsafeUpdateCurrentDescriptor(pageDescriptor(newSettings), actionOptions)
    }, [navContext])

    const undoRedo = useUndoRedo(
        settingsState,
        selectionContext.value,
        setSettingsState,
        (selection) => {
            selectionContext.value = selection
        },
        {
            undoChunking: TestUtils.shared.isTesting ? 2000 : 1000,
        },
    )

    const { updateCurrentSelection, addState, updateCurrentState } = undoRedo

    const setSettingsStateWrapper = useCallback((newSettings: StatSettings, actionOptions: ActionOptions): void => {
        setSettingsStateNav(newSettings, actionOptions)
        if (actionOptions.undoable === false) {
            updateCurrentState(newSettings)
        }
        else {
            addState(newSettings, selectionContext.value)
        }
    }, [selectionContext, addState, updateCurrentState, setSettingsStateNav])

    const firstEffect = useRef(true)

    useEffect(() => {
        if (firstEffect.current) {
            // Otherwise we add an undo state immediately
            firstEffect.current = false
        }
        else {
            // So that map settings are updated when the prop changes
            // Presumably the navigation has already happened, so just replace
            setSettingsStateWrapper(settings, { history: 'replaceState' })
        }
    }, [settings, setSettingsStateWrapper])

    // Update current selection when it changes
    useEffect(() => {
        const observer = (): void => {
            updateCurrentSelection(selectionContext.value)
        }

        selectionContext.observers.add(observer)
        return () => { selectionContext.observers.delete(observer) }
    }, [selectionContext, updateCurrentSelection])

    const generator = useStatGenerator({ stat: settingsState.stat })

    return (
        <SelectionContext.Provider value={selectionContext}>

            {settingsState.view.edit && undoRedo.ui}
        </SelectionContext.Provider>
    )
}

// In view mode, set function appends to history

// In edit mode, set function replaces history
