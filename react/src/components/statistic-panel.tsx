import React, { CSSProperties, ReactNode, useMemo, useRef } from 'react'

import { article_link, explanation_page_link, sanitize, statistic_link } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import './article.css'
import { useUniverse } from '../universe'
import { useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { display_type } from '../utils/text'

import { Percentile, Statistic } from './table'

const table_style = { display: 'flex', flexDirection: 'column', padding: '1px' } as const
const column_names = ['Ordinal', 'Name', 'Value', '', 'Percentile']
const column_widths = ['15%', '60%', '20%', '10%', '20%']
const column_styles = [
    { textAlign: 'right', paddingRight: '1em' },
    { textAlign: 'left' },
    { textAlign: 'right' },
    { textAlign: 'left' },
    { textAlign: 'right' },
] as const

export function StatisticPanel(props: {
    start: number
    amount: number
    count: number
    ordering: 'ascending' | 'descending'
    joined_string: string
    statname: string
    article_type: string
    article_names: string[]
    highlight: string | undefined
    rendered_statname: string
    data: {
        value: number[]
        populationPercentile: number[]
    }
    explanation_page: string
}): ReactNode {
    const colors = useColors()
    const headers_ref = useRef<HTMLDivElement>(null)
    const table_ref = useRef<HTMLDivElement>(null)

    const is_ascending = props.ordering === 'ascending'

    const index_range = useMemo(() => {
        const start = props.start - 1
        let end = start + props.amount
        if (end + props.amount >= props.count) {
            end = props.count
        }
        const total = props.count
        const result = Array.from({ length: end - start }, (_, i) => {
            if (is_ascending) {
                return total - start - i - 1
            }
            return start + i
        })
        return result
    }, [props.start, props.amount, props.count, is_ascending])

    const swap_ascending_descending = (curr_universe: string | undefined): void => {
        const new_order = is_ascending ? 'descending' : 'ascending'
        const link = statistic_link(
            curr_universe,
            props.statname, props.article_type,
            1, props.amount, new_order,
            undefined,
        )
        document.location = link
    }

    const background_color = (row_idx: number): string => {
        if (row_idx > 0) {
            const name_at_idx = props.article_names[index_range[row_idx - 1]]
            if (name_at_idx === props.highlight) {
                return colors.highlight
            }
        }
        if (row_idx % 2 === 1) {
            return colors.slightlyDifferentBackground
        }
        return colors.background
    }

    const style = (col_idx: number, row_idx: number): CSSProperties => {
        let result: CSSProperties = { ...table_style }
        if (row_idx === 0) {
            // header, add a line at the bottom
            result.borderBottom = '1px solid #000'
            result.fontWeight = 500
        }
        result.backgroundColor = background_color(row_idx)
        result.width = column_widths[col_idx]
        result = { ...result, ...column_styles[col_idx] }
        return result
    }

    const textHeaderClass = useHeaderTextClass()

    return (
        <PageTemplate
            screencap_elements={() => ({
                path: `${sanitize(props.joined_string)}.png`,
                overall_width: table_ref.current!.offsetWidth * 2,
                elements_to_render: [headers_ref.current!, table_ref.current!],
            })}
            has_universe_selector={true}
            universes={require('../data/universes_ordered.json') as string[]}
        >
            <div>
                <div ref={headers_ref}>
                    <div className={textHeaderClass}>{props.rendered_statname}</div>
                    {/* // TODO plural */}
                    <StatisticPanelSubhead
                        article_type={props.article_type}
                        rendered_order={props.ordering}
                    />
                </div>
                <div style={{ marginBlockEnd: '16px' }}></div>
                <div className="serif" ref={table_ref}>
                    <div style={{ display: 'flex' }}>
                        {column_names.map((name, i) => {
                            if (i === 0) {
                                return (
                                    <div key={name} style={{ ...style(i, 0), display: 'flex', justifyContent: 'space-between', flexDirection: 'row' }}>
                                        <div>{name}</div>
                                        <AscendingVsDescending on_click={(curr_universe) => { swap_ascending_descending(curr_universe) }} is_ascending={is_ascending} />
                                    </div>
                                )
                            }
                            return <div key={name} style={style(i, 0)}>{name}</div>
                        })}
                    </div>
                    {
                        index_range.map((i, row_idx) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex', alignItems: 'baseline', backgroundColor: background_color(row_idx + 1),
                                }}
                            >
                                <div style={style(0, row_idx + 1)}>{i + 1}</div>
                                <div style={style(1, row_idx + 1)}>
                                    <ArticleLink longname={props.article_names[i]} />
                                </div>
                                <div style={style(2, row_idx + 1)} className="value">
                                    <Statistic
                                        statname={props.statname}
                                        value={props.data.value[i]}
                                        is_unit={false}
                                    />
                                </div>
                                <div style={style(3, row_idx + 1)} className="value_unit value">
                                    <Statistic
                                        statname={props.statname}
                                        value={props.data.value[i]}
                                        is_unit={true}
                                    />
                                </div>
                                <div style={style(4, row_idx + 1)}>
                                    <AutoPercentile
                                        ordinal={0}
                                        total_count_in_class={0}
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
    explanation_page: string
    statname: string
    article_type: string
    ordering: string | undefined
}): ReactNode {
    // next and previous buttons, along with the current range (editable to jump to a specific page)
    // also a button to change the number of items per page

    const change_start = (curr_universe: string | undefined, new_start: number): void => {
        document.location.href = statistic_link(
            curr_universe,
            props.statname, props.article_type,
            new_start, props.amount, props.ordering, undefined,
        )
    }

    const change_amount = (curr_universe: string | undefined, new_amount: string | number): void => {
        let start = props.start
        let new_amount_num: number
        if (new_amount === 'All') {
            start = 1
            new_amount_num = props.count
        }
        else if (typeof new_amount === 'string') {
            new_amount_num = parseInt(new_amount)
        }
        else {
            new_amount_num = new_amount
        }
        if (start > props.count - new_amount_num) {
            start = props.count - new_amount_num + 1
        }
        document.location.href = statistic_link(
            curr_universe,
            props.statname,
            props.article_type,
            start,
            new_amount === 'All' ? 'All' : new_amount_num,
            props.ordering,
            undefined,
        )
    }

    const current = props.start
    const total = props.count
    const per_page = props.amount
    const prev = Math.max(1, current - per_page)
    const max_pages = Math.floor(total / per_page)
    const max_page_start = (max_pages - 1) * per_page + 1
    const next = Math.min(max_page_start, current + per_page)
    const current_page = Math.ceil(current / per_page)

    const select_page = (
        <SelectPage
            change_start={(curr_universe, new_start) => { change_start(curr_universe, new_start) }}
            current_page={current_page}
            max_pages={max_pages}
            prev_page={prev}
            next_page={next}
            per_page={per_page}
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
                    <a href={explanation_page_link(props.explanation_page)}>Data Explanation and Credit</a>
                </div>
            </div>
            <div style={{ width: '50%' }}>
                <div style={{ margin: 'auto', textAlign: 'center' }}>
                    {select_page}
                </div>
            </div>
            <div style={{ width: '25%' }}>
                <PerPageSelector
                    per_page={per_page}
                    total={total}
                    change_amount={(curr_universe, new_amount) => { change_amount(curr_universe, new_amount) }}
                />
            </div>
        </div>
    )
}

function PerPageSelector(props: {
    per_page: number
    total: number
    change_amount: (curr_universe: string | undefined, targetValue: string) => void
}): ReactNode {
    const curr_universe = useUniverse()
    const colors = useColors()
    return (
        <div style={{ margin: 'auto', textAlign: 'center' }}>
            <span>
                <select
                    style={{ backgroundColor: colors.background }}
                    defaultValue={
                        props.per_page === props.total ? 'All' : props.per_page
                    }
                    onChange={(e) => { props.change_amount(curr_universe, e.target.value) }}
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
    prev_page: number
    current_page: number
    max_pages: number
    per_page: number
    change_start: (curr_universe: string | undefined, new_start: number) => void
    next_page: number
}): ReactNode {
    // low-key style for the buttons
    const colors = useColors()
    const button_style = {
        backgroundColor: colors.slightlyDifferentBackground,
        border: '1px solid #000',
        padding: '0 0.5em',
        margin: '0.5em',
    }

    const curr_universe = useUniverse()
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={() => { props.change_start(curr_universe, props.prev_page) }} className="serif" style={button_style}>&lt;</button>
            <div>
                <span>Page: </span>
                <input
                    type="string"
                    pattern="[0-9]*"
                    style={{ width: '3em', textAlign: 'right', backgroundColor: colors.background }}
                    className="serif"
                    defaultValue={props.current_page}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            let new_page = parseInt((e.target as HTMLInputElement).value)
                            if (new_page < 1) {
                                new_page = 1
                            }
                            if (new_page > props.max_pages) {
                                new_page = props.max_pages
                            }
                            const new_start = (new_page - 1) * props.per_page + 1
                            props.change_start(curr_universe, new_start)
                        }
                    }}
                />
                <span>
                    {' of '}
                    {props.max_pages}
                </span>
            </div>
            <button onClick={() => { props.change_start(curr_universe, props.next_page) }} className="serif" style={button_style}>&gt;</button>
        </div>
    )
}

function ArticleLink(props: { longname: string }): ReactNode {
    const curr_universe = useUniverse()
    return (
        <a
            href={article_link(curr_universe, props.longname)}
            style={{ fontWeight: 500, color: 'black', textDecoration: 'none' }}
        >
            {props.longname}
        </a>
    )
}

function StatisticPanelSubhead(props: { article_type: string, rendered_order: string }): ReactNode {
    const curr_universe = useUniverse()
    return (
        <div className={useSubHeaderTextClass()}>
            {display_type(curr_universe, props.article_type)}
            {' '}
            (
            {props.rendered_order}
            )
        </div>
    )
}

function AutoPercentile(props: {
    ordinal: number
    total_count_in_class: number
    data: { populationPercentile: number[] }
    i: number
}): ReactNode {
    const [simple_ordinals] = useSetting('simple_ordinals')
    return (
        <Percentile
            ordinal={props.ordinal}
            total={props.total_count_in_class}
            percentile_by_population={props.data.populationPercentile[props.i]}
            simple={simple_ordinals}
        />
    )
}

function AscendingVsDescending({ on_click, is_ascending }: { on_click: (curr_universe: string | undefined) => void, is_ascending: boolean }): ReactNode {
    const curr_universe = useUniverse()
    // either an up or down arrow, depending on the current ordering
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ cursor: 'pointer' }} onClick={() => { on_click(curr_universe) }} id="statistic-panel-order-swap">
                {is_ascending ? '▲' : '▼'}
            </div>
        </div>
    )
}
