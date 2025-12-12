import React, { ChangeEvent, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'

import explanation_pages from '../data/explanation_page'
import validGeographies from '../data/mapper/used_geographies'
import stats from '../data/statistic_list'
import names from '../data/statistic_name_list'
import paths from '../data/statistic_path_list'
import universes_ordered from '../data/universes_ordered'
import { loadStatisticsPage } from '../load_json'
import { Navigator } from '../navigation/Navigator'
import { sanitize, statisticDescriptor } from '../navigation/links'
import { RelativeLoader } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { StatName, StatPath } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import './article.css'
import { Universe, useUniverse } from '../universe'
import { parse } from '../urban-stats-script/parser'
import { executeAsync } from '../urban-stats-script/workerManager'
import { assert } from '../utils/defensive'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { displayType } from '../utils/text'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { CountsByUT } from './countsByArticleType'
import { CSVExportData } from './csv-export'
import { ArticleRow, forType, StatCol, StatisticCellRenderingInfo } from './load-article'
import { PointerArrow } from './pointer-cell'
import { createScreenshot, ScreencapElements, useScreenshotMode } from './screenshot'
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
}

interface StatisticData {
    // value: number[]
    // populationPercentile: number[]
    data: { value: number[], populationPercentile: number[] }
    articleNames: string[]
    renderedStatname: string
    statcol?: StatCol
    explanationPage?: string
    totalCountInClass: number
    totalCountOverall: number
}

type StatisticDataOutcome = (
    { type: 'success' } & StatisticData
    | { type: 'error', error: string }
    | { type: 'loading' }
)

function useUSSStatisticPanelData(uss: string, geographyKind: (typeof validGeographies)[number], universe: Universe): StatisticDataOutcome {
    // const [data, setData] = useState<{ value: number[], populationPercentile: number[] } | undefined>(undefined)
    // const [articleNames, setArticleNames] = useState<string[] | undefined>(undefined)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | undefined>(undefined)
    // const [name, setName] = useState<string | undefined>(undefined)
    const [successData, setSuccessData] = useState<StatisticData | undefined>(undefined)

    useEffect(() => {
        setLoading(true)
        setError(undefined)
        const executeUSS = async (): Promise<void> => {
            try {
                const stmts = parse(uss, { type: 'single', ident: 'statistic-uss' })
                if (stmts.type === 'error') {
                    setError(stmts.errors.map(e => e.value).join('; '))
                    setLoading(false)
                    return
                }

                const exec = await executeAsync({ descriptor: { kind: 'statistics', geographyKind, universe }, stmts })
                console.log(exec)
                if (exec.error.length > 0) {
                    setError(exec.error.map(e => e.value).join('; '))
                    setLoading(false)
                    return
                }

                if (exec.resultingValue === undefined) {
                    setError('USS expression did not return a value')
                    setLoading(false)
                    return
                }
                const res = exec.resultingValue

                if (res.type.name !== 'table') {
                    setError(`USS expression must return a table, got ${exec.resultingValue.type.name}`)
                }

                const tableValue = exec.resultingValue.value
                const table = tableValue.value

                if (table.columns.length === 0) {
                    setError('Table has no columns')
                    setLoading(false)
                    return
                }

                // Use first column for now
                const firstColumn = table.columns[0]
                const values = firstColumn.values
                const geonames = table.geo

                setSuccessData({
                    data: { value: values, populationPercentile: Array.from({ length: values.length }, () => 0) }, // TODO: calculate percentiles
                    articleNames: geonames,
                    renderedStatname: firstColumn.name,
                    totalCountInClass: values.length,
                    totalCountOverall: values.length,
                })
                setLoading(false)
            }
            catch (e) {
                setError(e instanceof Error ? e.message : 'Unknown error')
                setLoading(false)
            }
        }
        void executeUSS()
    }, [uss, geographyKind, universe])

    const successDataSorted = useMemo((): StatisticData | undefined => {
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
        return { data: sortedData, articleNames: sortedArticleNames, renderedStatname: successData.renderedStatname, totalCountInClass: successData.totalCountInClass, totalCountOverall: successData.totalCountOverall }
    }, [successData])

    if (loading) {
        return { type: 'loading' }
    }
    assert(error !== undefined || successDataSorted !== undefined, 'error and successDataSorted cannot both be undefined')
    if (successDataSorted !== undefined) {
        return { type: 'success', ...successDataSorted }
    }
    return { type: 'error', error: error! }
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
    }
}

// so the object isn't re-created every time
const undefinedPromise = Promise.resolve(undefined)

function useStatisticPanelDataGeneric(props: StatisticPanelProps): StatisticDataOutcome {
    const ussData = useUSSStatisticPanelData(
        props.descriptor.type === 'uss-statistic' ? (props.descriptor as { type: 'uss-statistic', uss: string }).uss : '',
        props.articleType as (typeof validGeographies)[number], props.universe as Universe,
    )
    const regularData = useOrderedResolve(
        props.descriptor.type === 'uss-statistic' ? undefinedPromise : loadStatisticsData(props.universe, props.descriptor.statname, props.articleType, props.counts),
    )
    if (regularData.result !== undefined) {
        return regularData.result
    }
    if (ussData.type === 'success') {
        return ussData
    }
    if (ussData.type === 'error') {
        return { type: 'error', error: ussData.error }
    }
    return { type: 'loading' }
}

export function StatisticPanel(props: StatisticPanelProps): ReactNode {
    // const isUSS = props.descriptor.type === 'uss-statistic'
    // const ussString = isUSS ? (props.descriptor as { type: 'uss-statistic', uss: string }).uss : ''
    // console.log(ussString)
    // const ussData = useUSSStatisticPanelData(ussString, props.articleType as (typeof validGeographies)[number], props.universe as Universe)
    // const statIndex = isUSS ? -1 : names.indexOf(props.descriptor.type === 'simple-statistic' ? props.descriptor.statname : '' as StatName)
    // const statpath = isUSS ? '' : paths[statIndex]
    // const statcol = isUSS ? stats[0] : stats[statIndex]
    // const explanationPage = isUSS ? '' : explanation_pages[statIndex]
    // const regularData = useStatisticPanelData(props.universe, statpath, props.articleType)

    // if (isUSS) {
    //     const { data, articleNames, loading, error, name } = ussData

    //     if (loading || data === undefined || articleNames === undefined) {
    //         return (
    //             <PageTemplate hasUniverseSelector={true} universes={universes_ordered}>
    //                 <RelativeLoader loading={loading} />
    //                 {error && (
    //                     <div style={{ padding: '1rem' }}>
    //                         Error:
    //                         {error}
    //                     </div>
    //                 )}
    //             </PageTemplate>
    //         )
    //     }

    //     return (
    //         <StatisticPanelOnceLoaded
    //             {...props}
    //             data={data}
    //             articleNames={articleNames}
    //             statDesc={props.descriptor}
    //             statcol={statcol}
    //             explanationPage={explanationPage}
    //             renderedStatname={name ?? ''}
    //             joinedString=""
    //         />
    //     )
    // }

    // const { data, articleNames, loading } = regularData

    // if (loading || data === undefined || articleNames === undefined) {
    //     return (
    //         <PageTemplate
    //             hasUniverseSelector={true}
    //             universes={universes_ordered.filter(
    //                 universe => forType(props.counts, universe, statcol, props.articleType) > 0,
    //             )}
    //         >
    //             <RelativeLoader loading={loading} />
    //         </PageTemplate>
    //     )
    // }
    // return (
    //     <StatisticPanelOnceLoaded
    //         {...props}
    //         data={data}
    //         articleNames={articleNames}
    //         statDesc={props.descriptor}
    //         statcol={statcol}
    //         explanationPage={explanationPage}
    //         renderedStatname={props.descriptor.type === 'simple-statistic' ? props.descriptor.statname : ''}
    //         joinedString={statpath}
    //     />
    // )
    const data = useStatisticPanelDataGeneric(props)
    if (data.type === 'error') {
        return (
            <div>
                Error:
                {data.error}
            </div>
        )
    }
    if (data.type === 'loading') {
        return <RelativeLoader loading={true} />
    }
    return <StatisticPanelOnceLoaded {...props} {...data} statDesc={props.descriptor} />
}

type StatisticPanelLoadedProps = StatisticCommonProps & StatisticData & { statDesc: StatisticDescriptor }

function StatisticPanelOnceLoaded(props: StatisticPanelLoadedProps): ReactNode {
    const colors = useColors()
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const navContext = useContext(Navigator.Context)
    const headerTextClass = useHeaderTextClass()

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

    const screencapElements = (): ScreencapElements => ({
        path: `${sanitize(props.renderedStatname)}.png`,
        overallWidth: tableRef.current!.offsetWidth * 2,
        elementsToRender: [headersRef.current!, tableRef.current!],
    })

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

    const universesFiltered = universes_ordered.filter(
        universe => props.statcol === undefined || forType(props.counts, universe, props.statcol, props.articleType) > 0,
    )

    const generateStatisticsCSVData = (): string[][] => {
        const headerRow = ['Rank', 'Name', 'Value', 'Percentile']
        const dataRows: string[][] = []

        // Include all data, not just the current page
        for (let i = 0; i < props.articleNames.length; i++) {
            const rank = i + 1
            const name = props.articleNames[i]
            const value = props.data.value[i]
            const percentile = props.data.populationPercentile[i]

            const formattedValue = value.toLocaleString()

            dataRows.push([
                rank.toString(),
                name,
                formattedValue,
                percentile.toFixed(1),
            ])
        }

        return [headerRow, ...dataRows]
    }

    const csvData = generateStatisticsCSVData()
    const csvFilename = `${sanitize(props.renderedStatname)}.csv`
    const csvExportData: CSVExportData = { csvData, csvFilename }

    const widthLeftHeader = 50

    return (
        <PageTemplate
            screencap={(universe, templateColors) => createScreenshot(screencapElements(), universe, templateColors)}
            csvExportData={csvExportData}
            hasUniverseSelector={true}
            universes={universesFiltered}
        >
            <div>
                <div ref={headersRef}>
                    <div className={headerTextClass}>{props.renderedStatname}</div>
                    <StatisticPanelSubhead
                        articleType={props.articleType}
                        renderedOther={props.order}
                    />
                </div>
                <div style={{ marginBlockEnd: '16px' }}></div>
                <div className="serif" ref={tableRef}>
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
        </PageTemplate>
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

    // const statIndex = stats.indexOf(props.props.statcol)
    // const statpath: StatPath = paths[statIndex]

    const articleRows: StatisticCellRenderingInfo[] = props.indexRange.map((i) => {
        return {
            statval: props.data.value[i],
            ordinal: i + 1,
            percentileByPopulation: props.data.populationPercentile[i],
            // statcol: props.props.statcol,
            statname: props.props.renderedStatname,
            // statpath,
            // explanationPage: props.props.explanationPage,
            articleType: props.props.articleType,
            totalCountInClass: props.props.totalCountInClass,
            totalCountOverall: props.props.totalCountOverall,
            // index: statIndex,
            // renderedStatname: props.props.renderedStatname,
            overallFirstLast: { isFirst: false, isLast: false },
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
                // statname: props.statname,
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

export function ArrowUpOrDown(props: { direction: 'up' | 'down' | 'both', shouldAppearInScreenshot: boolean }): ReactNode {
    const isScreenshot = useScreenshotMode()

    if (isScreenshot && !props.shouldAppearInScreenshot) {
        return null
    }

    let image: string
    switch (props.direction) {
        case 'up':
            image = '/sort-up.png'
            break
        case 'down':
            image = '/sort-down.png'
            break
        case 'both':
            image = '/sort-both.png'
            break
    }
    return <img src={image} className="testing-order-swap" alt={props.direction} style={{ width: '16px', height: '16px' }} />
}
