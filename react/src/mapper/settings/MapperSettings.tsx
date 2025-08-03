import React, { ReactNode, useMemo } from 'react'

import valid_geographies from '../../data/mapper/used_geographies'
import universes_ordered from '../../data/universes_ordered'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { Property } from '../../utils/Property'
import { DataListSelector } from '../DataListSelector'
import { defaultTypeEnvironment } from '../context'

import { Selection, SelectionContext } from './SelectionContext'
import { TopLevelEditor } from './TopLevelEditor'
import { MapSettings } from './utils'

export function MapperSettings({ mapSettings, setMapSettings, errors }: {
    mapSettings: MapSettings
    setMapSettings: (setter: (existing: MapSettings) => MapSettings) => void
    errors: EditorError[]
}): ReactNode {
    const selectionContext = useMemo(() => new Property<Selection | undefined>(undefined), [])

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
            />
            <DataListSelector
                overallName="Geography Kind:"
                names={valid_geographies}
                initialValue={mapSettings.geographyKind}
                onChange={
                    (name) => {
                        setMapSettings(s => ({
                            ...s,
                            geographyKind: name,
                        }))
                    }
                }
            />
            <TopLevelEditor
                uss={mapSettings.script.uss}
                setUss={(uss) => {
                    setMapSettings(s => ({
                        ...s,
                        script: { uss },
                    }))
                }}
                typeEnvironment={defaultTypeEnvironment(mapSettings.universe)}
                errors={errors}
            />
        </SelectionContext.Provider>
    )
}
