import { randomBytes } from 'crypto'

import objectHash from 'object-hash'
import React, { ChangeEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import explanation_pages from '../data/explanation_page'
import validGeographies from '../data/mapper/used_geographies'
import stats from '../data/statistic_list'
import statistic_name_list from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import statistic_variables_info from '../data/statistic_variables_info'
import universes_ordered from '../data/universes_ordered'
import { loadStatisticsPage } from '../load_json'
import { defaultTypeEnvironment } from '../mapper/context'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { MapUSS, convertToMapUss, idOutput, attemptParseAsTopLevel } from '../mapper/settings/map-uss'
import { possibilities, Selection } from '../mapper/settings/parseExpr'
import { MapSettings } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { sanitize, statisticDescriptor } from '../navigation/links'
import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { StatName } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import './article.css'
import { Universe, universeContext, useUniverse } from '../universe'
import { DisplayResults } from '../urban-stats-script/Editor'
import { addColumn, UrbanStatsASTExpressionCreator } from '../urban-stats-script/add-column'
import { toStatement, UrbanStatsASTStatement, UrbanStatsASTExpression } from '../urban-stats-script/ast'
import { orderNonNan, tableType, type TableColumnWithPopulationPercentiles } from '../urban-stats-script/constants/table'
import { EditorError } from '../urban-stats-script/editor-utils'
import { emptyLocation } from '../urban-stats-script/lexer'
import { extendBlockIdKwarg, noLocation } from '../urban-stats-script/location'
import { parse, parseNoErrorAsCustomNode, unparse } from '../urban-stats-script/parser'
import { renderType, TypeEnvironment } from '../urban-stats-script/types-values'
import { executeAsync } from '../urban-stats-script/workerManager'
import { assert } from '../utils/defensive'
import { tableToMapper } from '../utils/page-conversion'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { displayType, pluralize } from '../utils/text'
import { UnitType } from '../utils/unit'
import { base64Gzip } from '../utils/urlParamShort'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { CountsByUT, forType } from './countsByArticleType'
import { CSVExportData, generateStatisticsPanelCSVData } from './csv-export'
import { StatCol, StatisticCellRenderingInfo } from './load-article'
import { PointerArrow } from './pointer-cell'
import { createScreenshot, ScreencapElements } from './screenshot'
import { computeComparisonWidthColumns, MaybeScroll } from './scrollable'
import { GenericSearchBox } from './search-generic'
import { TableContents, CellSpec, SuperHeaderSpec } from './supertable'
import { ColumnIdentifier } from './table'

export type StatisticDescriptor =
    | {
        type: 'simple-statistic'
        statname: StatName
    }
    | {
        type: 'uss-statistic'
        uss: string
    }

interface StatisticCommonProps {
    start: number
    amount: number | 'All'
    order: 'ascending' | 'descending'
    // Index of the column to use for sorting
    sortColumn: number
    articleType: string
    highlight: string | undefined
    counts: CountsByUT
    universe: Universe
    edit?: boolean
}

export interface StatisticPanelProps extends StatisticCommonProps {
    descriptor: StatisticDescriptor
    edit?: boolean
}

interface StatisticData {
    // One entry per column
    data: { value: number[], populationPercentile: number[], ordinal: number[], name: string, unit?: UnitType }[]
    articleNames: string[]
    renderedStatname: string
    statcol?: StatCol
    explanationPage?: string
    totalCountInClass: number
    totalCountOverall: number
    hideOrdinalsPercentiles: boolean
}

type StatisticDataOutcome = (
    { type: 'success' } & StatisticData & { errors: EditorError[] }
    | { type: 'error', errors: EditorError[] }
    | { type: 'loading', errors: EditorError[] }
)

function uuid(): string {
    return randomBytes(20).toString('hex')
}

function computeOrdinals(values: number[]): number[] {
    const indices: number[] = values.map((_, idx) => idx)
    indices.sort((a, b) => orderNonNan(values[b], values[a])) // descending: 1 = largest value
    const ordinals: number[] = new Array<number>(values.length)
    indices.forEach((rowIdx, rank) => {
        ordinals[rowIdx] = rank + 1
    })
    return ordinals
}

function checkArticleCount(counts: CountsByUT, universe: Universe, articleType: string): EditorError[] {
    let maxCount = 0
    for (const statcol of stats) {
        const count = forType(counts, universe, statcol, articleType)
        if (count > maxCount) {
            maxCount = count
        }
    }
    if (maxCount === 0) {
        return [{ type: 'error', value: `There are no ${pluralize(articleType)} in ${universe}. Either adjust your universe or geography kind.`, location: noLocation, kind: 'error' }]
    }
    return []
}

function useUSSStatisticPanelData(uss: UrbanStatsASTStatement, geographyKind: (typeof validGeographies)[number], universe: Universe, counts: CountsByUT): StatisticDataOutcome & { uuid: string } {
    const [loading, setLoading] = useState(true)
    const [errors, setErrors] = useState<EditorError[]>([])
    const [successData, setSuccessData] = useState<StatisticData & { uuid: string } | undefined>(undefined)

    // Use a ref to track the last executed state (uss, geographyKind, universe)
    const lastState = useRef<string | undefined>(undefined)

    useEffect(() => {
        const state = objectHash([uss, geographyKind, universe])
        if (state === lastState.current) {
            // state unchanged, no need to re-execute
            return
        }
        lastState.current = state

        // Check if there are no geographic entities using counts before executing
        const countErrors = checkArticleCount(counts, universe, geographyKind)
        if (countErrors.length > 0) {
            setErrors(countErrors)
            setSuccessData(undefined)
            setLoading(false)
            return
        }

        setLoading(true)
        setErrors([])
        const executeUSS = async (): Promise<void> => {
            try {
                const exec = await executeAsync({ descriptor: { kind: 'statistics', geographyKind, universe }, stmts: uss })

                const execErrors = exec.error

                if (exec.resultingValue === undefined) {
                    setErrors(execErrors)
                    setSuccessData(undefined) // Clear output on execution error
                    setLoading(false)
                    return
                }
                const res = exec.resultingValue

                assert(res.type.name === 'table', `Expected resulting value to be of type table, got ${renderType(res.type)}. This was checked earlier (hence assertion not error)`)

                const tableValue = exec.resultingValue.value
                const table = tableValue.value
                assert(table.columns.length > 0, 'Table has no columns. This was checked earlier (hence assertion not error)')

                if (table.columns.length === 0) {
                    const error: EditorError = { type: 'error', value: 'Table has no columns', location: noLocation, kind: 'error' }
                    const allErrors = [...execErrors, error]
                    setErrors(allErrors)
                    setLoading(false)
                    return
                }

                // Convert all columns to the data format
                const firstColumn = table.columns[0]
                const geonames = table.geo

                const dataColumns = table.columns.map((col: TableColumnWithPopulationPercentiles) => ({
                    value: col.values,
                    populationPercentile: col.populationPercentiles,
                    ordinal: computeOrdinals(col.values),
                    name: col.name,
                    unit: col.unit,
                }))

                setSuccessData({
                    data: dataColumns,
                    articleNames: geonames,
                    renderedStatname: table.title ?? table.columns.map(col => col.name).join(', '),
                    totalCountInClass: firstColumn.values.length,
                    totalCountOverall: firstColumn.values.length,
                    hideOrdinalsPercentiles: table.hideOrdinalsPercentiles,
                    uuid: uuid(),
                })
                setErrors(execErrors)
                setLoading(false)
            }
            catch (e) {
                const error: EditorError = { type: 'error', value: e instanceof Error ? e.message : 'Unknown error', location: noLocation, kind: 'error' }
                setErrors([error])
                setLoading(false)
            }
        }
        void executeUSS()
    }, [uss, geographyKind, universe, counts])

    const successDataSorted = useMemo((): StatisticData & { uuid: string } | undefined => {
        if (successData === undefined) {
            return undefined
        }
        return {
            data: successData.data,
            articleNames: successData.articleNames,
            renderedStatname: successData.renderedStatname,
            totalCountInClass: successData.totalCountInClass,
            totalCountOverall: successData.totalCountOverall,
            uuid: successData.uuid,
            hideOrdinalsPercentiles: successData.hideOrdinalsPercentiles,
        }
    }, [successData])

    if (loading) {
        return { type: 'loading', errors, uuid: 'loading' }
    }
    assert(errors.length > 0 || successDataSorted !== undefined, 'errors and successDataSorted cannot both be empty/undefined')
    if (successDataSorted !== undefined) {
        return { type: 'success', ...successDataSorted, errors }
    }
    return { type: 'error', errors, uuid: objectHash(errors) }
}

async function loadStatisticsData(universe: Universe, statname: StatName, articleType: string, counts: CountsByUT): Promise<StatisticDataOutcome> {
    const statIndex = statistic_name_list.indexOf(statname)

    // Check if there are no geographic entities using counts
    const countErrors = checkArticleCount(counts, universe, articleType)
    if (countErrors.length > 0) {
        return { type: 'error', errors: countErrors }
    }

    const [data, articleNames] = await loadStatisticsPage(universe, paths[statIndex], articleType)
    const totalCountInClass = forType(counts, universe, stats[statIndex], articleType)
    const totalCountOverall = forType(counts, universe, stats[statIndex], 'overall')
    return {
        type: 'success',
        data: [{
            value: data.value,
            populationPercentile: data.populationPercentile,
            ordinal: computeOrdinals(data.value),
            name: statname,
            unit: undefined,
        }],
        articleNames,
        renderedStatname: statname,
        statcol: stats[statIndex],
        explanationPage: explanation_pages[statIndex],
        totalCountInClass,
        totalCountOverall,
        hideOrdinalsPercentiles: false, // Statistics pages show ordinals/percentiles by default (false = show)
        errors: [],
    }
}

function parseUSSFromString(ussString: string, typeEnvironment: TypeEnvironment, isUssStatistic: boolean): MapUSS {
    const parsed = parse(ussString, { type: 'single', ident: idOutput })
    if (parsed.type === 'error') {
        return parseNoErrorAsCustomNode(ussString, idOutput, [tableType])
    }
    const res = attemptParseAsTopLevel(convertToMapUss(parsed), typeEnvironment, isUssStatistic, [tableType])
    return res
}

export function StatisticPanel(props: StatisticPanelProps): ReactNode {
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const [loadedData, setLoadedData] = useState<StatisticData | undefined>(undefined)
    const navContext = useContext(Navigator.Context)
    const colors = useColors()

    const isEditMode = props.edit ?? false

    const getEditUniverse = useCallback(() => props.universe, [props.universe])
    const [editUniverse, setEditUniverse] = useState<Universe>(getEditUniverse)

    const getEditGeographyKind = useCallback(() => props.articleType as typeof validGeographies[number], [props.articleType])
    const [editGeographyKind, setEditGeographyKind] = useState<typeof validGeographies[number]>(getEditGeographyKind)

    const typeEnvironment = useMemo(() => defaultTypeEnvironment(editUniverse), [editUniverse])

    const [editErrors, setEditErrors] = useState<EditorError[]>([])

    const getEditUSS = useCallback<() => [MapUSS, boolean]>(() => {
        const initialUSS = props.descriptor.type === 'uss-statistic'
            ? props.descriptor.uss
            : `customNode(""); condition (true); table(columns=[column(values=${varName(props.descriptor.statname)})])`
        return [parseUSSFromString(initialUSS, typeEnvironment, props.descriptor.type === 'uss-statistic'), props.descriptor.type === 'simple-statistic']
    }, [props.descriptor, typeEnvironment])
    const [[editUSS, isFromStatName], setEditUSS] = useState<[MapUSS, boolean]>(getEditUSS)

    // If needed, load state from updated props
    useEffect(() => {
        setEditUniverse(getEditUniverse())
        setEditGeographyKind(getEditGeographyKind)
        setEditUSS(getEditUSS())
    }, [getEditUniverse, getEditUSS, getEditGeographyKind])

    // Construct MapSettings from separate state for MapperSettings component
    const editMapSettings = useMemo((): MapSettings => ({
        universe: editUniverse,
        geographyKind: editGeographyKind as (typeof validGeographies)[number] | undefined,
        script: { uss: editUSS },
    }), [editUniverse, editGeographyKind, editUSS])

    // Handle MapSettings changes from MapperSettings component
    const handleMapSettingsChange = useCallback((newMapSettings: MapSettings): void => {
        setEditUniverse(newMapSettings.universe ?? props.universe)
        setEditGeographyKind(newMapSettings.geographyKind ?? props.articleType as typeof validGeographies[number])
        if (unparse(newMapSettings.script.uss) !== unparse(editUSS)) {
            setEditUSS([newMapSettings.script.uss, false])
        }
    }, [props.universe, props.articleType, editUSS])

    const handleEditSettingsClick = (): void => {
        const ussString = unparse(editUSS, { simplify: true })
        const newDescriptor: StatisticDescriptor = props.descriptor.type === 'uss-statistic'
            ? props.descriptor
            : { type: 'uss-statistic', uss: ussString }
        void navContext.navigate(statisticDescriptor({
            universe: editUniverse,
            statDesc: newDescriptor,
            articleType: editGeographyKind,
            start: props.start,
            amount: props.amount,
            order: props.order,
            highlight: props.highlight,
            edit: true,
            sortColumn: props.sortColumn,
        }), {
            history: 'push',
            scroll: { kind: 'none' },
        })
    }
    // Memoize the USS string to prevent unnecessary re-renders in custom script mode
    const ussString = useMemo(() => {
        return unparse(editUSS)
    }, [editUSS])

    const statDesc: StatisticDescriptor = useMemo(() => {
        return { type: 'uss-statistic', uss: ussString }
    }, [ussString])

    // Update URL when USS changes in edit mode
    useEffect(() => {
        if (!isFromStatName) {
            navContext.unsafeUpdateCurrentDescriptor({
                kind: 'statistic',
                universe: editUniverse,
                uss: statDesc.uss,
                article_type: editGeographyKind,
            })
        }
    }, [statDesc, editUniverse, editGeographyKind, isFromStatName, navContext])

    const handleApplyUSS = (): void => {
        void navContext.navigate(statisticDescriptor({
            universe: editUniverse,
            statDesc,
            articleType: editGeographyKind,
            start: props.start,
            amount: props.amount,
            order: props.order,
            highlight: undefined,
            edit: false,
            sortColumn: props.sortColumn,
        }), {
            history: 'push',
            scroll: { kind: 'position', top: 0 },
        })
    }

    const universesFiltered = useMemo(() => {
        if (loadedData?.statcol === undefined) {
            return universes_ordered
        }
        return universes_ordered.filter(
            universe => forType(props.counts, universe, loadedData.statcol!, props.articleType) > 0,
        )
    }, [loadedData?.statcol, props.counts, props.articleType])

    const csvExportCallback = useMemo <CSVExportData | undefined>(() => {
        if (loadedData === undefined) {
            return undefined
        }

        return () => ({
            csvData: generateStatisticsPanelCSVData(loadedData.articleNames, loadedData.data, loadedData.hideOrdinalsPercentiles),
            csvFilename: `${sanitize(loadedData.renderedStatname)}.csv`,
        })
    }, [loadedData])

    const screencapElements = useMemo((): (() => ScreencapElements) | undefined => {
        if (loadedData === undefined) {
            return undefined
        }
        return () => ({
            path: `${sanitize(loadedData.renderedStatname)}.png`,
            overallWidth: tableRef.current!.offsetWidth * 2,
            elementsToRender: [headersRef.current!, tableRef.current!],
        })
    }, [loadedData])

    const subHeaderTextClass = useSubHeaderTextClass()

    let preamble: ReactNode | undefined = undefined
    if (isEditMode) {
        const mapperExpression = tableToMapper(editUSS)
        const hasConvertButton = mapperExpression !== undefined
        preamble = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1em', padding: '1em' }}>
                <MapperSettings
                    mapSettings={editMapSettings}
                    setMapSettings={handleMapSettingsChange}
                    errors={editErrors}
                    counts={props.counts}
                    typeEnvironment={typeEnvironment}
                    targetOutputTypes={[tableType]}
                />
                <div style={{ display: 'flex', gap: '0.5em', width: '100%' }}>
                    <button
                        data-test-id="view"
                        onClick={handleApplyUSS}
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
                            editUSS={editUSS}
                            editGeographyKind={editGeographyKind}
                            editUniverse={editUniverse}
                            flexWidth="15%"
                        />
                    )}
                </div>
            </div>
        )
    }

    // Memoize the USS AST to prevent unnecessary re-executions
    const ussAST = useMemo(() => {
        return toStatement(editUSS)
    }, [editUSS])

    const colAdder = useMemo(() => addColumn(ussAST), [ussAST])

    const commonProps = {
        start: props.start,
        amount: props.amount,
        order: props.order,
        sortColumn: props.sortColumn,
        articleType: editGeographyKind,
        highlight: props.highlight,
        counts: props.counts,
        universe: editUniverse,
        edit: isEditMode,
    }

    let content: ReactNode
    if (props.descriptor.type === 'uss-statistic') {
        content = (
            <USSStatisticPanel
                {...commonProps}
                descriptor={statDesc}
                ussAST={ussAST}
                onDataLoaded={setLoadedData}
                tableRef={tableRef}
                setErrors={setEditErrors}
            />
        )
    }
    else {
        content = <SimpleStatisticPanel {...commonProps} descriptor={props.descriptor} onDataLoaded={setLoadedData} tableRef={tableRef} />
    }

    const navigator = useContext(Navigator.Context)

    return (
        <universeContext.Provider value={{
            universe: props.universe,
            universes: universesFiltered,
            setUniverse(newUniverse) {
                void navigator.navigate({
                    kind: 'statistic',
                    article_type: props.articleType,
                    statname: props.descriptor.type === 'simple-statistic' ? props.descriptor.statname : undefined,
                    uss: props.descriptor.type === 'uss-statistic' ? props.descriptor.uss : undefined,
                    start: props.start,
                    amount: props.amount,
                    order: props.order,
                    highlight: props.highlight,
                    universe: newUniverse,
                    sort_column: props.sortColumn,
                    edit: isEditMode,
                }, {
                    history: 'push',
                    scroll: { kind: 'none' },
                })
            },
        }}
        >
            <PageTemplate
                screencap={screencapElements ? (universe, templateColors) => createScreenshot(screencapElements(), universe, templateColors) : undefined}
                csvExportCallback={csvExportCallback}
            >
                <div ref={headersRef} style={{ position: 'relative' }}>
                    <StatisticPanelHead
                        articleType={props.articleType}
                        renderedOther={props.order}
                    />
                    <div className={subHeaderTextClass}>{loadedData?.renderedStatname ?? 'Table'}</div>
                    {!isEditMode && (
                        <div style={{ marginLeft: 'auto', marginTop: '8px', display: 'flex', gap: '8px', width: 'fit-content' }}>
                            {colAdder && (
                                <div style={{ flexGrow: 1, minWidth: '300px' }}>
                                    <AddColumnSearchBox
                                        editUSS={editUSS}
                                        setEditUSS={(newUSS) => { setEditUSS([newUSS, false]) }}
                                        typeEnvironment={typeEnvironment}
                                        colAdder={colAdder}
                                    />
                                </div>
                            )}
                            <button
                                data-test-id="edit"
                                onClick={handleEditSettingsClick}
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
                            <ConvertToMapButton
                                editUSS={editUSS}
                                editGeographyKind={editGeographyKind}
                                editUniverse={editUniverse}
                            />
                        </div>
                    )}
                </div>
                <div style={{ marginBlockEnd: '16px' }}></div>
                {preamble}
                {content}
            </PageTemplate>
        </universeContext.Provider>
    )
}

function varName(statname: StatName): string {
    const index = statistic_name_list.indexOf(statname)
    const result = statistic_variables_info.variableNames.find(v => v.index === index)
    assert(result !== undefined, `No variable name found for statistic ${statname}`)
    const multi = statistic_variables_info.multiSourceVariables.find(([, ns]) => (ns.individualVariables as readonly string[]).includes(result.varName))
    if (multi !== undefined) {
        return multi[0]
    }
    return result.varName
}

interface SimpleStatisticPanelProps extends StatisticCommonProps {
    descriptor: { type: 'simple-statistic', statname: StatName }
    onDataLoaded: (data: StatisticData) => void
    tableRef: React.RefObject<HTMLDivElement>
}

function SimpleStatisticPanel(props: SimpleStatisticPanelProps): ReactNode {
    const { onDataLoaded, tableRef, ...restProps } = props
    const promise = useMemo(
        () => loadStatisticsData(restProps.universe, restProps.descriptor.statname, restProps.articleType, restProps.counts),
        [restProps.universe, restProps.descriptor.statname, restProps.articleType, restProps.counts],
    )
    const data = useOrderedResolve(promise)

    useEffect(() => {
        if (data.result?.type === 'success') {
            onDataLoaded(data.result)
        }
    }, [data.result, onDataLoaded])

    if (data.result === undefined || data.result.type === 'loading') {
        return (
            <div style={{ position: 'relative' }}>
                <RelativeLoader loading={true} />
            </div>
        )
    }

    if (data.result.type === 'error') {
        return (
            <div>
                <DisplayResults results={data.result.errors} editor={false} />
            </div>
        )
    }

    return <StatisticPanelOnceLoaded {...restProps} {...data.result} statDesc={restProps.descriptor} tableRef={tableRef} />
}

interface USSStatisticPanelProps extends StatisticCommonProps {
    descriptor: { type: 'uss-statistic', uss: string }
    onDataLoaded: (data: StatisticData) => void
    tableRef: React.RefObject<HTMLDivElement>
    setErrors: (errors: EditorError[]) => void
    ussAST: UrbanStatsASTStatement
}

function USSStatisticPanel(props: USSStatisticPanelProps): ReactNode {
    const { onDataLoaded, tableRef, setErrors, ...restProps } = props
    const data = useUSSStatisticPanelData(
        restProps.ussAST,
        restProps.articleType as (typeof validGeographies)[number],
        restProps.universe,
        restProps.counts,
    )

    const lastDataUUID = useRef<string | undefined>(undefined)
    useEffect(() => {
        if (data.type === 'success') {
            // Only call onDataLoaded if the data has actually changed
            if (lastDataUUID.current !== data.uuid) {
                lastDataUUID.current = data.uuid
                onDataLoaded(data)
            }
        }
    }, [data, onDataLoaded])

    // Update parent errors in useEffect to avoid setState during render
    useEffect(() => {
        setErrors(data.errors)
    }, [data.errors, setErrors])

    if (data.type === 'loading') {
        return (
            <div style={{ position: 'relative' }}>
                <RelativeLoader loading={true} />
            </div>
        )
    }

    if (data.type === 'error') {
        return (
            <div>
                <DisplayResults results={data.errors} editor={false} />
            </div>
        )
    }

    return <StatisticPanelOnceLoaded {...restProps} {...data} statDesc={restProps.descriptor} tableRef={tableRef} />
}

type StatisticPanelLoadedProps = StatisticCommonProps & StatisticData & { statDesc: StatisticDescriptor, tableRef: React.RefObject<HTMLDivElement> }

function StatisticPanelOnceLoaded(props: StatisticPanelLoadedProps): ReactNode {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    const isAscending = props.order === 'ascending'

    // Compute sorted row indices based on the selected sort column and order
    const { sortedIndices, count } = useMemo(() => {
        if (props.data.length === 0) {
            return { sortedIndices: [] as number[], count: 0 }
        }
        const sortColumnIndex = Math.max(0, Math.min(props.sortColumn, props.data.length - 1))
        const sortByColumn = props.data[sortColumnIndex]
        const indices = sortByColumn.value.map((_, i) => i).filter(i => !isNaN(sortByColumn.value[i]))
        indices.sort((a, b) => {
            const va = sortByColumn.value[a]
            const vb = sortByColumn.value[b]
            if (isAscending) {
                return orderNonNan(va, vb)
            }
            return orderNonNan(vb, va)
        })
        return { sortedIndices: indices, count: indices.length }
    }, [props.data, props.sortColumn, isAscending])

    const amount = props.amount === 'All' ? count : props.amount

    const indexRange = useMemo(() => {
        if (count === 0) {
            return []
        }
        const start = props.start - 1
        let end = start + amount
        if (end + amount > count) {
            end = count
        }
        const result = Array.from({ length: end - start }, (_, i) => {
            return start + i
        })
        return result
    }, [props.start, amount, count])

    const swapAscendingDescending = (currentUniverse: Universe | undefined): void => {
        const newOrder = isAscending ? 'descending' : 'ascending'
        void navContext.navigate(statisticDescriptor({
            universe: currentUniverse,
            statDesc: props.statDesc,
            articleType: props.articleType,
            start: 1,
            amount,
            order: newOrder,
            edit: props.edit,
            sortColumn: props.sortColumn,
        }), {
            history: 'push',
            scroll: { kind: 'none' },
        })
    }

    const changeSortColumn = (columnIndex: number, currentUniverse: Universe | undefined): void => {
        // If clicking the same column, toggle order. Otherwise, switch to that column with descending order.
        const newSortColumn = columnIndex
        const newOrder = columnIndex === props.sortColumn ? (isAscending ? 'descending' : 'ascending') : 'descending'
        void navContext.navigate(statisticDescriptor({
            universe: currentUniverse,
            statDesc: props.statDesc,
            articleType: props.articleType,
            start: 1,
            amount,
            order: newOrder,
            edit: props.edit,
            sortColumn: newSortColumn,
        }), {
            history: 'push',
            scroll: { kind: 'none' },
        })
    }

    const getRowBackgroundColor = (rowIdx: number): string => {
        const actualRowIdx = sortedIndices[indexRange[rowIdx]]
        const nameAtIdx = props.articleNames[actualRowIdx]
        if (nameAtIdx === props.highlight) {
            return colors.highlight
        }
        if (rowIdx % 2 === 0) {
            return colors.slightlyDifferentBackground
        }
        return colors.background
    }

    const ncols = props.data.length

    const widthLeftHeader = ncols > 1 ? 25 : 50

    const numStatColumns = props.data.length
    const columnWidth = (100 - widthLeftHeader) / (numStatColumns === 0 ? 1 : numStatColumns)

    return (
        <div>
            <MaybeScroll widthColumns={computeComparisonWidthColumns(ncols, true)}>
                <div className="serif" ref={props.tableRef}>
                    <StatisticPanelTable
                        indexRange={indexRange}
                        sortedIndices={sortedIndices}
                        props={props}
                        isAscending={isAscending}
                        swapAscendingDescending={swapAscendingDescending}
                        changeSortColumn={changeSortColumn}
                        sortColumn={props.sortColumn}
                        getRowBackgroundColor={getRowBackgroundColor}
                        widthLeftHeader={widthLeftHeader}
                        columnWidth={columnWidth}
                        data={props.data}
                        articleNames={props.articleNames}
                        disclaimer={props.statDesc.type === 'uss-statistic'}
                        hideOrdinalsPercentiles={props.hideOrdinalsPercentiles}
                    />
                </div>
            </MaybeScroll>
            <div style={{ marginBlockEnd: '1em' }}></div>
            <Pagination
                {...props}
                count={count}
                amount={amount}
            />
        </div>
    )
}

function StatisticPanelTable(props: {
    indexRange: number[]
    sortedIndices: number[]
    props: StatisticPanelLoadedProps
    isAscending: boolean
    swapAscendingDescending: (currentUniverse: Universe | undefined) => void
    changeSortColumn: (columnIndex: number, currentUniverse: Universe | undefined) => void
    sortColumn: number
    getRowBackgroundColor: (rowIdx: number) => string
    widthLeftHeader: number
    columnWidth: number
    data: { value: number[], populationPercentile: number[], ordinal: number[], name: string, unit?: UnitType }[]
    hideOrdinalsPercentiles: boolean
    articleNames: string[]
    disclaimer: boolean
}): ReactNode {
    const currentUniverse = useUniverse()
    const colors = useColors()
    assert(currentUniverse !== undefined, 'no universe')

    const onlyColumns: ColumnIdentifier[] = props.hideOrdinalsPercentiles ? ['statval', 'statval_unit'] : ['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile']

    const allColumnRows: StatisticCellRenderingInfo[][] = props.data.map((col) => {
        return props.indexRange.map((rangeIdx) => {
            const actualRowIdx = props.sortedIndices[rangeIdx]
            return {
                statval: col.value[actualRowIdx],
                ordinal: col.ordinal[actualRowIdx],
                percentileByPopulation: col.populationPercentile[actualRowIdx],
                statname: col.name,
                articleType: props.props.articleType,
                totalCountInClass: props.props.totalCountInClass,
                totalCountOverall: props.props.totalCountOverall,
                overallFirstLast: { isFirst: false, isLast: false },
                unit: col.unit,
            } satisfies StatisticCellRenderingInfo
        })
    })

    const leftHeaderSpecs: CellSpec[] = props.indexRange.map((rangeIdx) => {
        const actualRowIdx = props.sortedIndices[rangeIdx]
        const articleName = props.articleNames[actualRowIdx]
        return {
            type: 'statistic-panel-longname',
            longname: articleName,
            currentUniverse,
        } satisfies CellSpec
    })

    const rowSpecs: CellSpec[][] = props.indexRange.map((rangeIdx, rowIdx) => {
        const actualRowIdx = props.sortedIndices[rangeIdx]
        const articleName = props.articleNames[actualRowIdx]
        return allColumnRows.map(columnRows => ({
            type: 'statistic-row',
            longname: articleName,
            row: columnRows[rowIdx],
            onlyColumns,
            simpleOrdinals: true,
            onNavigate: undefined,
        } satisfies CellSpec))
    })

    const topLeftSpec: CellSpec = {
        type: 'top-left-header',
        statNameOverride: 'Name',
    }

    const headerSpecs: CellSpec[] = props.data.map((col, colIndex) => ({
        type: 'statistic-name',
        renderedStatname: col.name,
        longname: col.name,
        currentUniverse,
        sortInfo: {
            onSort: () => {
                props.changeSortColumn(colIndex, currentUniverse)
            },
            sortDirection: props.sortColumn === colIndex ? (props.isAscending ? 'up' : 'down') : 'both',
        },
        center: true,
        transpose: true, // This is a header not on the left, so it's in "transpose" mode
    } satisfies CellSpec))
    const superHeaderSpec: SuperHeaderSpec = {
        headerSpecs,
        showBottomBar: false,
    }

    const highlightOriginalIdx = props.articleNames.indexOf(props.props.highlight ?? '')
    const highlightRowIndex = highlightOriginalIdx >= 0
        ? props.indexRange.findIndex(rangeIdx => props.sortedIndices[rangeIdx] === highlightOriginalIdx)
        : -1
    const footer = props.disclaimer
        ? (
                <div style={{ fontSize: '0.8em', color: colors.textMain, marginTop: '1em', textAlign: 'right' }}>
                    Note: percentiles are calculated among geographies that have a valid value for this statistic.
                </div>
            )
        : null
    return (
        <>
            <TableContents
                leftHeaderSpec={{ leftHeaderSpecs }}
                rowSpecs={rowSpecs}
                horizontalPlotSpecs={[]}
                verticalPlotSpecs={[]}
                topLeftSpec={topLeftSpec}
                superHeaderSpec={superHeaderSpec}
                widthLeftHeader={props.widthLeftHeader}
                columnWidth={props.columnWidth}
                onlyColumns={onlyColumns}
                simpleOrdinals={true}
                highlightRowIndex={highlightRowIndex}
            />
            {footer}
        </>
    )
}

function Pagination(props: {
    start: number
    count: number
    amount: number
    explanationPage?: string
    statDesc: StatisticDescriptor
    articleType: string
    order: 'ascending' | 'descending'
    edit?: boolean
    sortColumn: number
}): ReactNode {
    // next and previous buttons, along with the current range (editable to jump to a specific page)
    // also a button to change the number of items per page

    const currentUniverse = useUniverse()

    const navContext = useContext(Navigator.Context)

    const changeStart = (newStart: number): void => {
        void navContext.navigate(statisticDescriptor({
            universe: currentUniverse,
            ...props,
            start: newStart,
            edit: props.edit,
        }), {
            history: 'push',
            scroll: { kind: 'none' },
        })
    }

    const changeAmount = (newAmount: string | number): void => {
        let start = props.start
        let newAmountNum: number
        if (newAmount === 'All') {
            start = 1
            newAmountNum = props.count
        }
        else if (typeof newAmount === 'string') {
            newAmountNum = parseInt(newAmount)
        }
        else {
            newAmountNum = newAmount
        }
        if (start > props.count - newAmountNum) {
            start = props.count - newAmountNum + 1
        }
        void navContext.navigate(statisticDescriptor({
            universe: currentUniverse,
            statDesc: props.statDesc,
            articleType: props.articleType,
            start,
            amount: newAmount === 'All' ? 'All' : newAmountNum,
            order: props.order,
            edit: props.edit,
            sortColumn: props.sortColumn,
        }), {
            history: 'push',
            scroll: { kind: 'none' },
        })
    }

    const current = props.start
    const total = props.count
    const perPage = props.amount
    const prev = Math.max(1, current - perPage)
    const maxPages = Math.max(Math.floor(total / perPage), 1)
    const maxPageStart = (maxPages - 1) * perPage + 1
    const next = Math.min(maxPageStart, current + perPage)
    const currentPage = Math.ceil(current / perPage)

    useEffect(() => {
        const goToPage = (newPage: number): void => {
            void navContext.navigate(statisticDescriptor({
                universe: currentUniverse,
                statDesc: props.statDesc,
                articleType: props.articleType,
                amount: props.amount,
                order: props.order,
                start: (newPage - 1) * perPage + 1,
                edit: props.edit,
                sortColumn: props.sortColumn,
            }), {
                history: 'replace',
                scroll: { kind: 'none' },
            })
        }

        if (currentPage > maxPages) {
            goToPage(maxPages)
        }
        else if (currentPage < 1) {
            goToPage(1)
        }
    }, [currentPage, maxPages, currentUniverse, perPage, props.statDesc, props.articleType, props.amount, props.order, props.edit, props.sortColumn, navContext])

    const selectPage = (
        <SelectPage
            changeStart={(newStart) => { changeStart(newStart) }}
            currentPage={currentPage}
            maxPages={maxPages}
            prevPage={prev}
            nextPage={next}
            perPage={perPage}
        />
    )

    const explanationCredit = props.explanationPage !== undefined
        ? (
                <div style={{ margin: 'auto', textAlign: 'center' }}>
                    <a
                        {...navContext.link(
                            { kind: 'dataCredit', hash: `#explanation_${sanitize(props.explanationPage)}` },
                            { scroll: { kind: 'none' } },
                        )}
                    >
                        Data Explanation and Credit
                    </a>
                </div>
            )
        : <div></div>

    // align the entire div to the center. not flex.
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            margin: '1em',
        }}
        >
            <div style={{ width: '25%' }}>
                {explanationCredit}
            </div>
            <div style={{ width: '50%' }}>
                <div style={{ margin: 'auto', textAlign: 'center' }}>
                    {selectPage}
                </div>
            </div>
            <div style={{ width: '25%' }}>
                <PerPageSelector
                    perPage={perPage}
                    total={total}
                    changeAmount={(newAmount) => { changeAmount(newAmount) }}
                />
            </div>
        </div>
    )
}

function PerPageSelector(props: {
    perPage: number
    total: number
    changeAmount: (targetValue: string) => void
}): ReactNode {
    const colors = useColors()
    return (
        <div style={{ margin: 'auto', textAlign: 'center' }}>
            <span>
                <select
                    style={{ backgroundColor: colors.background, color: colors.textMain }}
                    defaultValue={
                        props.perPage === props.total ? 'All' : props.perPage
                    }
                    onChange={(e) => { props.changeAmount(e.target.value) }}
                    className="serif"
                >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="All">All</option>
                </select>
                {' '}
                per page
            </span>
        </div>
    )
}

function SelectPage(props: {
    prevPage: number
    currentPage: number
    maxPages: number
    perPage: number
    changeStart: (newStart: number) => void
    nextPage: number
}): ReactNode {
    // low-key style for the buttons
    const buttonStyle = {
        margin: '0.5em',
    }

    const [pageNumber, setPageNumber] = useState(props.currentPage.toString())

    const pageField = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setPageNumber(props.currentPage.toString())
        if (document.activeElement === pageField.current) {
            pageField.current!.select()
        }
    }, [props.currentPage])

    const handleSubmit = (): void => {
        let newPage = parseInt(pageNumber)
        if (newPage < 1) {
            newPage = 1
        }
        if (newPage > props.maxPages) {
            newPage = props.maxPages
        }
        const newStart = (newPage - 1) * props.perPage + 1
        props.changeStart(newStart)
    }

    const disabled = {
        left: props.currentPage === 1,
        right: props.currentPage === props.maxPages,
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button
                onClick={() => { props.changeStart(props.prevPage) }}
                className="serif"
                style={{ ...buttonStyle, visibility: disabled.left ? 'hidden' : 'visible' }}
                disabled={disabled.left}
                data-test-id="-1"
            >
                <PointerArrow direction={-1} disabled={disabled.left} />
            </button>
            <div>
                <span>Page: </span>
                <input
                    ref={pageField}
                    type="text"
                    pattern="[0-9]*"
                    style={{ width: '3em', textAlign: 'right', fontSize: '16px' }}
                    className="serif"
                    value={pageNumber}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            handleSubmit()
                        }
                    }}
                    onFocus={(e) => {
                        setTimeout(() => {
                            e.target.select()
                        }, 0)
                    }}
                    onBlur={handleSubmit}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => { setPageNumber(e.target.value) }}
                />
                <span>
                    {' of '}
                    {props.maxPages}
                </span>
            </div>
            <button
                onClick={() => { props.changeStart(props.nextPage) }}
                className="serif"
                style={{ ...buttonStyle, visibility: disabled.right ? 'hidden' : 'visible' }}
                disabled={disabled.right}
                data-test-id="1"
            >
                <PointerArrow direction={1} disabled={disabled.right} />
            </button>
        </div>
    )
}

interface VariableSearchResult { name: string, displayName: string }

function AddColumnSearchBox(props: {
    editUSS: MapUSS
    setEditUSS: (uss: MapUSS) => void
    typeEnvironment: TypeEnvironment
    colAdder: ((expr: UrbanStatsASTExpressionCreator) => UrbanStatsASTStatement | UrbanStatsASTExpression)
}): ReactNode {
    const allVariables = useMemo(() => relevantSelections(props.typeEnvironment), [props.typeEnvironment])

    const doSearch = useMemo(() => {
        return (query: string): Promise<VariableSearchResult[]> => {
            const lowerQuery = query.toLowerCase()
            const filtered = allVariables.filter(v =>
                v.displayName.toLowerCase().includes(lowerQuery)
                || v.name.toLowerCase().includes(lowerQuery),
            )
            return Promise.resolve(filtered)
        }
    }, [allVariables])

    const handleAddColumn = (variable: VariableSearchResult): void => {
        // Add the column using addColumn
        const newAST = props.colAdder(locInfo => createCall(variable.name, locInfo)) as UrbanStatsASTStatement
        const newUSS = convertToMapUss(newAST)
        props.setEditUSS(newUSS)
    }

    const renderMatch = (
        currentMatch: () => VariableSearchResult,
        onMouseOver: () => void,
        onClick: () => void,
        style: React.CSSProperties,
        dataTestId: string | undefined,
    ): React.ReactElement => (
        <div
            key={currentMatch().name}
            className="serif searchbox-dropdown-item"
            style={style}
            onClick={onClick}
            onMouseOver={onMouseOver}
            data-test-id={dataTestId}
        >
            {currentMatch().displayName}
        </div>
    )

    return (
        <GenericSearchBox
            matches={[]}
            doSearch={doSearch}
            onChange={(result) => { handleAddColumn(result) }}
            autoFocus={false}
            placeholder="Add column..."
            style={{ width: '100%' }}
            renderMatch={renderMatch}
            allowEmptyQuery={true}
        />
    )
}

function relevantSelections(typeEnvironment: TypeEnvironment): VariableSearchResult[] {
    const selections = possibilities([{ type: 'vector', elementType: { type: 'number' } }], typeEnvironment)
    return selections
        .filter((s): s is Selection & { type: 'variable' } => s.type === 'variable')
        .map((selection): VariableSearchResult => {
            const varDoc = typeEnvironment.get(selection.name)
            const displayName = varDoc?.documentation?.humanReadableName ?? selection.name
            return { name: selection.name, displayName }
        })
}

function createCall(vn: string, blockId: string | undefined): UrbanStatsASTExpression {
    assert(blockId !== undefined, 'blockId is undefined in createCall')
    const location = emptyLocation(blockId)
    const ident: UrbanStatsASTExpression = {
        type: 'identifier',
        name: { node: vn, location: emptyLocation(extendBlockIdKwarg(blockId, 'values')) },
    }
    const call: UrbanStatsASTExpression = {
        type: 'call',
        fn: {
            type: 'identifier',
            name: { node: 'column', location },
        },
        args: [{ type: 'named', name: { node: 'values', location }, value: ident }],
        entireLoc: location,
    }
    return call
}

function StatisticPanelHead(props: { articleType: string, renderedOther: string }): ReactNode {
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')
    const headerTextClass = useHeaderTextClass()
    return (
        <div className={headerTextClass}>
            {displayType(currentUniverse, props.articleType)}
        </div>
    )
}

function ConvertToMapButton(props: {
    editUSS: MapUSS
    editGeographyKind: string
    editUniverse: Universe
    flexWidth?: string
}): ReactNode {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    const mapperExpression = useMemo(
        () => tableToMapper(props.editUSS),
        [props.editUSS],
    )
    const handleConvertToMap = useCallback((): void => {
        if (!mapperExpression) return
        const settingsJson = JSON.stringify({
            geographyKind: props.editGeographyKind,
            universe: props.editUniverse,
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
    }, [mapperExpression, navContext, props.editGeographyKind, props.editUniverse])

    if (mapperExpression === undefined) {
        return null
    }

    return (
        <button
            data-test-id="convert-to-map"
            onClick={handleConvertToMap}
            style={{
                flex: props.flexWidth ? `0 0 ${props.flexWidth}` : undefined,
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
