import React, { ReactNode, useCallback, useEffect, useMemo } from 'react'

import { articleTypes, CountsByUT } from '../../components/countsByArticleType'
import universes_ordered from '../../data/universes_ordered'
import { EditorError, useUndoRedo } from '../../urban-stats-script/editor-utils'
import { Property } from '../../utils/Property'
import { DataListSelector } from '../DataListSelector'
import { defaultTypeEnvironment } from '../context'

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

    useEffect(() => {
        if (!articleTypes(counts, mapSettings.universe).includes(mapSettings.geographyKind)) {
            const newGeoKind = articleTypes(counts, mapSettings.universe)[0] as MapSettings['geographyKind']
            setMapSettings(s => ({
                ...s,
                geographyKind: newGeoKind,
            }))
        }
    }, [mapSettings.universe, counts, mapSettings.geographyKind, setMapSettings])

    return (
        <SelectionContext.Provider value={selectionContext}>
            <DataListSelector
                overallName="Universe:"
                names={universes_ordered}
                initialValue={mapSettings.universe}
                onChange={
                    (name) => {
                        setMapSettings(s => ({
                            ...s,
                            universe: name,
                        }))
                    }
                }
                noNeutral
            />
            <DataListSelector
                overallName="Geography Kind:"
                names={articleTypes(counts, mapSettings.universe)}
                initialValue={mapSettings.geographyKind}
                onChange={
                    (name) => {
                        setMapSettings(s => ({
                            ...s,
                            geographyKind: name as MapSettings['geographyKind'],
                        }))
                    }
                }
                noNeutral
            />
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
