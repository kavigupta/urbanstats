import React, { ReactNode, useCallback, useMemo } from 'react'

import valid_geographies from '../../data/mapper/used_geographies'
import statistic_variables_info from '../../data/statistic_variables_info'
import { defaultConstants } from '../../urban-stats-script/constants/constants'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { USSDocumentedType } from '../../urban-stats-script/types-values'
import { DataListSelector } from '../DataListSelector'

import { TopLevelEditor } from './TopLevelEditor'
import { MapSettings, MapperScriptSettings } from './utils'

export function MapperSettings({ mapSettings, setMapSettings, getScript, errors }: {
    mapSettings: MapSettings
    setMapSettings: (setter: (existing: MapSettings) => MapSettings) => void
    getScript: () => MapperScriptSettings
    errors: EditorError[]
}): ReactNode {
    const typeEnvironment = useMemo(() => {
        const allVariableNames = [
            ...statistic_variables_info.variableNames,
            ...statistic_variables_info.multiSourceVariables.map(([name]) => name),
            'geo',
        ]

        const te = new Map<string, USSDocumentedType>()

        for (const [key, value] of defaultConstants) {
            te.set(key, value)
        }

        for (const varName of allVariableNames) {
            te.set(varName, {
                type: { type: 'vector', elementType: { type: varName === 'geo' ? 'string' : 'number' } },
                documentation: { humanReadableName: varName },
            })
        }

        return te
    }, [])

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
                typeEnvironment={typeEnvironment}
                errors={errors}
            />
        </div>
    )
}
