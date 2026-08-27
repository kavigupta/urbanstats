import React, { ReactNode, useCallback, useContext, useMemo, useRef } from 'react'

import { CountsByUT } from '../components/countsByArticleType'
import { generateStatisticsPanelCSVData } from '../components/csv-export'
import { useReaderSettings } from '../components/display-stats'
import { createScreenshot } from '../components/screenshot'
import { MaybeSplitLayout } from '../components/split-layout'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { MapSettings } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { RelativeLoader } from '../navigation/loading'
import { PageTemplate } from '../page_template/template'
import { DisplayResults } from '../urban-stats-script/Editor'
import { tableType } from '../urban-stats-script/constants/table'
import { EditorError } from '../urban-stats-script/editor-utils'
import { TypeEnvironment } from '../urban-stats-script/types-values'
import { AssignmentsResult } from '../urban-stats-script/workerManager'
import { reifyReact, reifyString } from '../utils/human-readable-name'
import { tableToMapper } from '../utils/page-conversion'
import { sanitize } from '../utils/paths'
import { useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'
import { displayType } from '../utils/text'
import { base64Gzip } from '../utils/urlParamShort'

import { AddColumnSearchBox } from './AddColumnSearchBox'
import { CrossSourceBorderDisclaimer } from './CrossSourceBorderDisclaimer'
import { StatisticPanelTable } from './StatisticPanelTable'
import { StatData, Statistic, StatSetter, View } from './types'
import { mapUSSFromStat, variable } from './utils'

export function StatisticPanelPage({ view, stat, data, set, loading, counts, errors, assignments, typeEnvironment }: {
    view: View
    stat: Statistic
    data: StatData | undefined
    set: StatSetter
    loading: boolean
    counts: CountsByUT
    errors: EditorError[]
    assignments: AssignmentsResult
    typeEnvironment: TypeEnvironment
}): ReactNode {
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const footerRef = useRef<HTMLDivElement>(null)

    const subHeaderTextClass = useSubHeaderTextClass()

    const readerSettings = useReaderSettings()

    const subHeaderText = useMemo(() => data?.renderedStatname ?? (stat.type === 'simple' ? variable(stat.statName).humanReadableName : '\u00A0'), [data, stat])

    const mobileLayout = useMobileLayout()
    const splitLayout = view.edit && !mobileLayout

    const preamble = view.edit
        ? (
                <EditPreamble
                    stat={stat}
                    view={view}
                    set={set}
                    typeEnvironment={typeEnvironment}
                    counts={counts}
                    errors={errors}
                    assignments={assignments}
                    split={splitLayout}
                />
            )
        : undefined

    const headers = (
        <>
            {/* Only the titles are inside headersRef; the controls below it are interactive, and
                would otherwise end up in the screenshot. */}
            <div ref={headersRef} style={{ position: 'relative' }}>
                <StatisticPanelHead articleType={stat.articleType} universe={stat.universe} />
                <div className={subHeaderTextClass}>{reifyReact(subHeaderText, readerSettings)}</div>
            </div>
            {view.edit
                ? splitLayout && <EditHeader stat={stat} view={view} set={set} typeEnvironment={typeEnvironment} inline={true} />
                : <ViewHeader stat={stat} view={view} set={set} typeEnvironment={typeEnvironment} />}
            <CrossSourceBorderDisclaimer stat={stat} view={view} counts={counts} isFootnote={false} />
            <div style={{ marginBlockEnd: '16px' }}></div>
        </>
    )

    const results = (
        <>
            {!view.edit && <DisplayResults results={errors.filter(error => error.kind === 'error')} editor={false} />}
            {data
                ? <StatisticPanelTable view={view} stat={stat} data={data} set={set} tableRef={tableRef} loading={loading} typeEnvironment={typeEnvironment} />
                : (
                        <div style={{ position: 'relative', width: '100%', height: '200px' }}>
                            <RelativeLoader loading={loading} />
                        </div>
                    )}
            <div ref={footerRef}>
                <CrossSourceBorderDisclaimer stat={stat} view={view} counts={counts} isFootnote={true} />
            </div>
        </>
    )

    return (
        <PageTemplate
            showFooter={!splitLayout}
            screencap={data && ((...args) => createScreenshot(() => ({
                path: `${sanitize(reifyString(data.renderedStatname, readerSettings))}.png`,
                overallWidth: tableRef.current!.offsetWidth * 2,
                elementsToRender: [
                    headersRef.current!,
                    tableRef.current!,
                    ...(footerRef.current && footerRef.current.childElementCount > 0 ? [footerRef.current] : []),
                ],
            }), ...args))}
            csvExportCallback={data && (() => ({
                csvData: generateStatisticsPanelCSVData(data.articleNames, data.table, data.hideOrdinalsPercentiles, readerSettings),
                csvFilename: `${sanitize(reifyString(data.renderedStatname, readerSettings))}.csv`,
            }))}
        >
            {!splitLayout && headers}
            {view.edit
                ? (
                        <MaybeSplitLayout
                            error={errors.some(error => error.kind === 'error')}
                            left={preamble}
                            right={splitLayout
                                ? (
                                        <>
                                            {headers}
                                            {results}
                                        </>
                                    )
                                : results}
                            rightStyle={{ justifyContent: 'flex-start', overflowY: 'auto' }}
                        />
                    )
                : results}
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

function ConvertToMapButton({ stat, flexWidth, typeEnvironment }: { stat: Statistic, flexWidth?: string, typeEnvironment: TypeEnvironment }): ReactNode {
    const navContext = useContext(Navigator.Context)

    const mapperExpression = useMemo(
        () => tableToMapper(mapUSSFromStat(stat), typeEnvironment),
        [stat, typeEnvironment],
    )
    const handleConvertToMap = useCallback(async (): Promise<void> => {
        if (!mapperExpression) return
        const settingsJson = JSON.stringify({
            geographyKind: stat.articleType,
            universe: stat.universe,
            script: {
                uss: mapperExpression,
            },
        })
        const encodedSettings = await base64Gzip(settingsJson)
        await navContext.navigate({
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
            onClick={() => { void handleConvertToMap() }}
            style={{
                flex: flexWidth ? `0 0 ${flexWidth}` : undefined,
                padding: '0.25em 0.5em',
                fontSize: '12px',
            }}
        >
            Convert to Map
        </button>
    )
}

function ViewHeader({ stat, set, typeEnvironment, view }: { stat: Statistic, set: StatSetter, typeEnvironment: TypeEnvironment, view: View }): ReactNode {
    return (
        <div style={{ marginLeft: 'auto', marginTop: '8px', display: 'flex', gap: '8px', width: 'fit-content' }}>
            <AddColumnSearchBox stat={stat} set={set} typeEnvironment={typeEnvironment} />
            <button
                data-test-id="edit"
                onClick={() => { set({ view: { ...view, edit: true } }, { push: true, undoable: false }) }}
                style={{
                    padding: '0.25em 0.5em',
                    fontSize: '12px',
                }}
            >
                Filter / Edit Table
            </button>
            <ConvertToMapButton stat={stat} typeEnvironment={typeEnvironment} />
        </div>
    )
}

function EditHeader({ stat, set, typeEnvironment, view, inline }: { stat: Statistic, set: StatSetter, typeEnvironment: TypeEnvironment, view: View, inline: boolean }): ReactNode {
    const hasConvertButton = useMemo(
        () => tableToMapper(mapUSSFromStat(stat), typeEnvironment) !== undefined,
        [stat, typeEnvironment],
    )

    return (
        <div style={inline
            ? { marginLeft: 'auto', marginTop: '8px', display: 'flex', gap: '8px', width: 'fit-content' }
            : { display: 'flex', gap: '0.5em', width: '100%' }}
        >
            <button
                data-test-id="view"
                onClick={() => { set({ view: { ...view, edit: false } }, { push: true, undoable: false }) }}
                style={{
                    flex: inline ? undefined : (hasConvertButton ? '0 0 85%' : '1 1 100%'),
                    padding: inline ? '0.25em 2em' : '0.5em 1em',
                    fontSize: inline ? '12px' : '14px',
                }}
            >
                View
            </button>
            <ConvertToMapButton stat={stat} flexWidth={inline ? undefined : '15%'} typeEnvironment={typeEnvironment} />
        </div>
    )
}

function EditPreamble({ stat, set, errors, counts, typeEnvironment, view, assignments, split }: {
    stat: Statistic
    set: StatSetter
    errors: EditorError[]
    counts: CountsByUT
    typeEnvironment: TypeEnvironment
    view: View
    assignments: AssignmentsResult
    split: boolean
}): ReactNode {
    const mapSettings = useMemo((): MapSettings => ({
        universe: stat.universe,
        geographyKind: stat.articleType as MapSettings['geographyKind'],
        script: { uss: mapUSSFromStat(stat) },
    }), [stat])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em', padding: split ? undefined : '1em' }}>
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
                assignments={assignments}
            />
            {!split && <EditHeader stat={stat} view={view} set={set} typeEnvironment={typeEnvironment} inline={false} />}
        </div>
    )
}
