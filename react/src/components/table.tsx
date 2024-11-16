import React, { CSSProperties, ReactNode, useEffect, useRef, useState } from 'react'
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
import { useScreenshotMode } from './screenshot'

export type ColumnIdentifier = 'statname' | 'statval' | 'statval_unit' | 'statistic_percentile' | 'statistic_ordinal' | 'pointer_in_class' | 'pointer_overall'

const table_row_style: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
}

export function TableHeaderContainer({ children }: { children: ReactNode }): ReactNode {
    const colors = useColors()

    const style = {
        ...table_row_style,
        borderTop: `1pt solid ${colors.textMain}`,
        borderBottom: `1pt solid ${colors.textMain}`,
        fontWeight: 500,
        alignItems: 'center',
    }
    return (
        <div
            style={style}
        >
            {children}
        </div>
    )
}

interface ColumnLayoutProps {
    cells: {
        columnIdentifier: ColumnIdentifier
        widthPercentage: number
        content: ReactNode
        textAlign: React.CSSProperties['textAlign']
    }[]
    onlyColumns?: string[]
    totalWidth: number
}

// Lays out column content
function ColumnLayout(props: ColumnLayoutProps): JSX.Element[] {
    const cellPercentages: number[] = []
    const cellContents = []
    for (const { widthPercentage, columnIdentifier, content, textAlign } of props.cells) {
        if (props.onlyColumns && !props.onlyColumns.includes(columnIdentifier)) {
            continue
        }
        cellPercentages.push(widthPercentage)
        cellContents.push({ content, textAlign })
    }

    // normalize cell percentages
    const sum = cellPercentages.reduce((a, b) => a + b, 0)
    for (const i of cellPercentages.keys()) {
        cellPercentages[i] = props.totalWidth * cellPercentages[i] / sum
    }

    const contents = cellContents.map(
        ({ content, textAlign }, i) => {
            const sty: React.CSSProperties = { width: `${cellPercentages[i]}%`, padding: '1px', textAlign }
            return (
                <div key={i} style={sty}>
                    {content}
                </div>
            )
        },
    )
    return contents
}

export function StatisticHeaderCells(props: { simpleOrdinals: boolean, totalWidth: number, onlyColumns?: ColumnIdentifier[] }): ReactNode {
    const colors = useColors()
    const ordinal_style: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 400,
        color: colors.ordinalTextColor,
        margin: 0,
        textAlign: 'right',
    }

    const screenshotMode = useScreenshotMode()

    const cells = [
        {
            columnIdentifier: 'statname',
            widthPercentage: 31,
            content: (
                <span className="serif value" key="statistic">
                    Statistic
                </span>
            ),
            textAlign: 'center',
        },
        {
            columnIdentifier: 'statval',
            widthPercentage: 15 + 10,
            content: (
                <span className="serif value">
                    Value
                </span>
            ),
            textAlign: 'center',
        },
        {
            widthPercentage: props.simpleOrdinals ? 7 : 17,
            columnIdentifier: 'statistic_percentile',
            content: (
                <span className="serif" key="ordinal" style={ordinal_style}>
                    {
                        (props.simpleOrdinals ? right_align('%ile') : 'Percentile')

                    }
                </span>
            ),
            textAlign: 'center',
        },
        {
            widthPercentage: props.simpleOrdinals ? 8 : 25,
            columnIdentifier: 'statistic_ordinal',
            content: (
                <span className="serif" key="statistic_ordinal" style={ordinal_style}>
                    {
                        (props.simpleOrdinals ? right_align('Ord') : 'Ordinal')
                    }
                </span>
            ),
            textAlign: 'center',
        },
        ...(screenshotMode
            ? []
            : [
                {
                    widthPercentage: 8,
                    columnIdentifier: 'pointer_in_class',
                    content: <span className="serif" style={ordinal_style}>Within Type</span>,
                    textAlign: 'center',

                },
                {
                    widthPercentage: 8,
                    columnIdentifier: 'pointer_overall',
                    content: <span className="serif" style={ordinal_style}>Overall</span>,
                    textAlign: 'center',
                },
            ] satisfies ColumnLayoutProps['cells']),
    ] satisfies ColumnLayoutProps['cells']

    return (
        <ColumnLayout
            cells={cells}
            totalWidth={props.totalWidth}
            onlyColumns={props.onlyColumns}
        />
    )
}

export function StatisticRowCells(props: {
    totalWidth: number
    longname: string
    statisticStyle?: CSSProperties
    row: ArticleRow
    onlyColumns?: string[]
    onNavigate?: (newArticle: string) => void
    simpleOrdinals: boolean
}): ReactNode {
    const currentUniverse = useUniverse()
    const colors = useColors()
    const ordinal_style: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 400,
        color: colors.ordinalTextColor,
        margin: 0,
    }

    const screenshotMode = useScreenshotMode()

    const cells = [
        {
            widthPercentage: 31,
            columnIdentifier: 'statname',
            content: (
                <span className="serif value">
                    <StatisticName
                        row={props.row}
                        longname={props.longname}
                        curr_universe={currentUniverse}
                    />
                </span>
            ),
            textAlign: 'left',
        },
        {
            widthPercentage: 15,
            columnIdentifier: 'statval',
            content: (
                <span className="serif value testing-statistic-value">
                    <Statistic
                        statname={props.row.statname}
                        value={props.row.statval}
                        is_unit={false}
                        style={props.statisticStyle ?? {}}
                    />
                </span>
            ),
            textAlign: 'right',
        },
        {
            widthPercentage: 10,
            columnIdentifier: 'statval_unit',
            content: (
                <div className="value_unit">
                    <span className="serif value">
                        <Statistic
                            statname={props.row.statname}
                            value={props.row.statval}
                            is_unit={true}
                        />
                    </span>
                </div>
            ),
            textAlign: 'right',
        },
        {
            widthPercentage: props.simpleOrdinals ? 7 : 17,
            columnIdentifier: 'statistic_percentile',
            content: (
                <span className="serif" style={ordinal_style}>
                    <Percentile
                        ordinal={props.row.ordinal}
                        total={props.row.total_count_in_class}
                        percentile_by_population={props.row.percentile_by_population}
                        simpleOrdinals={props.simpleOrdinals}
                    />
                </span>
            ),
            textAlign: 'right',
        },
        {
            widthPercentage: props.simpleOrdinals ? 8 : 25,
            columnIdentifier: 'statistic_ordinal',
            content: (
                <span className="serif" style={ordinal_style}>
                    <Ordinal
                        ordinal={props.row.ordinal}
                        total={props.row.total_count_in_class}
                        type={props.row.articleType}
                        statpath={props.row.statpath}
                        simpleOrdinals={props.simpleOrdinals}
                        onNavigate={props.onNavigate}
                    />
                </span>
            ),
            textAlign: 'right',
        },
        ...(screenshotMode
            ? []
            : [
                {
                    widthPercentage: 8,
                    columnIdentifier: 'pointer_in_class',
                    content: (
                        <span key="pointer_in_class" className="serif" style={{ display: 'flex', ...ordinal_style }}>
                            <PointerButtonsIndex
                                ordinal={props.row.ordinal}
                                statpath={props.row.statpath}
                                type={props.row.articleType}
                                total={props.row.total_count_in_class}
                            />
                        </span>
                    ),
                    textAlign: 'right',
                },
                {
                    widthPercentage: 8,
                    columnIdentifier: 'pointer_overall',
                    content: (
                        <span className="serif" style={{ display: 'flex', ...ordinal_style }}>
                            <PointerButtonsIndex
                                ordinal={props.row.overallOrdinal}
                                statpath={props.row.statpath}
                                type="overall"
                                total={props.row.total_count_overall}
                            />
                        </span>
                    ),
                    textAlign: 'right',
                },
            ] satisfies ColumnLayoutProps['cells']),
    ] satisfies ColumnLayoutProps['cells']

    return (
        <ColumnLayout
            cells={cells}
            totalWidth={props.totalWidth}
            onlyColumns={props.onlyColumns}
        />
    )
}

function StatisticName(props: {
    row: ArticleRow
    longname: string
    curr_universe: string
}): ReactNode {
    const [expanded, setExpanded] = useSetting(row_expanded_key(props.row.statpath))
    const colors = useColors()
    const link = (
        <a
            style={{ textDecoration: 'none', color: colors.textMain }}
            href={
                statistic_link(
                    props.curr_universe,
                    props.row.statname, props.row.articleType, props.row.ordinal,
                    20, undefined, props.longname,
                )
            }
        >
            {props.row.rendered_statname}
        </a>
    )
    const screenshot_mode = useScreenshotMode()
    if (props.row.extra_stat !== undefined && !screenshot_mode) {
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

export function TableRowContainer({ children, index }: { children: React.ReactNode, index: number }): React.ReactNode {
    const colors = useColors()
    const style: React.CSSProperties = {
        ...table_row_style,
        backgroundColor: index % 2 === 1 ? colors.slightlyDifferentBackground : undefined,
        alignItems: 'last baseline',
    }
    return (
        <div
            style={style}
        >
            {children}
        </div>
    )
}

export function Statistic(props: { style?: React.CSSProperties, statname: string, value: number, is_unit: boolean }): ReactNode {
    const [use_imperial] = useSetting('use_imperial')
    const [temperatureUnit] = useSetting('temperature_unit')
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
                let unit_name = 'km'
                if (use_imperial) {
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
                let unit: string | React.ReactElement = 'null'
                if (use_imperial) {
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
                let unit = <span>km</span>
                if (use_imperial) {
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
                let unit = <span>&deg;F</span>
                if (temperatureUnit === 'celsius') {
                    unit = <span>&deg;C</span>
                    value = (value - 32) * (5 / 9)
                }
                if (is_unit) {
                    return unit
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
                value *= 100
                let unit = 'cm'
                if (use_imperial) {
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

function Ordinal(props: {
    ordinal: number
    total: number
    type: string
    statpath: string
    simpleOrdinals: boolean
    onNavigate?: (newArticle: string) => void
}): ReactNode {
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
        props.onNavigate?.(data[num - 1])
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
    if (props.simpleOrdinals) {
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

    // Otherwise, this component can display the wrong number when props change
    useEffect(() => {
        setHtml(props.number.toString())
    }, [props.number])

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

export function Percentile(props: {
    ordinal: number
    total: number
    percentile_by_population: number
    simpleOrdinals: boolean
}): ReactNode {
    const ordinal = props.ordinal
    const total = props.total
    if (ordinal > total) {
        return <span></span>
    }
    // percentile as an integer
    // used to be keyed by a setting, but now we always use percentile_by_population
    const quantile = props.percentile_by_population
    const percentile = Math.floor(100 * quantile)
    if (props.simpleOrdinals) {
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

// Lacks some customization since its column is not show in the comparison view
function PointerButtonsIndex(props: { ordinal: number, statpath: string, type: string, total: number }): ReactNode {
    const curr_universe = useUniverse()
    const get_data = async (): Promise<string[]> => await load_ordering(curr_universe, props.statpath, props.type)
    return (
        <span style={{ margin: 'auto' }}>
            <PointerButtonIndex
                get_data={get_data}
                original_pos={props.ordinal}
                direction={-1}
                total={props.total}
            />
            <PointerButtonIndex
                get_data={get_data}
                original_pos={props.ordinal}
                direction={+1}
                total={props.total}
            />
        </span>
    )
}

function PointerButtonIndex(props: {
    get_data: () => Promise<string[]>
    original_pos: number
    direction: -1 | 1
    total: number
}): ReactNode {
    const curr_universe = useUniverse()
    const colors = useColors()
    const [show_historical_cds] = useSetting('show_historical_cds')
    const out_of_bounds = (pos: number): boolean => pos < 0 || pos >= props.total
    const onClick = async (pos: number): Promise<void> => {
        {
            const data = await props.get_data()
            while (!out_of_bounds(pos)) {
                const name = data[pos]
                if (!show_historical_cds && is_historical_cd(name)) {
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
        backgroundColor: colors.background,
    }

    const pos = props.original_pos - 1 + +props.direction
    const disabled = out_of_bounds(pos) || props.original_pos > props.total

    const buttonRef = useRef<HTMLButtonElement>(null) // Need the ref otherwise the mouse enter and leave events can be sent to the wrong elem

    return (
        <button
            ref={buttonRef}
            disabled={disabled}
            style={buttonStyle}
            onClick={() => onClick(pos)}
            onMouseEnter={() => {
                buttonRef.current!.style.backgroundColor = colors.slightlyDifferentBackgroundFocused
            }}
            onMouseLeave={() => {
                buttonRef.current!.style.backgroundColor = colors.background
            }}
        >
            <PointerArrow direction={props.direction} disabled={disabled} />
        </button>
    )
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

export function PointerArrow({ direction, disabled }: { direction: -1 | 1, disabled: boolean }): ReactNode {
    const spanStyle: React.CSSProperties = {
        transform: `scale(${direction * -1}, 1)`, // Because the right unicode arrow is weird
        display: 'inline-block',
        visibility: disabled ? 'hidden' : 'visible',
    }

    return (
        <span style={spanStyle}>
            {'◁\ufe0e'}
        </span>
    )
}
