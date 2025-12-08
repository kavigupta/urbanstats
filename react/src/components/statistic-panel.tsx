import React, { ChangeEvent, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'

import stats from '../data/statistic_list'
import paths from '../data/statistic_path_list'
import universes_ordered from '../data/universes_ordered'
import { Navigator } from '../navigation/Navigator'
import { sanitize, statisticDescriptor } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { StatName, StatPath } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import './article.css'
import { useUniverse } from '../universe'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { displayType } from '../utils/text'

import { CountsByUT } from './countsByArticleType'
import { CSVExportData } from './csv-export'
import { ArticleRow, forType, StatCol } from './load-article'
import { PointerArrow } from './pointer-cell'
import { createScreenshot, ScreencapElements, useScreenshotMode } from './screenshot'
import { TableContents, CellSpec, SuperHeaderSpec } from './supertable'

export interface StatisticPanelProps {
    start: number
    amount: number
    count: number
    order: 'ascending' | 'descending'
    joinedString: string
    statcol: StatCol
    statname: StatName
    articleType: string
    articleNames: string[]
    highlight: string | undefined
    renderedStatname: string
    data: {
        value: number[]
        populationPercentile: number[]
    }
    explanationPage: string
    counts: CountsByUT
}

export function StatisticPanel(props: StatisticPanelProps): ReactNode {
    const colors = useColors()
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)

    const screencapElements = (): ScreencapElements => ({
        path: `${sanitize(props.joinedString)}.png`,
        overallWidth: tableRef.current!.offsetWidth * 2,
        elementsToRender: [headersRef.current!, tableRef.current!],
    })

    const isAscending = props.order === 'ascending'

    const navContext = useContext(Navigator.Context)

    const indexRange = useMemo(() => {
        const start = props.start - 1
        let end = start + props.amount
        if (end + props.amount > props.count) {
            end = props.count
        }
        const total = props.count
        const result = Array.from({ length: end - start }, (_, i) => {
            if (isAscending) {
                return total - start - i - 1
            }
            return start + i
        })
        return result
    }, [props.start, props.amount, props.count, isAscending])

    const swapAscendingDescending = (currentUniverse: string | undefined): void => {
        const newOrder = isAscending ? 'descending' : 'ascending'
        void navContext.navigate(statisticDescriptor({
            universe: currentUniverse,
            statname: props.statname,
            articleType: props.articleType,
            start: 1,
            amount: props.amount,
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
        universe => forType(props.counts, universe, props.statcol, props.articleType) > 0,
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
    const csvFilename = `${sanitize(props.joinedString)}.csv`
    const csvExportData: CSVExportData = { csvData, csvFilename }

    const widthLeftHeader = 50

    const headerTextClass = useHeaderTextClass()

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
                    />
                </div>
                <div style={{ marginBlockEnd: '1em' }}></div>
                <Pagination
                    {...props}
                />
            </div>
        </PageTemplate>
    )
}

function StatisticPanelTable(props: {
    indexRange: number[]
    props: StatisticPanelProps
    isAscending: boolean
    swapAscendingDescending: (currentUniverse: string | undefined) => void
    getRowBackgroundColor: (rowIdx: number) => string
    widthLeftHeader: number
    columnWidth: number
}): ReactNode {
    const currentUniverse = useUniverse()

    const statIndex = stats.indexOf(props.props.statcol)
    const statpath: StatPath = paths[statIndex]

    const articleRows: ArticleRow[] = props.indexRange.map((i) => {
        const totalCountInClass = forType(props.props.counts, currentUniverse, props.props.statcol, props.props.articleType)
        const totalCountOverall = forType(props.props.counts, currentUniverse, props.props.statcol, 'overall')
        return {
            statval: props.props.data.value[i],
            ordinal: i + 1,
            percentileByPopulation: props.props.data.populationPercentile[i],
            statcol: props.props.statcol,
            statname: props.props.statname,
            statpath,
            explanationPage: props.props.explanationPage,
            articleType: props.props.articleType,
            totalCountInClass,
            totalCountOverall,
            index: statIndex,
            renderedStatname: props.props.renderedStatname,
            overallFirstLast: { isFirst: false, isLast: false },
        } satisfies ArticleRow
    })

    const leftHeaderSpecs: CellSpec[] = articleRows.map((row, rowIdx) => {
        const articleName = props.props.articleNames[props.indexRange[rowIdx]]
        return {
            type: 'statistic-panel-longname',
            longname: articleName,
            currentUniverse,
        } satisfies CellSpec
    })

    const rowSpecs: CellSpec[][] = articleRows.map((row, rowIdx) => {
        const articleName = props.props.articleNames[props.indexRange[rowIdx]]
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
                row: articleRows[0],
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

    const highlightRowIndex = props.indexRange.indexOf(props.props.articleNames.indexOf(props.props.highlight ?? ''))

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
    explanationPage: string
    statname: StatName
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
            statname: props.statname,
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
                statname: props.statname,
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
    }, [currentPage, maxPages, currentUniverse, perPage, props.statname, props.articleType, props.amount, props.order, navContext])

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
