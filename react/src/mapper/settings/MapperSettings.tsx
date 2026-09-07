import React, { ReactNode, useCallback, useMemo } from 'react'

import { articleTypes, CountsByUT } from '../../components/countsByArticleType'
import valid_geographies from '../../data/mapper/used_geographies'
import universes_ordered from '../../data/universes_ordered'
import { humanReadableUniverse, Universe } from '../../universe'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { TypeEnvironment, USSType } from '../../urban-stats-script/types-values'
import { AssignmentsResult, GeographySelection } from '../../urban-stats-script/workerManager'
import { settingNameStyle } from '../style'

import { BetterSelector } from './BetterSelector'
import { ActionOptions } from './EditMapperPanel'
import { TopLevelEditor } from './TopLevelEditor'
import { defaultGeography, MapSettings } from './utils'

type GeographyKind = typeof valid_geographies[number]

const renderUniverse = (universe: Universe | undefined): { text: string } => ({ text: universe === undefined ? '' : humanReadableUniverse(universe) })
const renderGeographyKind = (geographyKind: string | undefined): { text: string } => ({ text: geographyKind ?? '' })

export function MapperSettings({
    mapSettings,
    setMapSettings,
    errors,
    counts,
    typeEnvironment,
    targetOutputTypes,
    assignments,
    singleGeography = false,
}: {
    mapSettings: MapSettings
    setMapSettings: (s: MapSettings, o: ActionOptions) => void
    errors: EditorError[]
    counts: CountsByUT
    typeEnvironment: TypeEnvironment
    targetOutputTypes: USSType[]
    assignments: AssignmentsResult
    singleGeography?: boolean
}): ReactNode {
    const uss = mapSettings.script.uss

    const setGeographies = useCallback((geographies: GeographySelection[]) => {
        setMapSettings({ ...mapSettings, geographies }, {})
    }, [mapSettings, setMapSettings])

    return (
        <>
            {singleGeography
                ? <SingleGeographyEditor geography={mapSettings.geographies[0]} setGeographies={setGeographies} counts={counts} />
                : <GeographyListEditor geographies={mapSettings.geographies} setGeographies={setGeographies} counts={counts} />}
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
                assignments={assignments}
            />
        </>
    )
}

/** Blanking the universe selects no geography at all, which is how a map says it has nothing to draw. */
function SingleGeographyEditor({ geography, setGeographies, counts }: {
    geography: GeographySelection | undefined
    setGeographies: (g: GeographySelection[]) => void
    counts: CountsByUT
}): ReactNode {
    const universes = useMemo(() => [undefined, ...universes_ordered], [])

    return (
        <>
            <div style={settingNameStyle}>
                Universe
            </div>
            <BetterSelector
                possibleValues={universes}
                value={geography?.universe}
                renderValue={renderUniverse}
                onChange={(newUniverse) => {
                    setGeographies(newUniverse === undefined ? [] : [withUniverse(geography ?? defaultGeography, newUniverse, counts)])
                }}
            />
            {geography !== undefined && (
                <>
                    <div style={settingNameStyle}>
                        Geography Kind
                    </div>
                    <GeographyKindSelector
                        geography={geography}
                        counts={counts}
                        onChange={(newGeography) => { setGeographies([newGeography]) }}
                    />
                </>
            )}
        </>
    )
}

function GeographyListEditor({ geographies, setGeographies, counts }: {
    geographies: GeographySelection[]
    setGeographies: (g: GeographySelection[]) => void
    counts: CountsByUT
}): ReactNode {
    const universes = useMemo(() => universes_ordered.filter(universe => articleTypes(counts, universe).length > 0), [counts])

    const replace = (i: number, geography: GeographySelection): void => {
        setGeographies(geographies.map((existing, j) => j === i ? geography : existing))
    }

    return (
        <>
            <div style={settingNameStyle}>
                Geographies
            </div>
            {geographies.map((geography, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5em', alignItems: 'center', marginBottom: '0.5em' }}>
                    <div style={{ flex: 1 }}>
                        <BetterSelector
                            possibleValues={universes}
                            value={geography.universe}
                            renderValue={renderUniverse}
                            onChange={(newUniverse) => { replace(i, withUniverse(geography, newUniverse, counts)) }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <GeographyKindSelector
                            geography={geography}
                            counts={counts}
                            onChange={(newGeography) => { replace(i, newGeography) }}
                        />
                    </div>
                    <button
                        data-test-id="test-remove-geography-button"
                        onClick={() => { setGeographies(geographies.filter((_, j) => j !== i)) }}
                        title="Remove geography"
                    >
                        –
                    </button>
                </div>
            ))}
            <button
                data-test-id="test-add-geography-button"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => { setGeographies([...geographies, geographies[geographies.length - 1] ?? defaultGeography]) }}
            >
                + Add geography
            </button>
        </>
    )
}

function GeographyKindSelector({ geography, counts, onChange }: {
    geography: GeographySelection
    counts: CountsByUT
    onChange: (g: GeographySelection) => void
}): ReactNode {
    const geographyKinds = useMemo(() => articleTypes(counts, geography.universe) as GeographyKind[], [counts, geography.universe])

    return (
        <BetterSelector
            possibleValues={geographyKinds}
            value={geography.geographyKind}
            renderValue={renderGeographyKind}
            onChange={(newGeographyKind) => { onChange({ ...geography, geographyKind: newGeographyKind }) }}
        />
    )
}

/** Keeps the geography kind when the new universe has it, and otherwise takes whichever it does have. */
function withUniverse(geography: GeographySelection, universe: Universe, counts: CountsByUT): GeographySelection {
    const available = articleTypes(counts, universe) as GeographyKind[]
    return {
        universe,
        geographyKind: available.includes(geography.geographyKind) ? geography.geographyKind : available[0] ?? geography.geographyKind,
    }
}
