import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import React, { CSSProperties, ReactNode, useContext, useRef, useState } from 'react'

import { ArticleOrderingListInternal, loadOrdering } from '../load_json'
import './table.css'
import { Navigator } from '../navigation/Navigator'
import { statisticDescriptor } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { colorFromCycle, useColors } from '../page_template/colors'
import { MobileArticlePointers, rowExpandedKey, useSetting } from '../page_template/settings'
import { useUniverse } from '../universe'
import { isHistoricalCD } from '../utils/is_historical'
import { useComparisonHeadStyle, useMobileLayout } from '../utils/responsive'
import { displayType } from '../utils/text'
import { useTranspose } from '../utils/transpose'

import { Icon } from './Icon'
import { Percentile, Statistic } from './display-stats'
import { EditableNumber } from './editable-field'
import { ArticleRow, Disclaimer, FirstLastStatus } from './load-article'
import { PointerArrow, useSinglePointerCell } from './pointer-cell'
import { useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { ArrowUpOrDown } from './statistic-panel'
import { Cell, CellSpec, ComparisonLongnameCellProps, TopLeftHeaderProps, StatisticNameCellProps } from './supertable'

export type ColumnIdentifier = 'statval' | 'statval_unit' | 'statistic_percentile' | 'statistic_ordinal' | 'pointer_in_class' | 'pointer_overall'

export const leftBarMargin = 0.02

const tableRowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
}

export function TableHeaderContainer({ children }: { children: ReactNode }): ReactNode {
    const colors = useColors()

    const style = {
        ...tableRowStyle,
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
        style: CSSProperties
    }[]
    onlyColumns?: string[]
    blankColumns?: string[]
    totalWidth: number
}

// Lays out column content
export function ColumnLayout(props: ColumnLayoutProps): JSX.Element[] {
    const cellPercentages: number[] = []
    const cellContents = []
    for (const { widthPercentage, columnIdentifier, content, style } of props.cells) {
        if (props.onlyColumns && !props.onlyColumns.includes(columnIdentifier)) {
            continue
        }
        cellPercentages.push(widthPercentage)
        if (props.blankColumns?.includes(columnIdentifier)) {
            cellContents.push({ content: <span></span>, style })
        }
        else {
            cellContents.push({ content, style })
        }
    }

    // normalize cell percentages
    const sum = cellPercentages.reduce((a, b) => a + b, 0)
    for (const i of cellPercentages.keys()) {
        cellPercentages[i] = props.totalWidth * cellPercentages[i] / sum
    }

    const contents = cellContents.map(
        ({ content, style }, i) => {
            const sty: React.CSSProperties = { width: `${cellPercentages[i]}%`, padding: '1px', ...style }
            return (
                <div key={i} style={sty}>
                    {content}
                </div>
            )
        },
    )
    return contents
}

export interface SuperHeaderHorizontalProps {
    headerSpecs: (CellSpec & { highlightIndex?: number })[]
    widthsEach: number[]
    showBottomBar: boolean
    leftSpacerWidth: number
    groupNames?: (string | undefined)[]
}

export function SuperHeaderHorizontal(props: SuperHeaderHorizontalProps): ReactNode {
    const colors = useColors()
    const barHeight = '5px'
    const bars = (backgroundColor: (i: number) => string | undefined): ReactNode => {
        return (
            <div style={{ display: 'flex' }}>
                <div style={{ width: `${props.leftSpacerWidth}%`, height: barHeight }} />
                {Array.from({ length: props.headerSpecs.length }).map(
                    (_, i) => (
                        <div
                            key={`bar_${i}`}
                            style={{
                                width: `${props.widthsEach[i]}%`,
                                height: barHeight,
                                backgroundColor: backgroundColor(i),
                            }}
                        />
                    ),
                )}
            </div>
        )
    }

    const getBarColor = (idx: number): string | undefined => {
        const spec = props.headerSpecs[idx]
        return spec.highlightIndex !== undefined ? colorFromCycle(colors.hueColors, spec.highlightIndex) : undefined
    }
    return (
        <>
            {props.groupNames && <SuperHeaderGroupNames leftSpacerWidth={props.leftSpacerWidth} groupNames={props.groupNames} widthsEach={props.widthsEach} />}
            {bars(getBarColor)}
            <div style={{ display: 'flex' }}>
                <div style={{ width: `${props.leftSpacerWidth}%` }} />
                {props.headerSpecs.map((cellSpec, idx) => <Cell key={idx} {...cellSpec} width={props.widthsEach[idx]} />)}
            </div>
            {props.showBottomBar && bars(getBarColor)}
        </>
    )
}

export function SuperHeaderGroupNames(props: { leftSpacerWidth: number, groupNames: (string | undefined)[], widthsEach: number[] }): ReactNode {
    if (props.groupNames.every(groupName => groupName === undefined)) {
        return null
    }
    const sizes = []
    const names: (string | undefined)[] = []
    for (const [idx, groupName] of props.groupNames.entries()) {
        if (idx === 0 || groupName !== props.groupNames[idx - 1]) {
            sizes.push(props.widthsEach[idx])
            names.push(groupName)
        }
        else {
            sizes[sizes.length - 1] += props.widthsEach[idx]
        }
    }

    return (
        <div style={{ display: 'flex' }} className="serif value">
            <div style={{ width: `${props.leftSpacerWidth}%` }} />
            {sizes.map((size, idx) => <div key={idx} style={{ width: `${size}%`, textAlign: 'center' }}>{names[idx]}</div>)}
        </div>
    )
}

export function ComparisonTopLeftHeader(props: TopLeftHeaderProps & { width: number }): ReactNode {
    return (
        <>
            <ComparisonColorBar key="color" highlightIndex={undefined} />
            <TopLeftHeader {...props} width={props.width - leftBarMargin * 100} />
        </>
    )
}

export function TopLeftHeader(props: TopLeftHeaderProps & { width: number }): ReactNode {
    return (
        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', padding: '1px', width: `${props.width}%` }}>
            <span className="serif value" key="statistic">
                {props.statNameOverride ?? 'Statistic'}
            </span>
        </div>
    )
}

export function MainHeaderRow(props: {
    topLeftSpec: CellSpec
    topLeftWidth: number
    columnWidth: number
    onlyColumns: ColumnIdentifier[]
    statNameOverride?: string
    extraSpaceRight: number[]
    simpleOrdinals: boolean
}): ReactNode {
    return (
        <>
            <Cell {...props.topLeftSpec} width={props.topLeftWidth} />
            {props.extraSpaceRight.map((_, columnIndex) => (
                <StatisticHeaderCells
                    key={`headerCells_${columnIndex}`}
                    onlyColumns={props.onlyColumns}
                    simpleOrdinals={props.simpleOrdinals}
                    totalWidth={props.columnWidth}
                    extraSpaceRight={props.extraSpaceRight[columnIndex] ?? 0}
                />
            ))}
        </>
    )
}

export function StatisticHeaderCells(props: { simpleOrdinals: boolean, totalWidth: number, onlyColumns?: ColumnIdentifier[], statNameOverride?: string, extraSpaceRight?: number }): ReactNode {
    const colors = useColors()
    const ordinalStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 400,
        color: colors.ordinalTextColor,
        margin: 0,
    }

    const cells = [
        {
            columnIdentifier: 'statval',
            widthPercentage: 15 + 10,
            content: (
                <span className="serif value">
                    Value
                </span>
            ),
            style: { textAlign: 'center', display: 'flex', justifyContent: 'center' },
        },
        {
            widthPercentage: props.simpleOrdinals ? 7 : 17,
            columnIdentifier: 'statistic_percentile',
            content: (
                <span className="serif" key="ordinal" style={ordinalStyle}>
                    {
                        (props.simpleOrdinals ? '%ile' : 'Percentile')

                    }
                </span>
            ),
            style: { textAlign: 'center', display: 'flex', justifyContent: props.simpleOrdinals ? 'flex-end' : 'center', marginRight: props.simpleOrdinals ? '5px' : undefined },
        },
        {
            widthPercentage: props.simpleOrdinals ? 8 : 25,
            columnIdentifier: 'statistic_ordinal',
            content: (
                <span className="serif" key="statistic_ordinal" style={ordinalStyle}>
                    {
                        (props.simpleOrdinals ? 'Ord' : 'Ordinal')
                    }
                </span>
            ),
            style: { textAlign: 'center', display: 'flex', justifyContent: props.simpleOrdinals ? 'flex-end' : 'center', marginRight: props.simpleOrdinals ? '5px' : undefined },
        },
        ...PointerHeaderCells({ ordinalStyle }),
    ] satisfies ColumnLayoutProps['cells']

    return (
        <>
            <ColumnLayout
                cells={cells}
                totalWidth={props.totalWidth}
                onlyColumns={props.onlyColumns}
            />
            <div style={{ width: `${props.extraSpaceRight ?? 0}%` }} />
        </>
    )
}

function PointerHeaderCells(props: { ordinalStyle: CSSProperties }): ColumnLayoutProps['cells'] {
    const pointerInClassCell: ColumnLayoutProps['cells'][number] = {
        widthPercentage: 8,
        columnIdentifier: 'pointer_in_class',
        content: <span className="serif" style={props.ordinalStyle}>Within Type</span>,
        style: { textAlign: 'center', display: 'flex', justifyContent: 'center' },

    }
    const pointerOverallCell: ColumnLayoutProps['cells'][number] = {
        widthPercentage: 8,
        columnIdentifier: 'pointer_overall',
        content: <span className="serif" style={props.ordinalStyle}>Overall</span>,
        style: { textAlign: 'center', display: 'flex', justifyContent: 'center' },
    }

    // Must be outside branch because uses hooks
    const selectorCell = PointerHeaderSelectorCell()

    const screenshotMode = useScreenshotMode()
    const singlePointerCell = useSinglePointerCell()

    if (screenshotMode) {
        return []
    }
    else if (singlePointerCell) {
        return [selectorCell]
    }
    else {
        return [pointerInClassCell, pointerOverallCell]
    }
}

function PointerHeaderSelectorCell(): ColumnLayoutProps['cells'][number] {
    const [preferredPointerCell, setPreferredPointerCell] = useSetting('mobile_article_pointers')

    const selectWidth = 'clamp(45px, 100%, 65px)'
    const arrowWidth = '12px'

    const selectStyle: CSSProperties = {
        height: '2lh',
        whiteSpace: 'wrap',
        width: selectWidth,
        textAlign: 'left',
        appearance: 'none',
        padding: '0px 1px',
    }

    const arrowStyle: CSSProperties = {
        position: 'absolute',
        left: `calc((max(0px, 100% - ${selectWidth}) / 2) + ${selectWidth} - (${arrowWidth}))`,
        pointerEvents: 'none',
        height: arrowWidth,
        width: arrowWidth,
        fontSize: arrowWidth,
        bottom: `5px`,
    }

    return {
        widthPercentage: 8,
        columnIdentifier: preferredPointerCell,
        content: (
            <>
                <select
                    style={selectStyle}
                    value={preferredPointerCell}
                    onChange={(e) => { setPreferredPointerCell(e.target.value as MobileArticlePointers) }}
                    data-test-id="tablePointerSelect"
                >
                    <option value="pointer_in_class">Within Type</option>
                    <option value="pointer_overall">Overall</option>
                </select>
                <span style={arrowStyle}>
                    {'▼\ufe0e'}
                </span>
            </>
        ),
        style: {
            textAlign: 'center',
            position: 'relative',
        },
    }
}

export function StatisticRowCells(props: {
    width: number
    longname: string
    statisticStyle?: CSSProperties
    row: ArticleRow
    onlyColumns?: string[]
    blankColumns?: string[]
    onNavigate?: (newArticle: string) => void
    simpleOrdinals: boolean
    extraSpaceRight?: number
}): ReactNode {
    const colors = useColors()
    const ordinalStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: 400,
        color: colors.ordinalTextColor,
        margin: 0,
    }

    const cells = [
        {
            widthPercentage: 15,
            columnIdentifier: 'statval',
            content: (
                <span className="serif value testing-statistic-value">
                    <Statistic
                        statname={props.row.statname}
                        value={props.row.statval}
                        isUnit={false}
                        style={props.statisticStyle ?? {}}
                    />
                </span>
            ),
            style: { textAlign: 'right' },
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
                            isUnit={true}
                        />
                    </span>
                </div>
            ),
            style: { textAlign: 'right' },
        },
        {
            widthPercentage: props.simpleOrdinals ? 7 : 17,
            columnIdentifier: 'statistic_percentile',
            content: (
                <span className="serif" style={ordinalStyle}>
                    <Percentile
                        ordinal={props.row.ordinal}
                        total={props.row.totalCountInClass}
                        percentileByPopulation={props.row.percentileByPopulation}
                        simpleOrdinals={props.simpleOrdinals}
                    />
                </span>
            ),
            style: { textAlign: 'right' },
        },
        {
            widthPercentage: props.simpleOrdinals ? 8 : 25,
            columnIdentifier: 'statistic_ordinal',
            content: (
                <span className="serif" style={ordinalStyle}>
                    <Ordinal
                        ordinal={props.row.ordinal}
                        total={props.row.totalCountInClass}
                        type={props.row.articleType}
                        statpath={props.row.statpath}
                        simpleOrdinals={props.simpleOrdinals}
                        onNavigate={props.onNavigate}
                    />
                </span>
            ),
            style: { textAlign: 'right' },
        },
        ...PointerRowCells({ ordinalStyle, row: props.row, longname: props.longname }),
    ] satisfies ColumnLayoutProps['cells']

    return (
        <>
            <ColumnLayout
                cells={cells}
                totalWidth={props.width}
                onlyColumns={props.onlyColumns}
                blankColumns={props.blankColumns}
            />
            <div style={{ width: `${props.extraSpaceRight}%` }} />
        </>
    )
}

function PointerRowCells(props: { ordinalStyle: CSSProperties, row: ArticleRow, longname: string }): ColumnLayoutProps['cells'] {
    const screenshotMode = useScreenshotMode()

    const singlePointerCell = useSinglePointerCell()
    const [preferredPointerCell] = useSetting('mobile_article_pointers')

    const pointerInClassCell: ColumnLayoutProps['cells'][number] = {
        widthPercentage: 8,
        columnIdentifier: 'pointer_in_class',
        content: (
            <span key="pointer_in_class" className="serif" style={{ display: 'flex', ...props.ordinalStyle }}>
                <PointerButtonsIndex
                    ordinal={props.row.ordinal}
                    statpath={props.row.statpath}
                    type={props.row.articleType}
                    total={props.row.totalCountInClass}
                    longname={props.longname}
                />
            </span>
        ),
        style: { textAlign: 'right' },
    }

    const pointerOverallCell: ColumnLayoutProps['cells'][number] = {
        widthPercentage: 8,
        columnIdentifier: 'pointer_overall',
        content: (
            <span className="serif" style={{ display: 'flex', ...props.ordinalStyle }}>
                <PointerButtonsIndex
                    statpath={props.row.statpath}
                    type="overall"
                    total={props.row.totalCountOverall}
                    longname={props.longname}
                    overallFirstLast={props.row.overallFirstLast}
                />
            </span>
        ),
        style: { textAlign: 'right' },
    }

    if (screenshotMode) {
        return []
    }
    else if (singlePointerCell) {
        switch (preferredPointerCell) {
            case 'pointer_in_class':
                return [pointerInClassCell]
            case 'pointer_overall':
                return [pointerOverallCell]
        }
    }
    else {
        return [pointerInClassCell, pointerOverallCell]
    }
}

function articleStatnameButtonStyle(colors: Colors): React.CSSProperties {
    return {
        cursor: 'pointer', border: `1px solid ${colors.textMain}`,
        padding: 0, borderRadius: '3px', fontSize: '75%',
        minWidth: '1.5em', minHeight: '1.5em', textAlign: 'center',
        lineHeight: '1.2em',
    }
}

const manipulationButtonHeight = '24px'

function ManipulationButton({ color: buttonColor, onClick, text, image }: { color: string, onClick: () => void, text: string, image: string }): ReactNode {
    const isMobile = useMobileLayout()
    const isTranspose = useTranspose()
    const colors = useColors()

    return (
        <div
            style={{
                height: manipulationButtonHeight,
                lineHeight: manipulationButtonHeight,
                cursor: 'pointer',
                paddingLeft: '0.5em', paddingRight: '0.5em',
                borderRadius: '0.25em',
                verticalAlign: 'middle',
                backgroundColor: buttonColor,
            }}
            className={`serif manipulation-button-${text}`}
            onClick={onClick}
        >
            {!(isMobile && isTranspose) ? text : <Icon src={image} size={manipulationButtonHeight} color={colors.textMain} />}
        </div>
    )
}

export function HeadingDisplay({ longname, includeDelete, onDelete, onReplace, manipulationJustify, sharedTypeOfAllArticles }: {
    longname: string
    includeDelete: boolean
    onDelete: () => void
    onReplace: (q: string) => ReturnType<Navigator['link']>
    manipulationJustify: CSSProperties['justifyContent']
    sharedTypeOfAllArticles: string | null | undefined
}): ReactNode {
    const colors = useColors()
    const [isEditing, setIsEditing] = React.useState(false)
    const currentUniverse = useUniverse()
    const comparisonHeadStyle = useComparisonHeadStyle()

    const manipulationButtons = (
        <div style={{ height: manipulationButtonHeight }}>
            <div style={{ display: 'flex', justifyContent: manipulationJustify, height: '100%' }}>
                <ManipulationButton color={colors.unselectedButton} onClick={() => { setIsEditing(!isEditing) }} text="replace" image="/replace.png" />
                {!includeDelete
                    ? null
                    : (
                            <>
                                <div style={{ width: '5px' }} />
                                <ManipulationButton color={colors.unselectedButton} onClick={onDelete} text="delete" image="/close.png" />
                            </>
                        )}
                <div style={{ width: '5px' }} />
            </div>
        </div>
    )

    const screenshotMode = useScreenshotMode()

    const navContext = useContext(Navigator.Context)

    return (
        <div>
            {screenshotMode ? undefined : manipulationButtons}
            <div style={{ height: '5px' }} />
            <a
                className="serif"
                {
                    ...navContext.link({
                        kind: 'article',
                        longname,
                        universe: currentUniverse,
                    }, { scroll: { kind: 'position', top: 0 } })
                }
                style={{ textDecoration: 'none' }}
            >
                <div style={useComparisonHeadStyle()}>{longname}</div>
            </a>
            {isEditing
                ? (
                        <SearchBox
                            autoFocus={true}
                            style={{ ...comparisonHeadStyle, width: '100%' }}
                            placeholder="Replacement"
                            onChange={() => {
                                setIsEditing(false)
                            }}
                            link={onReplace}
                            prioritizeArticleType={sharedTypeOfAllArticles ?? undefined}
                        />
                    )
                : null}
        </div>
    )
}

export function ComparisonLongnameCell(props: ComparisonLongnameCellProps & { width: number }): ReactNode {
    const currentUniverse = useUniverse()
    const navContext = useContext(Navigator.Context)

    const haveColorbar = props.transpose && props.highlightIndex !== undefined
    const width = props.width - (haveColorbar ? 2 * 100 * leftBarMargin : 0)

    const bar = (): ReactNode => props.transpose && props.highlightIndex !== undefined && (
        <ComparisonColorBar highlightIndex={props.highlightIndex} />
    )
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.articleId ?? 'dummy' })

    let extraStyle: CSSProperties = {}
    let extraProps: React.HTMLAttributes<HTMLDivElement> & { ref?: (node: HTMLElement | null) => void } = { }
    if (props.draggable && props.articleId) {
        extraStyle = {
            transform: CSS.Transform.toString(transform),
            transition: isDragging ? transition : 'none',
            opacity: isDragging ? 0.5 : 1,
            touchAction: 'none',
        }
        extraProps = { ref: setNodeRef, ...attributes, ...listeners }
    }

    return (
        <>
            {bar()}
            <div
                key={`heading_${props.articleIndex}`}
                style={{ width: `${width}%`, ...extraStyle }}
                {...extraProps}
            >
                <HeadingDisplay
                    longname={props.articles[props.articleIndex].longname}
                    includeDelete={props.articles.length > 1}
                    onDelete={() => {
                        void navContext.navigate({
                            kind: 'comparison',
                            universe: currentUniverse,
                            longnames: props.names.filter((_, index) => index !== props.articleIndex),
                        }, { history: 'push', scroll: { kind: 'none' } })
                    }}
                    onReplace={x =>
                        navContext.link({
                            kind: 'comparison',
                            universe: currentUniverse,
                            longnames: props.names.map((value, index) => index === props.articleIndex ? x : value),
                        }, { scroll: { kind: 'none' } })}
                    manipulationJustify={props.transpose ? 'center' : 'flex-end'}
                    sharedTypeOfAllArticles={props.sharedTypeOfAllArticles}
                />
            </div>
            {bar()}
        </>
    )
}

export function StatisticNameCell(props: StatisticNameCellProps & { width: number }): ReactNode {
    const haveColorbar = !props.transpose && props.highlightIndex !== undefined
    const width = props.width - (haveColorbar ? 100 * leftBarMargin : 0)

    return (
        <>
            {haveColorbar && (
                <ComparisonColorBar highlightIndex={props.highlightIndex} />
            )}
            <div
                key={`statName_${props.row.statpath}`}
                style={{ width: `${width}%`, padding: '1px', paddingLeft: props.isIndented ? '1em' : '1px', textAlign: props.center ? 'center' : undefined }}
            >
                <span className="serif value" style={{ display: 'flex', alignItems: 'center', justifyContent: props.center ? 'center' : 'flex-start', gap: '0.25em' }}>
                    <StatisticName
                        row={props.row}
                        longname={props.longname}
                        currentUniverse={props.currentUniverse}
                        center={props.center}
                        displayName={props.displayName ?? props.row.renderedStatname}
                    />
                    {props.onSort && (
                        <span 
                            style={{ cursor: 'pointer', fontSize: '0.8em' }}
                            onClick={props.onSort}
                        >
                            <ArrowUpOrDown direction={props.sortDirection === 'asc' ? 'up' : props.sortDirection === 'desc' ? 'down' : 'both'} />
                        </span>
                    )}
                </span>
            </div>
        </>
    )
}

export function StatisticName(props: {
    row: ArticleRow
    longname: string
    currentUniverse: string
    center?: boolean
    displayName: string
}): ReactNode {
    const [expanded, setExpanded] = useSetting(rowExpandedKey(props.row.statpath))
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    const link = (
        <a
            style={{ textDecoration: 'none', color: colors.textMain }}
            {
                ...navContext.link(statisticDescriptor({
                    universe: props.currentUniverse,
                    statname: props.row.statname,
                    articleType: props.row.articleType,
                    start: props.row.ordinal,
                    amount: 20,
                    order: 'descending',
                    highlight: props.longname,
                }), { scroll: { kind: 'position', top: 0 } })
            }
            data-test-id="statistic-link"
        >
            {props.displayName}
        </a>
    )
    const screenshotMode = useScreenshotMode()
    const elements = [link]
    if (props.row.extraStat !== undefined && !screenshotMode) {
        elements.push(
            <div
                className="expand-toggle"
                onClick={() => { setExpanded(!expanded) }}
                style={articleStatnameButtonStyle(colors)}
            >
                {expanded ? '-' : '+'}
            </div>,
        )
    }
    if (props.row.disclaimer !== undefined) {
        elements.push(<StatisticNameDisclaimer disclaimer={props.row.disclaimer} />)
    }
    if (elements.length > 1) {
        const paddedElements = [elements[0]]
        for (let i = 1; i < elements.length; i++) {
            paddedElements.push(<div key={i} style={{ marginLeft: '0.3em' }} />)
            paddedElements.push(elements[i])
        }
        return (
            <span style={{
                display: 'flex',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: props.center ? 'center' : undefined,
            }}
            >
                {...paddedElements}
            </span>
        )
    }
    return link
}

export function ComparisonColorBar({ highlightIndex }: { highlightIndex: number | undefined }): ReactNode {
    const colors = useColors()

    return (
        <div
            key="color"
            style={{
                width: `${100 * leftBarMargin}%`,
                alignSelf: 'stretch',
                position: 'relative',
            }}
        >
            <div style={{
                backgroundColor: highlightIndex === undefined ? colors.background : colorFromCycle(colors.hueColors, highlightIndex),
                height: '100%',
                width: '50%',
                left: '25%',
                position: 'absolute',
            }}
            />
        </div>
    )
}

function computeDisclaimerText(disclaimer: Disclaimer): string {
    switch (disclaimer) {
        case 'heterogenous-sources':
            return 'This statistic is based on data from multiple sources, which may not be consistent with each other.'
    }
}

function StatisticNameDisclaimer(props: { disclaimer: Disclaimer }): ReactNode {
    // little disclaimer icon that pops up a tooltip when clicked
    const [show, setShow] = useState(false)
    const colors = useColors()
    const tooltipStyle: React.CSSProperties = {
        position: 'absolute',
        backgroundColor: colors.slightlyDifferentBackgroundFocused,
        color: colors.textMain,
        padding: '0.5em',
        borderRadius: '0.5em',
        border: `1px solid ${colors.textMain}`,
        zIndex: 100000,
        display: show ? 'block' : 'none',
    }
    return (
        <span>
            <span
                className="disclaimer-toggle"
                style={{ ...articleStatnameButtonStyle(colors), display: 'inline-block' }}
                onClick={() => { setShow(!show) }}
            >
                !
            </span>
            <div
                style={tooltipStyle}
                onClick={() => { setShow(false) }}
            >
                {computeDisclaimerText(props.disclaimer)}
            </div>
        </span>
    )
}

export function TableRowContainer({ children, index, minHeight }: { children: React.ReactNode, index: number, minHeight?: string }): React.ReactNode {
    const colors = useColors()
    const style: React.CSSProperties = {
        ...tableRowStyle,
        backgroundColor: index % 2 === 1 ? colors.slightlyDifferentBackground : undefined,
        alignItems: 'last baseline',
        minHeight,
    }
    return (
        <div
            className="for-testing-table-row"
            style={style}
        >
            {children}
        </div>
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
    const currentUniverse = useUniverse()
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
        const data = await loadOrdering(currentUniverse, props.statpath, props.type)
        props.onNavigate?.(data.longnames[num - 1])
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
    return (
        <div className="serif" style={{ textAlign: 'right', marginRight: props.simpleOrdinals ? '5px' : 0 }}>
            {en}
            {props.simpleOrdinals
                ? <></>
                : (
                        <>
                            {' of '}
                            {total}
                            {' '}
                            {displayType(currentUniverse, type)}
                        </>
                    )}

        </div>
    )
}

;

// Lacks some customization since its column is not show in the comparison view
function PointerButtonsIndex(props: { ordinal?: number, statpath: string, type: string, total: number, longname: string, overallFirstLast?: FirstLastStatus }): ReactNode {
    const currentUniverse = useUniverse()
    const getData = async (): Promise<ArticleOrderingListInternal> => await loadOrdering(currentUniverse, props.statpath, props.type)
    return (
        <span style={{ margin: 'auto', whiteSpace: 'nowrap' }}>
            <PointerButtonIndex
                getData={getData}
                originalPos={props.ordinal}
                direction={-1}
                total={props.total}
                longname={props.longname}
                disable={props.overallFirstLast?.isFirst}
            />
            <PointerButtonIndex
                getData={getData}
                originalPos={props.ordinal}
                direction={+1}
                total={props.total}
                longname={props.longname}
                disable={props.overallFirstLast?.isLast}
            />
        </span>
    )
}

function PointerButtonIndex(props: {
    getData: () => Promise<ArticleOrderingListInternal>
    originalPos?: number // 1-indexed
    direction: -1 | 1
    total: number
    longname: string
    disable?: boolean
}): ReactNode {
    const universe = useUniverse()
    const colors = useColors()
    const navigation = useContext(Navigator.Context)
    const [showHistoricalCDs] = useSetting('show_historical_cds')
    const onClick = async (): Promise<void> => {
        /* eslint-disable no-console -- Debugging test failure */
        console.log(`Click on pointer button! props=${JSON.stringify(props)}`)
        const data = await props.getData()
        let pos = data.longnames.indexOf(props.longname) + props.direction
        console.log(`Starting position=${pos}`)
        while (pos >= 0 && pos < props.total) {
            const name = data.longnames[pos]
            const type = data.typeIndices[pos]
            console.log(`name=${name}`)
            if (!showHistoricalCDs && isHistoricalCD(type)) {
                pos += props.direction
                continue
            }
            console.log(`navigate to ${name}`)
            void navigation.navigate({
                kind: 'article',
                longname: name,
                universe,
            }, { history: 'push', scroll: { kind: 'element', element: buttonRef.current! } })
            return
        }
        /* eslint-enable no-console */
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
        backgroundColor: 'transparent',
    }

    let disabled: boolean = props.disable ?? false
    if (props.originalPos !== undefined) {
        disabled = props.originalPos + props.direction < 1 || props.originalPos + props.direction > props.total
    }

    const buttonRef = useRef<HTMLButtonElement>(null) // Need the ref otherwise the mouse enter and leave events can be sent to the wrong elem

    return (
        <button
            disabled={disabled}
            style={buttonStyle}
            onClick={onClick}
            data-test-id={props.direction}
            ref={buttonRef}
            onMouseEnter={() => {
                buttonRef.current!.style.backgroundColor = colors.slightlyDifferentBackgroundFocused
            }}
            onMouseLeave={() => {
                buttonRef.current!.style.backgroundColor = 'transparent'
            }}
        >
            <PointerArrow direction={props.direction} disabled={disabled} />
        </button>
    )
}
