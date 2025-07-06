import React, { ReactNode, useCallback } from 'react'

import valid_geographies from '../../data/mapper/used_geographies'
import statistic_variables_info from '../../data/statistic_variables_info'
import { defaultConstants } from '../../urban-stats-script/constants/constants'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { USSDocumentedType } from '../../urban-stats-script/types-values'
import { DataListSelector } from '../DataListSelector'

import { TopLevelEditor } from './TopLevelEditor'
import { MapSettings, MapperScriptSettings } from './utils'

export const defaultTypeEnvironment = ((): Map<string, USSDocumentedType> => {
    const te = new Map<string, USSDocumentedType>()

    for (const [key, value] of defaultConstants) {
        te.set(key, value)
    }

    te.set('geo', {
        type: { type: 'vector', elementType: { type: 'string' } },
        documentation: { humanReadableName: 'Geography Name' },
    })

    for (const variableInfo of statistic_variables_info.variableNames) {
        te.set(variableInfo.varName, {
            type: { type: 'vector', elementType: { type: 'number' } },
            documentation: { humanReadableName: variableInfo.humanReadableName },
        })
    }
    for (const [name, { humanReadableName }] of statistic_variables_info.multiSourceVariables) {
        te.set(name, {
            type: { type: 'vector', elementType: { type: 'number' } },
            documentation: { humanReadableName },
        })
    }

    return te
})()

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
