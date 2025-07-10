import React, { ReactNode, useCallback } from 'react'

import valid_geographies from '../../data/mapper/used_geographies'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { DataListSelector } from '../DataListSelector'
import { defaultTypeEnvironment } from '../context'

import { TopLevelEditor } from './TopLevelEditor'
import { MapSettings, MapperScriptSettings } from './utils'

export function MapperSettings({ mapSettings, setMapSettings, getScript, errors }: {
    mapSettings: MapSettings
    setMapSettings: (setter: (existing: MapSettings) => MapSettings) => void
    getScript: () => MapperScriptSettings
    errors: EditorError[]
}): ReactNode {
    const setUss = useCallback((uss: MapperScriptSettings['uss']) => {
        setMapSettings(s => ({
            ...s,
            script: { uss },
        }))
    }, [setMapSettings])

    return (
        <div>
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
                uss={getScript().uss}
                setUss={setUss}
                typeEnvironment={defaultTypeEnvironment}
                errors={errors}
            />
        </div>
    )
}
