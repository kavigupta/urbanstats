import React, { ReactNode, useCallback, useMemo } from 'react'

import { articleTypes, CountsByUT } from '../../components/countsByArticleType'
import universes_ordered from '../../data/universes_ordered'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { settingNameStyle } from '../style'

import { BetterSelector } from './BetterSelector'
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

    const renderString = useCallback((universe: string | undefined) => ({ text: universe ?? '' }), [])

    const universes = useMemo(() => [undefined, ...universes_ordered], [])

    const geographyKinds = useMemo(() =>
        mapSettings.universe === undefined ? undefined : [undefined, ...articleTypes(counts, mapSettings.universe)] as Exclude<MapSettings['geographyKind'], undefined>[],
    [mapSettings.universe, counts])

    return (
        <>
            <div style={settingNameStyle}>
                Universe
            </div>
            <BetterSelector
                possibleValues={universes}
                value={mapSettings.universe}
                renderValue={renderString}
                onChange={
                    (newUniverse) => {
                        setMapSettings({
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
                                setMapSettings({
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
                    setMapSettings({
                        ...mapSettings,
                        script: { uss: newUss },
                    })
                }}
                typeEnvironment={typeEnvironment}
                errors={errors}
            />
        </>
    )
}
