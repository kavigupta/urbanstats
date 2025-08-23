import React, { ReactNode, useCallback, useEffect, useMemo } from 'react'

import { articleTypes, CountsByUT } from '../../components/countsByArticleType'
import universes_ordered from '../../data/universes_ordered'
import { EditorError, useUndoRedo } from '../../urban-stats-script/editor-utils'
import { Property } from '../../utils/Property'
import { defaultTypeEnvironment } from '../context'
import { settingNameStyle } from '../style'

import { BetterSelector } from './BetterSelector'
import { Selection, SelectionContext } from './SelectionContext'
import { TopLevelEditor } from './TopLevelEditor'
import { MapSettings } from './utils'

export function MapperSettings({ mapSettings, setMapSettings, errors, counts }: {
    mapSettings: MapSettings
    setMapSettings: (setter: (existing: MapSettings) => MapSettings) => void
    errors: EditorError[]
    counts: CountsByUT
}): ReactNode {
    const uss = mapSettings.script.uss
    const setUss = useCallback((newUss: MapSettings['script']['uss']): void => {
        setMapSettings(s => ({
            ...s,
            script: { uss: newUss },
        }))
    }, [setMapSettings])

    const selectionContext = useMemo(() => new Property<Selection | undefined>(undefined), [])

    const { addState, updateCurrentSelection } = useUndoRedo(
        uss,
        selectionContext.value,
        setUss,
        (selection) => {
            selectionContext.value = selection
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

    const typeEnvironment = useMemo(() => defaultTypeEnvironment(mapSettings.universe), [mapSettings.universe])

    const renderString = useCallback((universe: string | undefined) => universe ?? '', [])

    const universes = useMemo(() => [undefined, ...universes_ordered], [])

    const geographyKinds = useMemo(() =>
        mapSettings.universe === undefined ? undefined : [undefined, ...articleTypes(counts, mapSettings.universe)] as Exclude<MapSettings['geographyKind'], undefined>[],
    [mapSettings.universe, counts])

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
                        setMapSettings(s => ({
                            ...s,
                            universe: newUniverse,
                            geographyKind: newUniverse === undefined || s.geographyKind === undefined
                                ? s.geographyKind
                                : articleTypes(counts, newUniverse).includes(s.geographyKind)
                                    ? s.geographyKind
                                    : undefined,
                        }))
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
                                setMapSettings(s => ({
                                    ...s,
                                    geographyKind: newGeographyKind,
                                }))
                            }
                        }
                    />
                </>
            )}
            <TopLevelEditor
                uss={uss}
                setUss={(newUss) => {
                    setUss(newUss)
                    addState(newUss, selectionContext.value)
                }}
                typeEnvironment={typeEnvironment}
                errors={errors}
            />
        </SelectionContext.Provider>
    )
}
