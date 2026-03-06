import React, { ReactNode, useCallback, useContext, useMemo, useRef } from 'react'

import { CountsByUT } from '../components/countsByArticleType'
import { generateStatisticsPanelCSVData } from '../components/csv-export'
import { createScreenshot } from '../components/screenshot'
import { defaultTypeEnvironment } from '../mapper/context'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { MapSettings } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { DisplayResults } from '../urban-stats-script/Editor'
import { tableType } from '../urban-stats-script/constants/table'
import { EditorError } from '../urban-stats-script/editor-utils'
import { TypeEnvironment } from '../urban-stats-script/types-values'
import { tableToMapper } from '../utils/page-conversion'
import { sanitize } from '../utils/paths'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { displayType } from '../utils/text'
import { base64Gzip } from '../utils/urlParamShort'

import { AddColumnSearchBox } from './AddColumnSearchBox'
import { StatisticPanelTable } from './StatisticPanelTable'
import { StatData, Statistic, StatSetter, View } from './types'
import { mapUSSFromStat, variable } from './utils'

export function StatisticPanelPage({ view, stat, data, set, loading, counts, errors }: {
    view: View
    stat: Statistic
    data: StatData | undefined
    set: StatSetter
    loading: boolean
    counts: CountsByUT
    errors: EditorError[]
}): ReactNode {
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)

    const subHeaderTextClass = useSubHeaderTextClass()

    const typeEnvironment = useMemo(() => defaultTypeEnvironment(stat.universe), [stat.universe])

    const subHeaderText = useMemo(() => data?.renderedStatname ?? (stat.type === 'simple' ? variable(stat.statName).humanReadableName : '\u00A0'), [data, stat])

    return (
        <PageTemplate
            screencap={data && ((universe, c) => createScreenshot({
                path: `${sanitize(data.renderedStatname)}.png`,
                overallWidth: tableRef.current!.offsetWidth * 2,
                elementsToRender: [headersRef.current!, tableRef.current!],
            }, universe, c))}
            csvExportCallback={data && (() => ({
                csvData: generateStatisticsPanelCSVData(data.articleNames, data.table, data.hideOrdinalsPercentiles),
                csvFilename: `${sanitize(data.renderedStatname)}.csv`,
            }))}
        >
            <div ref={headersRef} style={{ position: 'relative' }}>
                <StatisticPanelHead articleType={stat.articleType} universe={stat.universe} />
                <div className={subHeaderTextClass}>{subHeaderText}</div>
                {!view.edit && <ViewHeader stat={stat} view={view} set={set} typeEnvironment={typeEnvironment} />}
            </div>
            <div style={{ marginBlockEnd: '16px' }}></div>
            {view.edit && <EditPreamble stat={stat} view={view} set={set} typeEnvironment={typeEnvironment} counts={counts} errors={errors} />}
            {!view.edit && <DisplayResults results={errors} editor={false} />}
            {data
                ? <StatisticPanelTable view={view} stat={stat} data={data} set={set} tableRef={tableRef} loading={loading} />
                : (
                        <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                            <RelativeLoader loading={loading} />
                        </div>
                    )}
        </PageTemplate>
    )
}

function StatisticPanelHead(props: { articleType: string, universe: string }): ReactNode {
    const headerTextClass = useHeaderTextClass()
    return (
        <div className={headerTextClass}>
            {displayType(props.universe, props.articleType)}
        </div>
    )
}

function ConvertToMapButton({ stat, flexWidth }: { stat: Statistic, flexWidth?: string }): ReactNode {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    const mapperExpression = useMemo(
        () => tableToMapper(mapUSSFromStat(stat)),
        [stat],
    )
    const handleConvertToMap = useCallback((): void => {
        if (!mapperExpression) return
        const settingsJson = JSON.stringify({
            geographyKind: stat.articleType,
            universe: stat.universe,
            script: {
                uss: mapperExpression,
            },
        })
        const encodedSettings = base64Gzip(settingsJson)
        void navContext.navigate({
            kind: 'mapper',
            settings: encodedSettings,
            view: false,
        }, {
            history: 'push',
            scroll: { kind: 'position', top: 0 },
        })
    }, [mapperExpression, navContext, stat])

    if (mapperExpression === undefined) {
        return null
    }

    return (
        <button
            data-test-id="convert-to-map"
            onClick={handleConvertToMap}
            style={{
                flex: flexWidth ? `0 0 ${flexWidth}` : undefined,
                padding: '0.25em 0.5em',
                backgroundColor: colors.unselectedButton,
                color: colors.textMain,
                border: `1px solid ${colors.textMain}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
            }}
        >
            Convert to Map
        </button>
    )
}

function ViewHeader({ stat, set, typeEnvironment, view }: { stat: Statistic, set: StatSetter, typeEnvironment: TypeEnvironment, view: View }): ReactNode {
    const colors = useColors()

    return (
        <div style={{ marginLeft: 'auto', marginTop: '8px', display: 'flex', gap: '8px', width: 'fit-content' }}>
            <AddColumnSearchBox stat={stat} set={set} typeEnvironment={typeEnvironment} />
            <button
                data-test-id="edit"
                onClick={() => { set({ view: { ...view, edit: true } }, { push: true }) }}
                style={{
                    padding: '0.25em 0.5em',
                    backgroundColor: colors.unselectedButton,
                    color: colors.textMain,
                    border: `1px solid ${colors.textMain}`,
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                }}
            >
                Filter / Edit Table
            </button>
            <ConvertToMapButton stat={stat} />
        </div>
    )
}

function EditPreamble({ stat, set, errors, counts, typeEnvironment, view }: {
    stat: Statistic
    set: StatSetter
    errors: EditorError[]
    counts: CountsByUT
    typeEnvironment: TypeEnvironment
    view: View
}): ReactNode {
    const mapSettings = useMemo((): MapSettings => ({
        universe: stat.universe,
        geographyKind: stat.articleType as MapSettings['geographyKind'],
        script: { uss: mapUSSFromStat(stat) },
    }), [stat])

    const hasConvertButton = useMemo(
        () => tableToMapper(mapUSSFromStat(stat)) !== undefined,
        [stat],
    )

    const colors = useColors()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em', padding: '1em' }}>
            <MapperSettings
                mapSettings={mapSettings}
                setMapSettings={(newMapSettings, actionOptions) => {
                    set({
                        stat: {
                            articleType: newMapSettings.geographyKind ?? stat.articleType,
                            universe: newMapSettings.universe ?? stat.universe,
                            type: 'uss',
                            uss: newMapSettings.script.uss,
                        },
                    }, actionOptions)
                }}
                errors={errors}
                counts={counts}
                typeEnvironment={typeEnvironment}
                targetOutputTypes={[tableType]}
            />
            <div style={{ display: 'flex', gap: '0.5em', width: '100%' }}>
                <button
                    data-test-id="view"
                    onClick={() => { set({ view: { ...view, edit: false } }, { push: true, undoable: false }) }}
                    style={{
                        flex: hasConvertButton ? '0 0 85%' : '1 1 100%',
                        padding: '0.5em 1em',
                        backgroundColor: colors.unselectedButton,
                        color: colors.textMain,
                        border: `1px solid ${colors.textMain}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    View
                </button>
                {hasConvertButton && (
                    <ConvertToMapButton
                        stat={stat}
                        flexWidth="15%"
                    />
                )}
            </div>
        </div>
    )
}
