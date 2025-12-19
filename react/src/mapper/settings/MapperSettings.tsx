import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import { articleTypes, CountsByUT } from '../../components/countsByArticleType'
import universes_ordered from '../../data/universes_ordered'
import { Navigator } from '../../navigation/Navigator'
import { Universe, useUniverse } from '../../universe'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { TypeEnvironment, USSType } from '../../urban-stats-script/types-values'
import { settingNameStyle } from '../style'

import { BetterSelector } from './BetterSelector'
import { ActionOptions } from './EditMapperPanel'
import { TopLevelEditor } from './TopLevelEditor'
import { MapSettings } from './utils'

export function MapperSettings({
    mapSettings,
    setMapSettings,
    errors,
    counts,
    typeEnvironment,
    targetOutputTypes,
}: {
    mapSettings: MapSettings
    setMapSettings: (s: MapSettings, o: ActionOptions) => void
    errors: EditorError[]
    counts: CountsByUT
    typeEnvironment: TypeEnvironment
    targetOutputTypes: USSType[]
}): ReactNode {
    const navContext = useContext(Navigator.Context)
    const urlUniverse = useUniverse()
    const lastUrlUniverse = useRef<string | undefined>(undefined)
    const lastSettingsUniverse = useRef<string | undefined>(mapSettings.universe)

    const uss = mapSettings.script.uss

    const renderString = useCallback((universe: string | undefined) => ({ text: universe ?? '' }), [])

    const universes = useMemo(() => [undefined, ...universes_ordered], [])

    const geographyKinds = useMemo(() =>
        mapSettings.universe === undefined ? undefined : [undefined, ...articleTypes(counts, mapSettings.universe)] as Exclude<MapSettings['geographyKind'], undefined>[],
    [mapSettings.universe, counts])

    // Update map settings when universe changes in URL (from header selector)
    useEffect(() => {
        if (lastUrlUniverse.current === undefined || lastUrlUniverse.current !== urlUniverse) {
            lastUrlUniverse.current = urlUniverse
            if (mapSettings.universe !== urlUniverse) {
                setMapSettings({
                    ...mapSettings,
                    universe: urlUniverse as Universe,
                }, {})
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we only need mapSettings.universe here
    }, [urlUniverse, mapSettings.universe, counts, setMapSettings])

    // Update URL when universe changes in map settings
    useEffect(() => {
        if (mapSettings.universe !== undefined && mapSettings.universe !== lastSettingsUniverse.current) {
            lastSettingsUniverse.current = mapSettings.universe
            // Only update URL if different
            if (urlUniverse !== mapSettings.universe) {
                navContext.setUniverse(mapSettings.universe)
            }
        }
    }, [mapSettings.universe, urlUniverse, navContext])

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
                        }, {})
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
                                }, {})
                            }
                        }
                    />
                </>
            )}
            <TopLevelEditor
                uss={uss}
                setUss={(newUss, options) => {
                    setMapSettings({
                        ...mapSettings,
                        script: { uss: newUss },
                    }, options)
                }}
                typeEnvironment={typeEnvironment}
                errors={errors}
                targetOutputTypes={targetOutputTypes}
            />
        </>
    )
}
