import React, { ChangeEvent, CSSProperties, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react'

import universes_ordered from '../data/universes_ordered'
import { sanitize, statisticDescriptor } from '../navigation/links'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { StatName } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import './article.css'
import { useUniverse } from '../universe'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { displayType } from '../utils/text'

import { forType, StatCol } from './load-article'
import { Percentile, PointerArrow, Statistic } from './table'

const tableStyle = { display: 'flex', flexDirection: 'column', padding: '1px' } as const
const columnNames = ['Ordinal', 'Name', 'Value', '', 'Percentile']
const columnWidths = ['15%', '60%', '20%', '10%', '20%']
const columnStyles = [
    { textAlign: 'right', paddingRight: '1em' },
    { textAlign: 'left' },
    { textAlign: 'right' },
    { textAlign: 'left' },
    { textAlign: 'right' },
] as const

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
}

export function StatisticPanel(props: StatisticPanelProps): ReactNode {
    const colors = useColors()
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)

    const isAscending = props.order === 'ascending'

    const navContext = useContext(Navigator.Context)

    const indexRange = useMemo(() => {
        const start = props.start - 1
        let end = start + props.amount
        if (end + props.amount >= props.count) {
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
            scroll: null,
        })
    }

    const backgroundColor = (rowIdx: number): string => {
        if (rowIdx > 0) {
            const nameAtIdx = props.articleNames[indexRange[rowIdx - 1]]
            if (nameAtIdx === props.highlight) {
                return colors.highlight
            }
        }
        if (rowIdx % 2 === 1) {
            return colors.slightlyDifferentBackground
        }
        return colors.background
    }

    const style = (colIdx: number, rowIdx: number): CSSProperties => {
        let result: CSSProperties = { ...tableStyle }
        if (rowIdx === 0) {
            // header, add a line at the bottom
            result.borderBottom = `1px solid ${colors.textMain}`
            result.fontWeight = 500
        }
        result.backgroundColor = backgroundColor(rowIdx)
        result.width = columnWidths[colIdx]
        result = { ...result, ...columnStyles[colIdx] }
        return result
    }

    const textHeaderClass = useHeaderTextClass()

    const universesFiltered = universes_ordered.filter(
        universe => forType(universe, props.statcol, props.articleType) > 0,
    )

    useEffect(() => {
        document.title = props.statname
    }, [props.statname])

    return (
        <PageTemplate
            screencapElements={() => ({
                path: `${sanitize(props.joinedString)}.png`,
                overallWidth: tableRef.current!.offsetWidth * 2,
                elementsToRender: [headersRef.current!, tableRef.current!],
            })}
            hasUniverseSelector={true}
            universes={universesFiltered}
        >
            <div>
                <div ref={headersRef}>
                    <div className={textHeaderClass}>{props.renderedStatname}</div>
                    {/* // TODO plural */}
                    <StatisticPanelSubhead
                        articleType={props.articleType}
                        renderedOther={props.order}
                    />
                </div>
                <div style={{ marginBlockEnd: '16px' }}></div>
                <div className="serif" ref={tableRef}>
                    <div style={{ display: 'flex' }}>
                        {columnNames.map((name, i) => {
                            if (i === 0) {
                                return (
                                    <div key={name} style={{ ...style(i, 0), display: 'flex', justifyContent: 'space-between', flexDirection: 'row' }}>
                                        <div>{name}</div>
                                        <AscendingVsDescending onClick={(currentUniverse) => { swapAscendingDescending(currentUniverse) }} isAscending={isAscending} />
                                    </div>
                                )
                            }
                            return <div key={name} style={style(i, 0)}>{name}</div>
                        })}
                    </div>
                    {
                        indexRange.map((i, rowIdx) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex', alignItems: 'baseline', backgroundColor: backgroundColor(rowIdx + 1),
                                }}
                            >
                                <div style={style(0, rowIdx + 1)}>{i + 1}</div>
                                <div style={style(1, rowIdx + 1)}>
                                    <ArticleLink longname={props.articleNames[i]} />
                                </div>
                                <div style={style(2, rowIdx + 1)} className="value">
                                    <Statistic
                                        statname={props.statname}
                                        value={props.data.value[i]}
                                        isUnit={false}
                                    />
                                </div>
                                <div style={style(3, rowIdx + 1)} className="value_unit value">
                                    <Statistic
                                        statname={props.statname}
                                        value={props.data.value[i]}
                                        isUnit={true}
                                    />
                                </div>
                                <div style={style(4, rowIdx + 1)}>
                                    <AutoPercentile
                                        ordinal={0}
                                        totalCountInClass={0}
                                        data={props.data}
                                        i={i}
                                    />
                                </div>
                            </div>
                        ))
                    }
                </div>
                <div style={{ marginBlockEnd: '1em' }}></div>
                <Pagination
                    {...props}
                />
            </div>
        </PageTemplate>
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
            scroll: null,
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
            scroll: null,
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
                scroll: null,
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
                            { scroll: null },
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

function ArticleLink(props: { longname: string }): ReactNode {
    const currentUniverse = useUniverse()
    const colors = useColors()
    const navContext = useContext(Navigator.Context)
    return (
        <a
            {...navContext.link({
                kind: 'article',
                longname: props.longname,
                universe: currentUniverse,
            }, { scroll: 0 })}
            style={{ fontWeight: 500, color: colors.textMain, textDecoration: 'none' }}
        >
            {props.longname}
        </a>
    )
}

function StatisticPanelSubhead(props: { articleType: string, renderedOther: string }): ReactNode {
    const currentUniverse = useUniverse()
    return (
        <div className={useSubHeaderTextClass()}>
            {displayType(currentUniverse, props.articleType)}
            {' '}
            (
            {props.renderedOther}
            )
        </div>
    )
}

function AutoPercentile(props: {
    ordinal: number
    totalCountInClass: number
    data: { populationPercentile: number[] }
    i: number
}): ReactNode {
    const [simpleOrdinals] = useSetting('simple_ordinals')
    return (
        <Percentile
            ordinal={props.ordinal}
            total={props.totalCountInClass}
            percentileByPopulation={props.data.populationPercentile[props.i]}
            simpleOrdinals={simpleOrdinals}
        />
    )
}

function AscendingVsDescending({ onClick, isAscending }: { onClick: (currentUniverse: string | undefined) => void, isAscending: boolean }): ReactNode {
    const currentUniverse = useUniverse()
    // either an up or down arrow, depending on the current ordering
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ cursor: 'pointer' }} onClick={() => { onClick(currentUniverse) }} id="statistic-panel-order-swap">
                {isAscending ? '▲\ufe0e' : '▼\ufe0e'}
            </div>
        </div>
    )
}
