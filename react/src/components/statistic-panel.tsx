import React, { ChangeEvent, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import explanation_pages from '../data/explanation_page'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import universes_ordered from '../data/universes_ordered'
import { loadStatisticsPage } from '../load_json'
import { Navigator } from '../navigation/Navigator'
import { sanitize, statisticDescriptor } from '../navigation/links'
import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { StatName } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import './article.css'
import { Universe, universeContext, useUniverse } from '../universe'
import { assert } from '../utils/defensive'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { displayType } from '../utils/text'
import { UnitType } from '../utils/unit'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { CountsByUT } from './countsByArticleType'
import { CSVExportData, generateStatisticsPanelCSVData } from './csv-export'
import { forType, StatCol, StatisticCellRenderingInfo } from './load-article'
import { PointerArrow } from './pointer-cell'
import { createScreenshot, ScreencapElements } from './screenshot'
import { TableContents, CellSpec, SuperHeaderSpec } from './supertable'
import { ColumnIdentifier } from './table'

export interface StatisticDescriptor {
    type: 'simple-statistic'
    statname: StatName
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
}

export interface StatisticPanelProps extends StatisticCommonProps {
    descriptor: StatisticDescriptor
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
    includeOrdinalsPercentiles: boolean
}

type StatisticDataOutcome = (
    { type: 'success' } & StatisticData
    | { type: 'error', error: string }
    | { type: 'loading' }
)

function computeOrdinals(values: number[]): number[] {
    const indices: number[] = values.map((_, idx) => idx)
    indices.sort((a, b) => values[b] - values[a]) // descending: 1 = largest value
    const ordinals: number[] = new Array<number>(values.length)
    indices.forEach((rowIdx, rank) => {
        ordinals[rowIdx] = rank + 1
    })
    return ordinals
}
async function loadStatisticsData(universe: Universe, statname: StatName, articleType: string, counts: CountsByUT): Promise<StatisticDataOutcome> {
    const statIndex = names.indexOf(statname)
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
        includeOrdinalsPercentiles: true, // Statistics pages always include ordinals/percentiles
    }
}

export function StatisticPanel(props: StatisticPanelProps): ReactNode {
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const [loadedData, setLoadedData] = useState<StatisticData | undefined>(undefined)

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
            csvData: generateStatisticsPanelCSVData(loadedData.articleNames, loadedData.data, loadedData.includeOrdinalsPercentiles),
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

    const content = <SimpleStatisticPanel {...props} descriptor={props.descriptor} onDataLoaded={setLoadedData} tableRef={tableRef} />

    const navigator = useContext(Navigator.Context)

    return (
        <universeContext.Provider value={{
            universe: props.universe,
            universes: universesFiltered,
            setUniverse(newUniverse) {
                void navigator.navigate({
                    kind: 'statistic',
                    article_type: props.articleType,
                    statname: props.descriptor.statname,
                    start: props.start,
                    amount: props.amount,
                    order: props.order,
                    highlight: props.highlight,
                    universe: newUniverse,
                    sort_column: props.sortColumn,
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
                <div ref={headersRef}>
                    <StatisticPanelHead
                        articleType={props.articleType}
                        renderedOther={props.order}
                    />
                    <div className={subHeaderTextClass}>{loadedData?.renderedStatname ?? 'Table'}</div>
                </div>
                <div style={{ marginBlockEnd: '16px' }}></div>
                {content}
            </PageTemplate>
        </universeContext.Provider>
    )
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

    if (data.result === undefined) {
        return <RelativeLoader loading={true} />
    }

    if (data.result.type === 'error') {
        return (
            <div>
                Error:
                {data.result.error}
            </div>
        )
    }

    if (data.result.type === 'success') {
        return <StatisticPanelOnceLoaded {...restProps} {...data.result} statDesc={restProps.descriptor} tableRef={tableRef} />
    }

    return <RelativeLoader loading={true} />
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
                return va - vb
            }
            return vb - va
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

    const widthLeftHeader = 50

    const numStatColumns = props.data.length

    return (
        <div>
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
                    columnWidth={(100 - widthLeftHeader) / (numStatColumns === 0 ? 1 : numStatColumns)}
                    data={props.data}
                    articleNames={props.articleNames}
                    includeOrdinalsPercentiles={props.includeOrdinalsPercentiles}
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
    includeOrdinalsPercentiles: boolean
    articleNames: string[]
}): ReactNode {
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')

    const onlyColumns: ColumnIdentifier[] = props.includeOrdinalsPercentiles ? ['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile'] : ['statval', 'statval_unit']

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
            onlyColumns={onlyColumns}
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
    }, [currentPage, maxPages, currentUniverse, perPage, props.statDesc, props.articleType, props.amount, props.order, props.sortColumn, navContext])

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
