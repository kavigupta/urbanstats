import React, { ReactNode, useCallback, useEffect, useMemo } from 'react'

import { articleTypes, CountsByUT } from '../../components/countsByArticleType'
import universes_ordered from '../../data/universes_ordered'
import { EditorError, useUndoRedo } from '../../urban-stats-script/editor-utils'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { Property } from '../../utils/Property'
import { TestUtils } from '../../utils/TestUtils'
import { settingNameStyle } from '../style'

import { BetterSelector } from './BetterSelector'
import { Selection, SelectionContext } from './SelectionContext'
import { TopLevelEditor } from './TopLevelEditor'
import { MapSettings } from './utils'

export function MapperSettings({ mapSettings, setMapSettings, errors, counts, typeEnvironment }: {
    mapSettings: MapSettings
    setMapSettings: (s: MapSettings) => void
    errors: EditorError[]
    counts: CountsByUT
    typeEnvironment: TypeEnvironment
}): ReactNode {
    const uss = mapSettings.script.uss

    const selectionContext = useMemo(() => new Property<Selection | undefined>(undefined), [])

    const { addState, updateCurrentSelection, ui: undoRedoUi } = useUndoRedo(
        mapSettings,
        selectionContext.value,
        setMapSettings,
        (selection) => {
            selectionContext.value = selection
        },
        {
            undoChunking: TestUtils.shared.isTesting ? 2000 : 1000,
        },
    )

    // Update current selection when it changes
    useEffect(() => {
        const observer = (): void => {
            updateCurrentSelection(selectionContext.value)
        }

        selectionContext.observers.add(observer)
        return () => { selectionContext.observers.delete(observer) }
    }, [selectionContext, updateCurrentSelection])

    const renderString = useCallback((universe: string | undefined) => ({ text: universe ?? '' }), [])

    const universes = useMemo(() => [undefined, ...universes_ordered], [])

    const geographyKinds = useMemo(() =>
        mapSettings.universe === undefined ? undefined : [undefined, ...articleTypes(counts, mapSettings.universe)] as Exclude<MapSettings['geographyKind'], undefined>[],
    [mapSettings.universe, counts])

    const changeSettingsWithUndo = (newSettings: MapSettings): void => {
        setMapSettings(newSettings)
        addState(newSettings, selectionContext.value)
    }

    return (
        <SelectionContext.Provider value={selectionContext}>
            <div style={settingNameStyle}>
                Universe
            </div>
            <BetterSelector
                possibleValues={universes}
                value={mapSettings.universe}
                renderValue={renderString}
                onChange={
                    (newUniverse) => {
                        changeSettingsWithUndo({
                            ...mapSettings,
                            universe: newUniverse,
                            geographyKind: newUniverse === undefined || mapSettings.geographyKind === undefined
                                ? mapSettings.geographyKind
                                : articleTypes(counts, newUniverse).includes(mapSettings.geographyKind)
                                    ? mapSettings.geographyKind
                                    : undefined,
                        })
                    }
                }
            />
            {geographyKinds && (
                <>
                    <div style={settingNameStyle}>
                        Geography Kind
                    </div>
                    <BetterSelector
                        possibleValues={geographyKinds}
                        value={mapSettings.geographyKind}
                        renderValue={renderString}
                        onChange={
                            (newGeographyKind) => {
                                changeSettingsWithUndo({
                                    ...mapSettings,
                                    geographyKind: newGeographyKind,
                                })
                            }
                        }
                    />
                </>
            )}
            <TopLevelEditor
                uss={uss}
                setUss={(newUss) => {
                    changeSettingsWithUndo({
                        ...mapSettings,
                        script: { uss: newUss },
                    })
                }}
                typeEnvironment={typeEnvironment}
                errors={errors}
            />
            {undoRedoUi}
        </SelectionContext.Provider>
    )
}
