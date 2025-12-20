import { randomBytes } from 'crypto'

import objectHash from 'object-hash'
import React, { ChangeEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import explanation_pages from '../data/explanation_page'
import validGeographies from '../data/mapper/used_geographies'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list'
import statistic_name_list from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import statistic_variables_info from '../data/statistic_variables_info'
import universes_ordered from '../data/universes_ordered'
import { loadStatisticsPage } from '../load_json'
import { defaultTypeEnvironment } from '../mapper/context'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { attemptParseAsTopLevel, idOutput, MapUSS } from '../mapper/settings/TopLevelEditor'
import { MapSettings, convertToMapUss } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { sanitize, statisticDescriptor } from '../navigation/links'
import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { StatName } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import './article.css'
import { Universe, useUniverse } from '../universe'
import { DisplayResults } from '../urban-stats-script/Editor'
import { toStatement, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { tableType } from '../urban-stats-script/constants/table'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { parse, parseNoErrorAsCustomNode, unparse } from '../urban-stats-script/parser'
import { renderType, TypeEnvironment } from '../urban-stats-script/types-values'
import { executeAsync } from '../urban-stats-script/workerManager'
import { assert } from '../utils/defensive'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { displayType } from '../utils/text'
import { UnitType } from '../utils/unit'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { CountsByUT } from './countsByArticleType'
import { CSVExportData } from './csv-export'
import { forType, StatCol, StatisticCellRenderingInfo } from './load-article'
import { PointerArrow } from './pointer-cell'
import { createScreenshot, ScreencapElements } from './screenshot'
import { TableContents, CellSpec, SuperHeaderSpec } from './supertable'

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
    articleType: string
    highlight: string | undefined
    counts: CountsByUT
    universe: string
}

export interface StatisticPanelProps extends StatisticCommonProps {
    descriptor: StatisticDescriptor
    edit?: boolean
}

interface StatisticData {
    data: { value: number[], populationPercentile: number[] }
    articleNames: string[]
    renderedStatname: string
    statcol?: StatCol
    explanationPage?: string
    totalCountInClass: number
    totalCountOverall: number
    unit?: UnitType
}

type StatisticDataOutcome = (
    { type: 'success' } & StatisticData & { errors: EditorError[] }
    | { type: 'error', errors: EditorError[] }
    | { type: 'loading', errors: EditorError[] }
)

function uuid(): string {
    return randomBytes(20).toString('hex')
}

function useUSSStatisticPanelData(uss: UrbanStatsASTStatement, geographyKind: (typeof validGeographies)[number], universe: Universe): StatisticDataOutcome & { uuid: string } {
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

                // Use first column for now
                const firstColumn = table.columns[0]
                const values = firstColumn.values
                const geonames = table.geo

                setSuccessData({
                    data: { value: values, populationPercentile: firstColumn.populationPercentiles },
                    articleNames: geonames,
                    renderedStatname: firstColumn.name,
                    totalCountInClass: values.length,
                    totalCountOverall: values.length,
                    unit: firstColumn.unit,
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
    }, [uss, geographyKind, universe])

    const successDataSorted = useMemo((): StatisticData & { uuid: string } | undefined => {
        if (successData === undefined) {
            return undefined
        }
        const sortedIndices = successData.data.value
            .map((_, i) => i)
            .sort((a, b) => successData.data.value[b] - successData.data.value[a])
        const sortedData = {
            value: sortedIndices.map(i => successData.data.value[i]),
            populationPercentile: sortedIndices.map(i => successData.data.populationPercentile[i]),
        }
        const sortedArticleNames = sortedIndices.map(i => successData.articleNames[i])
        return { data: sortedData, articleNames: sortedArticleNames, renderedStatname: successData.renderedStatname, totalCountInClass: successData.totalCountInClass, totalCountOverall: successData.totalCountOverall, unit: successData.unit, uuid: successData.uuid }
    }, [successData])

    if (loading) {
        return { type: 'loading', errors, uuid: uuid() }
    }
    assert(errors.length > 0 || successDataSorted !== undefined, 'errors and successDataSorted cannot both be empty/undefined')
    if (successDataSorted !== undefined) {
        return { type: 'success', ...successDataSorted, errors }
    }
    return { type: 'error', errors, uuid: uuid() }
}

async function loadStatisticsData(universe: string, statname: StatName, articleType: string, counts: CountsByUT): Promise<StatisticDataOutcome> {
    const statIndex = names.indexOf(statname)
    const [data, articleNames] = await loadStatisticsPage(universe, paths[statIndex], articleType)
    const totalCountInClass = forType(counts, universe, stats[statIndex], articleType)
    const totalCountOverall = forType(counts, universe, stats[statIndex], 'overall')
    return {
        type: 'success',
        data,
        articleNames,
        renderedStatname: statname,
        statcol: stats[statIndex],
        explanationPage: explanation_pages[statIndex],
        totalCountInClass,
        totalCountOverall,
        errors: [],
    }
}

function parseUSSFromString(ussString: string, typeEnvironment: TypeEnvironment): MapUSS {
    const parsed = parse(ussString, { type: 'single', ident: idOutput })
    if (parsed.type === 'error') {
        return parseNoErrorAsCustomNode(ussString, idOutput, [tableType])
    }
    const res = attemptParseAsTopLevel(convertToMapUss(parsed), typeEnvironment, true, [tableType])
    return res
}

export function StatisticPanel(props: StatisticPanelProps): ReactNode {
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const [loadedData, setLoadedData] = useState<StatisticData | undefined>(undefined)
    const navContext = useContext(Navigator.Context)
    const colors = useColors()

    const isEditMode = props.edit ?? false
    const [editUniverse, setEditUniverse] = useState<string>(props.universe)
    useEffect(() => {
        setEditUniverse(props.universe)
    }, [props.universe])
    const [editGeographyKind, setEditGeographyKind] = useState<typeof validGeographies[number]>(props.articleType as typeof validGeographies[number])
    const typeEnvironment = useMemo(() => defaultTypeEnvironment(editUniverse as Universe | undefined), [editUniverse])
    const [editErrors, setEditErrors] = useState<EditorError[]>([])

    const [editUSS, setEditUSS] = useState<MapUSS>(() => {
        const initialUSS = props.descriptor.type === 'uss-statistic'
            ? props.descriptor.uss
            : `table(columns=[column(values=${varName(props.descriptor.statname)})])`
        return parseUSSFromString(initialUSS, typeEnvironment)
    })

    // Construct MapSettings from separate state for MapperSettings component
    const editMapSettings = useMemo((): MapSettings => ({
        universe: editUniverse as Universe | undefined,
        geographyKind: editGeographyKind as (typeof validGeographies)[number] | undefined,
        script: { uss: editUSS },
    }), [editUniverse, editGeographyKind, editUSS])

    // Handle MapSettings changes from MapperSettings component
    const handleMapSettingsChange = useCallback((newMapSettings: MapSettings): void => {
        setEditUniverse(newMapSettings.universe ?? props.universe)
        setEditGeographyKind(newMapSettings.geographyKind ?? props.articleType as typeof validGeographies[number])
        setEditUSS(newMapSettings.script.uss)
    }, [props.universe, props.articleType])

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
        }), {
            history: 'push',
            scroll: { kind: 'none' },
        })
    }

    // Update URL when USS changes in edit mode
    useEffect(() => {
        if (isEditMode && props.descriptor.type === 'uss-statistic') {
            const ussString = unparse(editUSS)
            void navContext.navigate(statisticDescriptor({
                universe: editUniverse,
                statDesc: { type: 'uss-statistic', uss: ussString },
                articleType: editGeographyKind,
                start: props.start,
                amount: props.amount,
                order: props.order,
                highlight: props.highlight,
                edit: true,
            }), {
                history: 'replace',
                scroll: { kind: 'none' },
            })
        }
    }, [editUSS, editUniverse, editGeographyKind, isEditMode, props.descriptor.type, navContext, props.universe, props.articleType, props.start, props.amount, props.order, props.highlight])

    const handleApplyUSS = (): void => {
        const ussString = unparse(editUSS)
        void navContext.navigate(statisticDescriptor({
            universe: editUniverse,
            statDesc: { type: 'uss-statistic', uss: ussString },
            articleType: editGeographyKind,
            start: 1,
            amount: 20,
            order: 'descending',
            highlight: undefined,
            edit: false,
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

    const csvExportData = useMemo((): CSVExportData | undefined => {
        if (loadedData === undefined) {
            return undefined
        }
        const headerRow = ['Rank', 'Name', 'Value', 'Percentile']
        const dataRows: string[][] = []

        for (let i = 0; i < loadedData.articleNames.length; i++) {
            const rank = i + 1
            const name = loadedData.articleNames[i]
            const value = loadedData.data.value[i]
            const percentile = loadedData.data.populationPercentile[i]

            const formattedValue = value.toLocaleString()

            dataRows.push([
                rank.toString(),
                name,
                formattedValue,
                percentile.toFixed(1),
            ])
        }

        return {
            csvData: [headerRow, ...dataRows],
            csvFilename: `${sanitize(loadedData.renderedStatname)}.csv`,
        }
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

    const headerTextClass = useHeaderTextClass()

    let preamble: ReactNode | undefined = undefined
    if (isEditMode) {
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
                <button
                    onClick={handleApplyUSS}
                    style={{
                        padding: '0.5em 1em',
                        backgroundColor: colors.unselectedButton,
                        color: colors.textMain,
                        border: `1px solid ${colors.textMain}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    Apply
                </button>
            </div>
        )
    }
    // Memoize the USS string to prevent unnecessary re-renders in custom script mode
    const ussString = useMemo(() => {
        return unparse(editUSS)
    }, [editUSS])

    // Memoize the USS AST to prevent unnecessary re-executions
    const ussAST = useMemo(() => {
        return toStatement(editUSS)
    }, [editUSS])

    const commonProps = {
        start: props.start,
        amount: props.amount,
        order: props.order,
        articleType: editGeographyKind,
        highlight: props.highlight,
        counts: props.counts,
        universe: editUniverse,
    }

    let content: ReactNode
    if (props.descriptor.type === 'uss-statistic') {
        content = (
            <USSStatisticPanel
                {...commonProps}
                descriptor={{ type: 'uss-statistic', uss: ussString }}
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

    return (
        <PageTemplate
            screencap={screencapElements ? (universe, templateColors) => createScreenshot(screencapElements(), universe, templateColors) : undefined}
            csvExportData={csvExportData}
            hasUniverseSelector={true}
            universes={universesFiltered}
        >
            <div ref={headersRef} style={{ position: 'relative' }}>
                <div className={headerTextClass}>{loadedData?.renderedStatname ?? 'Table'}</div>
                <StatisticPanelSubhead
                    articleType={props.articleType}
                    renderedOther={props.order}
                />
                {!isEditMode && (
                    <button
                        onClick={handleEditSettingsClick}
                        style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            padding: '0.25em 0.5em',
                            backgroundColor: colors.unselectedButton,
                            color: colors.textMain,
                            border: `1px solid ${colors.textMain}`,
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                        }}
                    >
                        Edit Settings
                    </button>
                )}
            </div>
            <div style={{ marginBlockEnd: '16px' }}></div>
            {preamble}
            {content}
        </PageTemplate>
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
        restProps.universe as Universe,
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

    const count = props.data.value.filter(x => !isNaN(x)).length

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
        const total = count
        const result = Array.from({ length: end - start }, (_, i) => {
            if (isAscending) {
                return total - start - i - 1
            }
            return start + i
        })
        return result
    }, [props.start, amount, count, isAscending])

    const swapAscendingDescending = (currentUniverse: string | undefined): void => {
        const newOrder = isAscending ? 'descending' : 'ascending'
        void navContext.navigate(statisticDescriptor({
            universe: currentUniverse,
            statDesc: props.statDesc,
            articleType: props.articleType,
            start: 1,
            amount,
            order: newOrder,
        }), {
            history: 'push',
            scroll: { kind: 'none' },
        })
    }

    const getRowBackgroundColor = (rowIdx: number): string => {
        const nameAtIdx = props.articleNames[indexRange[rowIdx]]
        if (nameAtIdx === props.highlight) {
            return colors.highlight
        }
        if (rowIdx % 2 === 0) {
            return colors.slightlyDifferentBackground
        }
        return colors.background
    }

    const widthLeftHeader = 50

    return (
        <div>
            <div className="serif" ref={props.tableRef}>
                <StatisticPanelTable
                    indexRange={indexRange}
                    props={props}
                    isAscending={isAscending}
                    swapAscendingDescending={swapAscendingDescending}
                    getRowBackgroundColor={getRowBackgroundColor}
                    widthLeftHeader={widthLeftHeader}
                    columnWidth={(100 - widthLeftHeader) / 1}
                    data={props.data}
                    articleNames={props.articleNames}
                />
            </div>
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
    props: StatisticPanelLoadedProps
    isAscending: boolean
    swapAscendingDescending: (currentUniverse: string | undefined) => void
    getRowBackgroundColor: (rowIdx: number) => string
    widthLeftHeader: number
    columnWidth: number
    data: { value: number[], populationPercentile: number[] }
    articleNames: string[]
}): ReactNode {
    const currentUniverse = useUniverse()

    const articleRows: StatisticCellRenderingInfo[] = props.indexRange.map((i) => {
        return {
            statval: props.data.value[i],
            ordinal: i + 1,
            percentileByPopulation: props.data.populationPercentile[i],
            statname: props.props.renderedStatname,
            articleType: props.props.articleType,
            totalCountInClass: props.props.totalCountInClass,
            totalCountOverall: props.props.totalCountOverall,
            overallFirstLast: { isFirst: false, isLast: false },
            unit: props.props.unit,
        } satisfies StatisticCellRenderingInfo
    })

    const leftHeaderSpecs: CellSpec[] = props.articleNames.map((row, rowIdx) => {
        const articleName = props.articleNames[props.indexRange[rowIdx]]
        return {
            type: 'statistic-panel-longname',
            longname: articleName,
            currentUniverse,
        } satisfies CellSpec
    })

    const rowSpecs: CellSpec[][] = articleRows.map((row, rowIdx) => {
        const articleName = props.articleNames[props.indexRange[rowIdx]]
        return [{
            type: 'statistic-row',
            longname: articleName,
            row,
            onlyColumns: ['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile'],
            simpleOrdinals: true,
            onNavigate: undefined,
        } satisfies CellSpec]
    })

    const topLeftSpec: CellSpec = {
        type: 'top-left-header',
        statNameOverride: 'Name',
    }

    const headerSpecs: CellSpec[] = articleRows.length > 0
        ? [{
                type: 'statistic-name',
                // row: articleRows[0],
                renderedStatname: props.props.renderedStatname,
                longname: props.props.renderedStatname,
                currentUniverse,
                sortInfo: {
                    onSort: () => {
                        props.swapAscendingDescending(currentUniverse)
                    },
                    sortDirection: props.isAscending ? 'up' : 'down',
                },
                center: true,
                transpose: true, // This is a header not on the left, so it's in "transpose" mode
            }]
        : []
    const superHeaderSpec: SuperHeaderSpec = {
        headerSpecs,
        showBottomBar: false,
    }

    const highlightRowIndex = props.indexRange.indexOf(props.articleNames.indexOf(props.props.highlight ?? ''))

    return (
        <TableContents
            leftHeaderSpec={{ leftHeaderSpecs }}
            rowSpecs={rowSpecs}
            horizontalPlotSpecs={[]}
            verticalPlotSpecs={[]}
            topLeftSpec={topLeftSpec}
            superHeaderSpec={superHeaderSpec}
            widthLeftHeader={props.widthLeftHeader}
            columnWidth={props.columnWidth}
            onlyColumns={['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile']}
            simpleOrdinals={true}
            highlightRowIndex={highlightRowIndex}
        />
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
    }, [currentPage, maxPages, currentUniverse, perPage, props.statDesc, props.articleType, props.amount, props.order, navContext])

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

function StatisticPanelSubhead(props: { articleType: string, renderedOther: string }): ReactNode {
    const currentUniverse = useUniverse()
    const subHeaderTextClass = useSubHeaderTextClass()
    return (
        <div className={subHeaderTextClass}>
            {displayType(currentUniverse, props.articleType)}
        </div>
    )
}
