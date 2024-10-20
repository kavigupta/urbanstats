import React, { ReactNode, useRef, useState } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'

import { load_ordering } from '../load_json'
import { article_link, statistic_link } from '../navigation/links'
import './table.css'
import { useColors } from '../page_template/colors'
import { row_expanded_key, useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'
import { is_historical_cd } from '../utils/is_historical'
import { display_type } from '../utils/text'

import { ArticleRow } from './load-article'
import { WithPlot } from './plots'
import { useScreenshotMode } from './screenshot'

const table_row_style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
}

export type StatisticRowRawProps = {
    simple: boolean
    only_columns?: string[]
    _idx: number
    statistic_style?: React.CSSProperties
    onReplace?: (newValue: string) => void
} & (
        (
            {
                is_header: false
                simple: boolean
            } & ArticleRow
        ) | {
            is_header: true
        }
    )

export function StatisticRowRaw(props: StatisticRowRawProps & { index: number, longname?: string, shortname?: string }): ReactNode {
    const colors = useColors()
    const [expanded] = useSetting(row_expanded_key(props.is_header ? 'header' : props.statname))

    const cell_contents = StatisticRowRawCellContents({ ...props, total_width: 100 })

    return (
        <WithPlot plot_props={[{ ...props, color: colors.hueColors.blue, shortname: props.shortname }]} expanded={expanded ?? false}>
            <StatisticRow is_header={props.is_header} index={props.index} contents={cell_contents} />
        </WithPlot>
    )
}

export function StatisticRowRawCellContents(props: StatisticRowRawProps & {
    total_width: number
    longname?: string
}): React.JSX.Element[] {
    const curr_universe = useUniverse()
    const colors = useColors()
    const ordinal_style: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 400,
        color: colors.ordinalTextColor,
        margin: 0,
    }
    const alignStyle: React.CSSProperties = { textAlign: props.is_header ? 'center' : 'right' }
    let value_columns: [number, string, React.ReactNode][] = [
        [15,
            'statval',
            <div style={alignStyle} key="value">
                <span className="serif value">
                    {
                        props.is_header
                            ? 'Value'
                            : (
                                    <Statistic
                                        statname={props.statname}
                                        value={props.statval}
                                        is_unit={false}
                                        style={props.statistic_style ?? {}}
                                    />
                                )
                    }
                </span>
            </div>,
        ],
        [10,
            'statval_unit',
            <div className="value_unit" key="unit">
                <span className="serif value">
                    {
                        props.is_header
                            ? ''
                            : (
                                    <Statistic
                                        statname={props.statname}
                                        value={props.statval}
                                        is_unit={true}
                                    />
                                )
                    }
                </span>
            </div>,
        ],
    ]
    if (props.is_header) {
        value_columns[0][0] += value_columns[1][0]
        value_columns = [value_columns[0]]
    }

    const screenshotMode = useScreenshotMode()

    const cells: [number, string, React.ReactNode][] = [
        [31,
            'statname',
            <span className="serif value" key="statistic">
                {
                    props.is_header
                        ? 'Statistic'
                        : (
                                <StatisticName
                                    statname={props.statname}
                                    article_type={props.article_type}
                                    ordinal={props.ordinal}
                                    longname={props.longname!}
                                    rendered_statname={props.rendered_statname}
                                    curr_universe={curr_universe}
                                    use_toggle={props.extra_stat !== undefined}
                                />
                            )
                }
            </span>,
        ],
        ...value_columns,
        [
            props.simple ? 7 : 17,
            'statistic_percentile',
            <span className="serif" key="ordinal" style={ordinal_style}>
                {
                    props.is_header
                        ? (props.simple ? right_align('%ile') : 'Percentile')
                        : (
                                <Percentile
                                    ordinal={props.ordinal}
                                    total={props.total_count_in_class}
                                    percentile_by_population={props.percentile_by_population}
                                    simple={props.simple}
                                />
                            )
                }
            </span>,
        ],
        [
            props.simple ? 8 : 25,
            'statistic_ordinal',
            <span className="serif" key="statistic_ordinal" style={ordinal_style}>
                {
                    props.is_header
                        ? (props.simple ? right_align('Ord') : 'Ordinal')
                        : (
                                <Ordinal
                                    ordinal={props.ordinal}
                                    total={props.total_count_in_class}
                                    type={props.article_type}
                                    statpath={props.statpath}
                                    simple={props.simple}
                                    onReplace={props.onReplace}
                                />
                            )
                }
            </span>,
        ],
        ...(screenshotMode
            ? []
            : [
                [8,
                    'pointer_in_class',
                    props.is_header
                        ? <span className="serif" style={ordinal_style}>Within Type</span>
                        : (
                                <span className="serif" style={{ display: 'flex', ...ordinal_style }}>
                                    <PointerButtonsIndex
                                        ordinal={props.ordinal}
                                        statpath={props.statpath}
                                        type={props.article_type}
                                        total={props.total_count_in_class}
                                    />
                                </span>
                            ),
                ],
                [8,
                    'pointer_overall',
                    props.is_header
                        ? <span className="serif" style={ordinal_style}>Overall</span>
                        : (
                                <span className="serif" style={{ display: 'flex', ...ordinal_style }}>
                                    <PointerButtonsIndex
                                        ordinal={props.overallOrdinal}
                                        statpath={props.statpath}
                                        type="overall"
                                        total={props.total_count_overall}
                                    />
                                </span>
                            ),
                ],
            ] satisfies [number, string, ReactNode][]),
    ]
    const cell_percentages: number[] = []
    const cell_contents = []
    for (const [percentage, column, contents] of cells) {
        if (props.only_columns && !props.only_columns.includes(column)) {
            continue
        }
        cell_percentages.push(percentage)
        cell_contents.push(contents)
    }
    // normalize cell percentages
    const sum = cell_percentages.reduce((a, b) => a + b, 0)
    for (const i of cell_percentages.keys()) {
        cell_percentages[i] = props.total_width * cell_percentages[i] / sum
    }

    const contents = cell_contents.map(
        (content, i) => {
            const sty: React.CSSProperties = { width: `${cell_percentages[i]}%`, padding: '1px' }
            if (props.is_header) {
                sty.textAlign = 'center'
            }
            return (
                <div key={100 * props._idx + i} style={sty}>
                    {content}
                </div>
            )
        },
    )
    return contents
}

export function StatisticName(props: {
    statname: string
    article_type: string
    ordinal: number
    longname: string
    rendered_statname: string
    curr_universe: string
    use_toggle: boolean
}): ReactNode {
    const [expanded, setExpanded] = useSetting(row_expanded_key(props.statname))
    const colors = useColors()
    const link = (
        <a
            style={{ textDecoration: 'none', color: colors.textMain }}
            href={
                statistic_link(
                    props.curr_universe,
                    props.statname, props.article_type, props.ordinal,
                    20, undefined, props.longname,
                )
            }
        >
            {props.rendered_statname}
        </a>
    )
    const screenshot_mode = useScreenshotMode()
    if (props.use_toggle && !screenshot_mode) {
        return (
            <span style={{
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'row',
            }}
            >
                {link}
                <div style={{ marginLeft: '0.3em' }} />
                <div
                    className="expand-toggle"
                    onClick={() => { setExpanded(!expanded) }}
                    style={{
                        cursor: 'pointer', border: `1px solid ${colors.textMain}`,
                        padding: 0, borderRadius: '3px', fontSize: '75%',
                        minWidth: '1.5em', minHeight: '1.5em', textAlign: 'center',
                        lineHeight: '1.2em',
                    }}
                >
                    {expanded ? '-' : '+'}
                </div>
            </span>
        )
    }
    return link
}

export function StatisticRow({ is_header, index, contents }: { is_header: boolean, index: number, contents: React.ReactNode }): React.ReactNode {
    const colors = useColors()
    const style = { ...table_row_style }
    if (is_header) {
        style.borderTop = `1pt solid ${colors.textMain}`
        style.borderBottom = `1pt solid ${colors.textMain}`
        style.fontWeight = 500
    }
    else if (index % 2 === 1) {
        style.backgroundColor = colors.slightlyDifferentBackground
    }
    return (
        <div
            key={index}
            style={{ alignItems: is_header ? 'center' : 'last baseline', ...style }}
        >
            {contents}
        </div>
    )
}

export function Statistic(props: { style?: React.CSSProperties, statname: string, value: number, is_unit: boolean }): ReactNode {
    const [use_imperial] = useSetting('use_imperial')
    const content = (() => {
        {
            const name = props.statname
            let value = props.value
            const is_unit = props.is_unit
            if (name.includes('%') || name.includes('Change')) {
                if (is_unit) {
                    return <span>%</span>
                }
                return <span>{(value * 100).toFixed(2)}</span>
            }
            else if (name.includes('Total') && name.includes('Fatalities')) {
                if (is_unit) {
                    return <span>&nbsp;</span>
                }
                return <span>{value.toFixed(0)}</span>
            }
            else if (name.includes('Fatalities Per Capita')) {
                if (is_unit) {
                    return <span>/100k</span>
                }
                return <span>{(100_000 * value).toFixed(2)}</span>
            }
            else if (name.includes('Density')) {
                const is_imperial = use_imperial
                let unit_name = 'km'
                if (is_imperial) {
                    unit_name = 'mi'
                    value *= 1.60934 * 1.60934
                }
                let places = 2
                if (value > 10) {
                    places = 0
                }
                else if (value > 1) {
                    places = 1
                }
                if (is_unit) {
                    return (
                        <span>
                            /&nbsp;
                            {unit_name}
                            <sup>2</sup>
                        </span>
                    )
                }
                return <span>{value.toFixed(places)}</span>
            }
            else if (name.startsWith('Population')) {
                if (value > 1e9) {
                    if (is_unit) {
                        return <span>B</span>
                    }
                    return <span>{(value / 1e9).toPrecision(3)}</span>
                }
                if (value > 1e6) {
                    if (is_unit) {
                        return <span>m</span>
                    }
                    return <span>{(value / 1e6).toPrecision(3)}</span>
                }
                else if (value > 1e4) {
                    if (is_unit) {
                        return <span>k</span>
                    }
                    return <span>{(value / 1e3).toPrecision(3)}</span>
                }
                else {
                    if (is_unit) {
                        return <span>&nbsp;</span>
                    }
                    return <span>{value.toFixed(0)}</span>
                }
            }
            else if (name === 'Area') {
                const is_imperial = use_imperial
                let unit: string | React.ReactElement = 'null'
                if (is_imperial) {
                    value /= 1.60934 * 1.60934
                    if (value < 1) {
                        unit = <span>acres</span>
                        value *= 640
                    }
                    else {
                        unit = (
                            <span>
                                mi
                                <sup>2</sup>
                            </span>
                        )
                    }
                }
                else {
                    if (value < 0.01) {
                        value *= 1000 * 1000
                        unit = (
                            <span>
                                m
                                <sup>2</sup>
                            </span>
                        )
                    }
                    else {
                        unit = (
                            <span>
                                km
                                <sup>2</sup>
                            </span>
                        )
                    }
                }
                if (is_unit) {
                    return unit
                }
                else {
                    if (value > 100) {
                        return <span>{value.toFixed(0)}</span>
                    }
                    else if (value > 10) {
                        return <span>{value.toFixed(1)}</span>
                    }
                    else if (value > 1) {
                        return <span>{value.toFixed(2)}</span>
                    }
                    else {
                        return <span>{value.toFixed(3)}</span>
                    }
                }
            }
            else if (name.includes('Mean distance')) {
                const is_imperial = use_imperial
                let unit = <span>km</span>
                if (is_imperial) {
                    unit = <span>mi</span>
                    value /= 1.60934
                }
                if (is_unit) {
                    return unit
                }
                else {
                    return <span>{value.toFixed(2)}</span>
                }
            }
            else if (name.includes('Election') || name.includes('Swing')) {
                if (is_unit) {
                    return <span>%</span>
                }
                return <ElectionResult value={value} />
            }
            else if (name.includes('high temp') || name.includes('high heat index') || name.includes('dewpt')) {
                if (is_unit) {
                    return <span>&deg;F</span>
                }
                return <span>{value.toFixed(1)}</span>
            }
            else if (name === 'Mean sunny hours') {
                if (is_unit) {
                    return <span>&nbsp;</span>
                }
                const hours = Math.floor(value)
                const minutes = Math.floor((value - hours) * 60)
                // e.g., 3:05
                return (
                    <span>
                        {hours}
                        :
                        {minutes.toString().padStart(2, '0')}
                    </span>
                )
            }
            else if (name === 'Rainfall' || name === 'Snowfall [rain-equivalent]') {
                const is_imperial = use_imperial
                value *= 100
                let unit = 'cm'
                if (is_imperial) {
                    unit = 'in'
                    value /= 2.54
                }
                if (is_unit) {
                    return (
                        <span>
                            {unit}
                            /yr
                        </span>
                    )
                }
                return <span>{value.toFixed(1)}</span>
            }
            if (is_unit) {
                return <span>&nbsp;</span>
            }
            return <span>{value.toFixed(3)}</span>
        }
    })()

    if (props.style) {
        return <span style={props.style}>{content}</span>
    }
    return content
}

function ElectionResult(props: { value: number }): ReactNode {
    const colors = useColors()
    // check if value is NaN
    if (props.value !== props.value) {
        return <span>N/A</span>
    }
    const value = Math.abs(props.value) * 100
    const places = value > 10 ? 1 : value > 1 ? 2 : value > 0.1 ? 3 : 4
    const text = value.toFixed(places)
    const party = props.value > 0 ? 'D' : 'R'
    const party_color = props.value > 0 ? colors.hueColors.blue : colors.hueColors.red
    return (
        <span style={{ color: party_color }}>
            {party}
            +
            {text}
        </span>
    )
}

export function Ordinal(props: { ordinal: number, total: number, type: string, statpath: string, onReplace?: (newValue: string) => void, simple: boolean }): ReactNode {
    const curr_universe = useUniverse()
    const onNewNumber = async (number: number): Promise<void> => {
        let num = number
        if (num < 0) {
            // -1 -> props.total, -2 -> props.total - 1, etc.
            num = props.total + 1 + num
        }
        if (num > props.total) {
            num = props.total
        }
        if (num <= 0) {
            num = 1
        }
        const data = await load_ordering(curr_universe, props.statpath, props.type)
        props.onReplace?.(data[num - 1])
    }
    const ordinal = props.ordinal
    const total = props.total
    const type = props.type
    if (ordinal > total) {
        return <span></span>
    }
    const en = (
        <EditableNumber
            number={ordinal}
            onNewNumber={onNewNumber}
        />
    )
    if (props.simple) {
        return right_align(en)
    }
    return (
        <div className="serif" style={{ textAlign: 'right' }}>
            {en}
            {' of '}
            {total}
            {' '}
            {display_type(curr_universe, type)}
        </div>
    )
}

function EditableNumber(props: { number: number, onNewNumber: (number: number) => void }): ReactNode {
    /*
     * This code is weird because the `ContentEditable` needs to use refs.
     * See https://www.npmjs.com/package/react-contenteditable
     */

    const contentEditable: React.Ref<HTMLElement> = useRef(null)
    const [html, setHtml] = useState(props.number.toString())

    const handleChange = (evt: ContentEditableEvent): void => {
        setHtml(evt.target.value)
    }

    const handleSubmit = (): void => {
        const number = parseInt(contentEditable.current!.innerText)
        if (!Number.isNaN(number) && number !== props.number) {
            props.onNewNumber(number)
        }
    }

    const selectAll = (): void => {
        setTimeout(() => {
            const range = document.createRange()
            range.selectNodeContents(contentEditable.current!)
            const selection = window.getSelection()
            selection?.removeAllRanges()
            selection?.addRange(range)
        }, 0)
    }

    return (
        <ContentEditable
            className="editable_number"
            innerRef={contentEditable}
            html={html}
            disabled={false}
            onChange={handleChange}
            onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                    handleSubmit()
                    e.preventDefault()
                }
            }}
            onBlur={handleSubmit}
            tagName="span" // Use a custom HTML tag (uses a div by default)
            inputMode="decimal"
            onFocus={selectAll}
        />
    )
};

export function Percentile(props: { ordinal: number, total: number, percentile_by_population: number, simple: boolean }): ReactNode {
    const ordinal = props.ordinal
    const total = props.total
    if (ordinal > total) {
        return <span></span>
    }
    // percentile as an integer
    // used to be keyed by a setting, but now we always use percentile_by_population
    const quantile = props.percentile_by_population
    const percentile = Math.floor(100 * quantile)
    if (props.simple) {
        return right_align(`${percentile.toString()}%`)
    }
    // something like Xth percentile
    let text = `${percentile}th percentile`
    if (percentile % 10 === 1 && percentile % 100 !== 11) {
        text = `${percentile}st percentile`
    }
    else if (percentile % 10 === 2 && percentile % 100 !== 12) {
        text = `${percentile}nd percentile`
    }
    else if (percentile % 10 === 3 && percentile % 100 !== 13) {
        text = `${percentile}rd percentile`
    }
    return <div className="serif" style={{ textAlign: 'right' }}>{text}</div>
}

function PointerButtonsIndex(props: { ordinal: number, statpath: string, type: string, total: number }): ReactNode {
    const curr_universe = useUniverse()
    const get_data = async (): Promise<string[]> => await load_ordering(curr_universe, props.statpath, props.type)
    const [settings_show_historical_cds] = useSetting('show_historical_cds')
    const show_historical_cds = settings_show_historical_cds
    return (
        <span style={{ margin: 'auto' }}>
            <PointerButtonIndex
                text="<"
                get_data={get_data}
                original_pos={props.ordinal}
                direction={-1}
                total={props.total}
                show_historical_cds={show_historical_cds}
            />
            <PointerButtonIndex
                text=">"
                get_data={get_data}
                original_pos={props.ordinal}
                direction={+1}
                total={props.total}
                show_historical_cds={show_historical_cds}
            />
        </span>
    )
}

function PointerButtonIndex(props: { text: string, get_data: () => Promise<string[]>, original_pos: number, direction: number, total: number, show_historical_cds: boolean }): ReactNode {
    const curr_universe = useUniverse()
    const colors = useColors()
    const out_of_bounds = (pos: number): boolean => pos < 0 || pos >= props.total
    const onClick = async (pos: number): Promise<void> => {
        {
            const data = await props.get_data()
            while (!out_of_bounds(pos)) {
                const name = data[pos]
                if (!props.show_historical_cds && is_historical_cd(name)) {
                    pos += props.direction
                    continue
                }
                document.location = article_link(curr_universe, name)
                return
            }
        }
    }

    const buttonStyle: React.CSSProperties = {
        fontFamily: 'Jost, Arial, sans-serif',
        fontSize: '8pt',
        fontWeight: 500,
        textDecoration: 'none',
        color: colors.textPointer,
        padding: '2px 6px 2px 6px',
        borderRadius: '5px',
        borderTop: `1px solid ${colors.borderNonShadow}`,
        borderRight: `1px solid ${colors.borderShadow}`,
        borderBottom: `1px solid ${colors.borderShadow}`,
        borderLeft: `1px solid ${colors.borderNonShadow}`,
    }

    const pos = props.original_pos - 1 + +props.direction
    if (out_of_bounds(pos) || props.original_pos > props.total) {
        return <span style={buttonStyle}>&nbsp;&nbsp;</span>
    }
    else {
        return (
            <a href="#" style={buttonStyle} onClick={() => onClick(pos)}>{props.text}</a>
        )
    }
}

function right_align(value: React.ReactNode): ReactNode {
    return (
        <span
            style={{ float: 'right', marginRight: '5px' }}
        >
            {value}
        </span>
    )
}
