import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { Selection, SelectionContext } from '../mapper/settings/SelectionContext'
import { Navigator } from '../navigation/Navigator'
import { PageTemplate } from '../page_template/template'
import { universeContext, useUniverse } from '../universe'
import { Property } from '../utils/Property'
import { TestUtils } from '../utils/TestUtils'
import { assert } from '../utils/defensive'
import { useHeaderTextClass } from '../utils/responsive'
import { displayType } from '../utils/text'
import { useUndoRedo } from '../utils/useUndoRedo'

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

export function StatisticPanel({ settings }: { settings: StatSettings }): ReactNode {
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
            // So that map settings are updated when the prop changes
            // Presumably the navigation has already happened, so just replace
            setSettingsStateNav(settings, true, { history: 'replaceState' })
            if (settings.view.edit) {
                updateCurrentState(settings)
            }
            else {
                addState(settings, selectionContext.value)
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

    const headersRef = useRef<HTMLDivElement>(null)

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
                <PageTemplate
                    screencap={generator.screencap(headersRef)}
                    csvExportCallback={generator.exportCSV}
                >
                    <div ref={headersRef} style={{ position: 'relative' }}>
                        <StatisticPanelHead
                            articleType={stat.articleType}
                            renderedOther={view.order}
                        />
                        <div className={subHeaderTextClass}>{loadedData?.renderedStatname ?? 'Table'}</div>
                        {!view.edit && (
                            <div style={{ marginLeft: 'auto', marginTop: '8px', display: 'flex', gap: '8px', width: 'fit-content' }}>
                                {colAdder && (
                                    <div style={{ flexGrow: 1, minWidth: '300px' }}>
                                        <AddColumnSearchBox
                                            editUSS={editUSS}
                                            setEditUSS={(newUSS) => {
                                                void navigator.navigate({
                                                    kind: 'statistic',
                                                    article_type: editGeographyKind,
                                                    uss: unparse(newUSS, { simplify: false }),
                                                    start: props.start,
                                                    amount: props.amount,
                                                    order: props.order,
                                                    highlight: props.highlight,
                                                    universe: editUniverse,
                                                    sort_column: props.sortColumn,
                                                    edit: isEditMode,
                                                }, {
                                                    history: 'push',
                                                    scroll: { kind: 'none' },
                                                })
                                            }}
                                            typeEnvironment={typeEnvironment}
                                            colAdder={colAdder}
                                        />
                                    </div>
                                )}
                                <button
                                    data-test-id="edit"
                                    onClick={handleEditSettingsClick}
                                    style={{
                                        padding: '0.25em 0.5em',
                                        backgroundColor: colors.unselectedButton,
                                        color: colors.textMain,
                                        border: `1px solid ${colors.textMain}`,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                    }}
                                >
                                    Filter / Edit Table
                                </button>
                                <ConvertToMapButton
                                    editUSS={editUSS}
                                    editGeographyKind={editGeographyKind}
                                    editUniverse={editUniverse}
                                />
                            </div>
                        )}
                    </div>
                    <div style={{ marginBlockEnd: '16px' }}></div>
                    {preamble}
                    {content}
                </PageTemplate>
            </universeContext.Provider>
            {settingsState.view.edit && undoRedo.ui}
        </SelectionContext.Provider>
    )
}

function StatisticPanelHead(props: { articleType: string, renderedOther: string }): ReactNode {
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')
    const headerTextClass = useHeaderTextClass()
    return (
        <div className={headerTextClass}>
            {displayType(currentUniverse, props.articleType)}
        </div>
    )
}
