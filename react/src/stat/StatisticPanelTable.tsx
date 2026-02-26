import React, { ChangeEvent, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { StatisticCellRenderingInfo } from '../components/load-article'
import { PointerArrow } from '../components/pointer-cell'
import { computeComparisonWidthColumns, MaybeScroll } from '../components/scrollable'
import { CellSpec, SuperHeaderSpec, TableContents } from '../components/supertable'
import { ColumnIdentifier } from '../components/table'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useUniverse } from '../universe'
import { orderNonNan } from '../urban-stats-script/constants/table'
import { assert } from '../utils/defensive'
import { sanitize } from '../utils/paths'

import { Statistic, StatData, StatSetter, View } from './types'

export function StatisticPanelTable({ view, stat, data, set, tableRef }: {
    view: View
    stat: Statistic
    data: StatData
    set: StatSetter
    tableRef: React.RefObject<HTMLDivElement>
}): ReactNode {
    const colors = useColors()

    const isAscending = view.order === 'ascending'

    // Compute sorted row indices based on the selected sort column and order
    const { sortedIndices, count } = useMemo(() => {
        if (data.table.length === 0) {
            return { sortedIndices: [] as number[], count: 0 }
        }
        const sortColumnIndex = Math.max(0, Math.min(view.sortColumn, data.table.length - 1))
        const sortByColumn = data.table[sortColumnIndex]
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
    }, [data.table, view.sortColumn, isAscending])

    const amount = view.amount === 'All' ? count : view.amount

    const indexRange = useMemo(() => {
        if (count === 0) {
            return []
        }
        const start = view.start - 1
        let end = start + amount
        if (end + amount > count) {
            end = count
        }
        const result = Array.from({ length: end - start }, (_, i) => {
            return start + i
        })
        return result
    }, [view.start, amount, count])

    const widthLeftHeader = data.table.length > 1 ? 25 : 50

    const columnWidth = (100 - widthLeftHeader) / (data.table.length === 0 ? 1 : data.table.length)

    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')

    const onlyColumns: ColumnIdentifier[] = data.hideOrdinalsPercentiles ? ['statval', 'statval_unit'] : ['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile']

    const allColumnRows: StatisticCellRenderingInfo[][] = data.table.map((col) => {
        return indexRange.map((rangeIdx) => {
            const actualRowIdx = sortedIndices[rangeIdx]
            return {
                statval: col.value[actualRowIdx],
                ordinal: col.ordinal[actualRowIdx],
                percentileByPopulation: col.populationPercentile[actualRowIdx],
                statname: col.name,
                articleType: stat.articleType,
                totalCountInClass: data.totalCountInClass,
                totalCountOverall: data.totalCountOverall,
                overallFirstLast: { isFirst: false, isLast: false },
                unit: col.unit,
            } satisfies StatisticCellRenderingInfo
        })
    })

    const leftHeaderSpecs: CellSpec[] = indexRange.map((rangeIdx) => {
        const actualRowIdx = sortedIndices[rangeIdx]
        const articleName = data.articleNames[actualRowIdx]
        return {
            type: 'statistic-panel-longname',
            longname: articleName,
            currentUniverse,
        } satisfies CellSpec
    })

    const rowSpecs: CellSpec[][] = indexRange.map((rangeIdx, rowIdx) => {
        const actualRowIdx = sortedIndices[rangeIdx]
        const articleName = data.articleNames[actualRowIdx]
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

    const headerSpecs: CellSpec[] = data.table.map((col, colIndex) => ({
        type: 'statistic-name',
        renderedStatname: col.name,
        longname: col.name,
        currentUniverse,
        sortInfo: {
            onSort: () => {
                const newOrder = colIndex === view.sortColumn ? (isAscending ? 'descending' : 'ascending') : 'descending'
                set({ view: { ...view, sortColumn: colIndex, order: newOrder } }, { history: 'replace' })
            },
            sortDirection: view.sortColumn === colIndex ? (isAscending ? 'up' : 'down') : 'both',
        },
        center: true,
        transpose: true, // This is a header not on the left, so it's in "transpose" mode
    } satisfies CellSpec))
    const superHeaderSpec: SuperHeaderSpec = {
        headerSpecs,
        showBottomBar: false,
    }

    const highlightOriginalIdx = data.articleNames.indexOf(view.highlight ?? '')
    const highlightRowIndex = highlightOriginalIdx >= 0
        ? indexRange.findIndex(rangeIdx => sortedIndices[rangeIdx] === highlightOriginalIdx)
        : -1
    const footer = stat.type === 'uss'
        ? (
                <div style={{ fontSize: '0.8em', color: colors.textMain, marginTop: '1em', textAlign: 'right' }}>
                    Note: percentiles are calculated among geographies that have a valid value for this statistic.
                </div>
            )
        : null

    return (
        <div>
            <MaybeScroll widthColumns={computeComparisonWidthColumns(data.table.length, true)}>
                <div className="serif" ref={tableRef}>
                    <TableContents
                        leftHeaderSpec={{ leftHeaderSpecs }}
                        rowSpecs={rowSpecs}
                        horizontalPlotSpecs={[]}
                        verticalPlotSpecs={[]}
                        topLeftSpec={topLeftSpec}
                        superHeaderSpec={superHeaderSpec}
                        widthLeftHeader={widthLeftHeader}
                        columnWidth={columnWidth}
                        onlyColumns={onlyColumns}
                        simpleOrdinals={true}
                        highlightRowIndex={highlightRowIndex}
                    />
                    {footer}
                </div>
            </MaybeScroll>
            <div style={{ marginBlockEnd: '1em' }}></div>
            <Pagination
                set={set}
                view={view}
                data={data}
                count={count}
            />
        </div>
    )
}

function Pagination({ set, view, count, data }: { set: StatSetter, view: View, count: number, data: StatData }): ReactNode {
    // next and previous buttons, along with the current range (editable to jump to a specific page)
    // also a button to change the number of items per page

    const navContext = useContext(Navigator.Context)

    const changeStart = (newStart: number): void => {
        set({
            view: {
                ...view,
                start: newStart,
            },
        }, {
            history: 'push',
        })
    }

    const changeAmount = (newAmount: string | number): void => {
        let start = view.start
        let newAmountNum: number
        if (newAmount === 'All') {
            start = 1
            newAmountNum = count
        }
        else if (typeof newAmount === 'string') {
            newAmountNum = parseInt(newAmount)
        }
        else {
            newAmountNum = newAmount
        }
        if (start > count - newAmountNum) {
            start = count - newAmountNum + 1
        }
        set({
            view: {
                ...view,
                start,
                amount: newAmount === 'All' ? 'All' : newAmountNum,
            },
        }, {
            history: 'push',
        })
    }

    const current = view.start
    const total = count
    const perPage = view.amount === 'All' ? count : view.amount
    const prev = Math.max(1, current - perPage)
    const maxPages = Math.max(Math.floor(total / perPage), 1)
    const maxPageStart = (maxPages - 1) * perPage + 1
    const next = Math.min(maxPageStart, current + perPage)
    const currentPage = Math.ceil(current / perPage)

    useEffect(() => {
        const goToPage = (newPage: number): void => {
            set({
                view: {
                    ...view,
                    start: (newPage - 1) * perPage + 1,
                },
            }, { undoable: false, history: 'replace' })
        }

        if (currentPage > maxPages) {
            goToPage(maxPages)
        }
        else if (currentPage < 1) {
            goToPage(1)
        }
    }, [currentPage, maxPages, perPage, set, view])

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

    const explanationCredit = data.explanationPage !== undefined
        ? (
                <div style={{ margin: 'auto', textAlign: 'center' }}>
                    <a
                        {...navContext.link(
                            { kind: 'dataCredit', hash: `#explanation_${sanitize(data.explanationPage)}` },
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
