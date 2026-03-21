import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { CountsByUT } from '../components/countsByArticleType'
import { Selection, SelectionContext } from '../mapper/settings/SelectionContext'
import { Navigator } from '../navigation/Navigator'
import { universeContext } from '../universe'
import { Property } from '../utils/Property'
import { TestUtils } from '../utils/TestUtils'
import { useUndoRedo } from '../utils/useUndoRedo'

import { StatisticPanelPage } from './StatisticPanelPage'
import { StatSettings, ActionOptions } from './types'
import { useStatGenerator } from './useStatGenerator'
import { pageDescriptor } from './utils'

/**
 * Undo Model:
 *
 * The statistic panel has two modes: View and Edit
 *
 * In View mode, the "undo/redo" is the browser navigation stack.
 *
 * In Edit mode, the "undo/redo" is the normal Ctrl+Z undo stack.
 *
 * When transitioning between modes, we push to the browser stack.
 */

export function StatisticPanel({ settings, counts }: { settings: StatSettings, counts: CountsByUT }): ReactNode {
    const navContext = useContext(Navigator.Context)

    const [settingsState, setSettingsState] = useState(settings)
    const [generatorSettings, setGeneratorSettings] = useState(settings)

    const selectionContext = useMemo(() => new Property<Selection | undefined>(undefined), [])

    const setSettingsStateNav = useCallback((newSettings: StatSettings, generator = true, options: Parameters<typeof navContext.unsafeUpdateCurrentDescriptor>[1] = { history: 'replaceState' }) => {
        setSettingsState(newSettings)
        if (generator) {
            setGeneratorSettings(newSettings)
        }
        navContext.unsafeUpdateCurrentDescriptor(pageDescriptor(newSettings), options)
    }, [navContext])

    const undoRedo = useUndoRedo(
        settingsState,
        selectionContext.value,
        setSettingsStateNav,
        (selection) => {
            selectionContext.value = selection
        },
        {
            undoChunking: TestUtils.shared.isTesting ? 2000 : 1000,
            onlyElement: settingsState.view.edit ? undefined : { current: null }, // Disable undo in view mode
        },
    )

    const { updateCurrentSelection, addState, updateCurrentState } = undoRedo

    const setSettingsStateWrapper = useCallback((newSettingsPartial: Partial<StatSettings>, actionOptions: ActionOptions): void => {
        const newSettings = { ...settingsState, ...newSettingsPartial }
        const push = !settingsState.view.edit || actionOptions.push
        setSettingsStateNav(newSettings, actionOptions.update ?? true, { history: push ? 'pushState' : 'replaceState' })
        if (push) {
            updateCurrentState(newSettings)
        }
        else {
            addState(newSettings, selectionContext.value)
        }
    }, [selectionContext, addState, updateCurrentState, setSettingsStateNav, settingsState])

    const firstEffect = useRef(true)

    useEffect(() => {
        if (firstEffect.current) {
            // Otherwise we add an undo state immediately
            firstEffect.current = false
        }
        else {
            // So that stat settings are updated when the prop changes
            // Presumably the navigation has already happened, so just replace
            setSettingsStateNav(settings, true, { history: 'replaceState' })
            if (settings.view.edit) {
                addState(settings, selectionContext.value)
            }
            else {
                updateCurrentState(settings)
            }
        }
    }, [settings, setSettingsStateNav, updateCurrentState, addState, selectionContext])

    // Update current selection when it changes
    useEffect(() => {
        const observer = (): void => {
            updateCurrentSelection(selectionContext.value)
        }

        selectionContext.observers.add(observer)
        return () => { selectionContext.observers.delete(observer) }
    }, [selectionContext, updateCurrentSelection])

    const { stat, view } = settingsState

    const generator = useStatGenerator({ stat: generatorSettings.stat })

    return (
        <SelectionContext.Provider value={selectionContext}>
            <universeContext.Provider value={{
                universe: stat.universe,
                universes: generator.universesFiltered,
                setUniverse(newUniverse) {
                    setSettingsStateWrapper({ stat: { ...stat, universe: newUniverse } }, {})
                },
            }}
            >
                <StatisticPanelPage
                    stat={stat}
                    view={view}
                    loading={generator.loading}
                    set={setSettingsStateWrapper}
                    errors={generator.errors}
                    counts={counts}
                    data={generator.data}
                    context={generator.context}
                />
            </universeContext.Provider>
            {settingsState.view.edit && undoRedo.ui}
        </SelectionContext.Provider>
    )
}
