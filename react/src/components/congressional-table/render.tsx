import React, { CSSProperties, Fragment, ReactNode, useMemo } from 'react'

import partyPages from '../../data/party_pages'
import { NavLink, Navigator } from '../../navigation/Navigator'
import { useColors } from '../../page_template/colors'
import { useSelectedYears } from '../../page_template/statistic-settings'
import { assert } from '../../utils/defensive'

import { cleanDistrictLabel, computeCongressionalWidgetModel, CongressionalRegionData } from './compute-model'
import {
    CongressionalRepresentativeEntry,
    CongressionalDisplayRow,
    CongressionalTableModel,
    RepresentativesForRegionAndDistrict,
    RepresentativesForRegion,
    RepresentativesForRegionAndDistrictSet,
} from './model'

function getPartyPage(party: string): (typeof partyPages)[keyof typeof partyPages] {
    assert(party in partyPages, `Party ${party} not found in partyPages data`)
    return partyPages[party as keyof typeof partyPages]
}

function RepresentativeParty(props: { party?: string | null }): ReactNode {
    const colors = useColors()
    if (!props.party || props.party === 'Independent') {
        return null
    }
    const partyPage = getPartyPage(props.party)
    // eslint-disable-next-line no-restricted-syntax -- not actual colors, just remapping
    const colorStr = partyPage.party_color === 'black' || partyPage.party_color === 'gray' ? 'grey' : partyPage.party_color
    const color = colors.hueColors[colorStr]

    return (
        <a href={partyPage.wikipedia_page} style={{ textDecoration: 'none', color }} target="_blank" rel="noopener noreferrer">
            {` (${props.party.slice(0, 1)})`}
        </a>
    )
}

function Representative(props: { representative: CongressionalRepresentativeEntry['representative'] }): ReactNode {
    if (props.representative.name === 'Vacant') {
        return <span className="serif value">(Vacant)</span>
    }
    assert(
        props.representative.wikipediaPage !== null
        && props.representative.wikipediaPage !== undefined
        && props.representative.name !== null
        && props.representative.name !== undefined,
        `Representative ${JSON.stringify(props.representative)} is missing required fields`,
    )
    return (
        <span>
            <a href={props.representative.wikipediaPage} style={{ textDecoration: 'none', color: 'inherit' }} target="_blank" rel="noopener noreferrer">
                {props.representative.name}
            </a>
            <RepresentativeParty party={props.representative.party ?? undefined} />
        </span>
    )
}

function districtArticleHref(nav: Navigator, longnames: string[]): NavLink {
    assert(longnames.length > 0, 'districtArticleHref requires at least one longname')
    if (longnames.length === 1) {
        return nav.link({
            kind: 'article',
            longname: longnames[0],
        }, { scroll: { kind: 'position', top: 0 } })
    }
    return nav.link({
        kind: 'comparison',
        longnames,
    }, { scroll: { kind: 'position', top: 0 } })
}

function borderStyles(props: {
    borderColor: string
    borderTop?: boolean
    borderRight?: boolean
    borderBottom?: boolean
    borderLeft?: boolean
}): CSSProperties {
    return {
        borderTop: props.borderTop ? `1px solid ${props.borderColor}` : undefined,
        borderRight: props.borderRight ? `1px solid ${props.borderColor}` : undefined,
        borderBottom: props.borderBottom ? `1px solid ${props.borderColor}` : undefined,
        borderLeft: props.borderLeft ? `1px solid ${props.borderColor}` : undefined,
    }
}

function baseTableCellStyle(props: {
    borderColor: string
    borderBottom?: boolean
    borderLeft?: boolean
    borderRight?: boolean
    textAlign?: 'left' | 'right' | 'center'
    display?: CSSProperties['display']
    justifyContent?: CSSProperties['justifyContent']
    alignItems?: CSSProperties['alignItems']
    backgroundColor?: string
}): CSSProperties {
    return {
        padding: '6px 8px',
        display: props.display ?? 'flex',
        alignItems: props.alignItems ?? 'center',
        justifyContent: props.justifyContent ?? 'flex-end',
        textAlign: props.textAlign ?? 'right',
        backgroundColor: props.backgroundColor,
        ...borderStyles(props),
    }
}

function CongressionalTableTermLabels(props: {
    displayRows: CongressionalDisplayRow[]
    borderColor: string
}): ReactNode {
    return (
        <>
            {props.displayRows.map((row, displayIndex) => (
                <div
                    key={displayIndex}
                    data-display-index={displayIndex}
                    style={{
                        gridColumn: 1,
                        gridRow: displayIndex + 2,
                        ...baseTableCellStyle({
                            borderColor: props.borderColor,
                            borderBottom: displayIndex !== props.displayRows.length - 1,
                            borderRight: true,
                        }),
                    }}
                    className="serif value"
                >
                    {row.kind === 'term-label' ? formatTermLabel(row.termStart) : ''}
                </div>
            ))}
        </>
    )
}

function CongressionalTableColumnHeaders(props: {
    supercolumns: RepresentativesForRegion[]
    borderColor: string
    panelBackground: string
}): ReactNode {
    return (
        <>
            {props.supercolumns.map((column, columnIndex) => (
                <div
                    key={columnIndex}
                    style={{
                        gridColumn: columnIndex + 2,
                        gridRow: 1,
                        ...baseTableCellStyle({
                            borderColor: props.borderColor,
                            borderRight: true,
                            borderBottom: true,
                            textAlign: 'center',
                            justifyContent: 'center',
                            backgroundColor: props.panelBackground,
                        }),
                    }}
                    className="serif value"
                >
                    {column.longname}
                </div>
            ))}
        </>
    )
}

function CongressionalTableSectionDistrictHeaders(props: {
    section: RepresentativesForRegionAndDistrictSet
    headerDisplayIndex: number
    columnIndex: number
    borderColor: string
    backgroundColor: string
}): ReactNode {
    const gridTemplateColumnsDistrict = props.section.districtHeaders.map(() => 'minmax(0, 1fr)').join(' ')

    return (
        <div
            style={{
                gridColumn: props.columnIndex + 2,
                gridRow: props.headerDisplayIndex + 2,
                ...borderStyles({
                    borderColor: props.borderColor,
                    borderRight: true,
                    borderBottom: true,
                }),
                backgroundColor: props.backgroundColor,
                display: 'flex',
            }}
        >
            <div style={{ display: 'grid', gridTemplateColumns: gridTemplateColumnsDistrict, width: '100%', height: '100%' }}>
                {props.section.districtHeaders.map((districtHeaderGroup, bucketIndex) => (
                    <div
                        key={bucketIndex}
                        className="serif value"
                        style={{
                            fontSize: '0.9em',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            height: '100%',
                            textAlign: 'center',
                            padding: '4px 6px',
                            borderRight: bucketIndex === props.section.districtHeaders.length - 1 ? 'none' : `1px solid ${props.borderColor}`,
                        }}
                    >
                        <CongressionalTableSectionDistrictHeader districtLongnames={districtHeaderGroup} />
                    </div>
                ))}
            </div>
        </div>
    )
}

function CongressionalTableSectionDistrictHeader(props: {
    districtLongnames: string[]
}): ReactNode {
    const nav = React.useContext(Navigator.Context)
    const cleanToLong = new Map<string, string[]>()
    props.districtLongnames.forEach((longname) => {
        const clean = cleanDistrictLabel(longname)
        if (!cleanToLong.has(clean)) {
            cleanToLong.set(clean, [])
        }
        cleanToLong.get(clean)!.push(longname)
    })
    return (
        <span style={{ whiteSpace: 'normal' }}>
            {[...cleanToLong.entries()].map(([districtHeader, longnames], headerIndex) => (
                <Fragment key={headerIndex}>
                    {headerIndex > 0 && ' / '}
                    <a
                        {...districtArticleHref(nav, longnames)}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                        {districtHeader}
                    </a>
                </Fragment>
            ))}
        </span>
    )
}

function CongressionalTableRunRows(props: {
    section: RepresentativesForRegionAndDistrictSet
    run: RepresentativesForRegionAndDistrict
    columnIndex: number
    bucketIndex: number
    isLastBucket: boolean
    borderColor: string
}): ReactNode {
    assert(props.run.displayRuns.length > 0, `Section ${props.section.contentStartDisplayIndex}-${props.section.contentEndDisplayIndex} has no display runs`)
    const sectionRowCount = props.section.contentEndDisplayIndex - props.section.contentStartDisplayIndex + 1

    return (
        <div
            style={{
                gridColumn: props.bucketIndex + 1,
                gridRow: `1 / ${sectionRowCount + 1}`,
                textAlign: 'center',
                ...borderStyles({
                    borderColor: props.borderColor,
                    borderRight: !props.isLastBucket,
                }),
                display: 'grid',
                gridTemplateRows: 'subgrid',
            }}
        >
            {props.run.displayRuns.map((displayRun) => {
                const relativeStartRow = displayRun.startDisplayIndex - props.section.contentStartDisplayIndex + 1
                const relativeEndRow = displayRun.endDisplayIndex - props.section.contentStartDisplayIndex + 1
                const rowStart = Math.min(relativeStartRow, relativeEndRow)
                const spanCount = Math.abs(relativeEndRow - relativeStartRow) + 1
                const bottomRow = rowStart + spanCount - 1
                return (
                    <div
                        key={displayRun.startDisplayIndex}
                        style={{
                            gridRow: `${rowStart} / span ${spanCount}`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            padding: '6px 8px',
                            ...borderStyles({
                                borderColor: props.borderColor,
                                borderBottom: bottomRow < sectionRowCount,
                            }),
                            gap: '4px',
                        }}
                    >
                        {displayRun.representatives.length === 0
                            ? <span className="serif value" style={{ opacity: 0.65 }}>-</span>
                            : displayRun.representatives.map((representative, representativeIndex) => (
                                <span key={representativeIndex} className="serif value" style={{ textAlign: 'center' }}>
                                    <Representative representative={representative} />
                                </span>
                            ))}
                    </div>
                )
            })}
        </div>
    )
}

function CongressionalTableSection(props: {
    section: RepresentativesForRegionAndDistrictSet
    columnIndex: number
    borderColor: string
    sectionBackgroundColor: string
}): ReactNode {
    return (
        <Fragment key={`${props.columnIndex}-${props.section.contentStartDisplayIndex}`}>
            {props.section.headerDisplayIndex !== undefined && (
                <CongressionalTableSectionDistrictHeaders
                    section={props.section}
                    headerDisplayIndex={props.section.headerDisplayIndex}
                    columnIndex={props.columnIndex}
                    borderColor={props.borderColor}
                    backgroundColor={props.sectionBackgroundColor}
                />
            )}

            <div
                style={{
                    gridColumn: props.columnIndex + 2,
                    gridRow: `${props.section.contentStartDisplayIndex + 2} / ${props.section.contentEndDisplayIndex + 3}`,
                    borderRight: `1px solid ${props.borderColor}`,
                    borderBottom: `1px solid ${props.borderColor}`,
                    display: 'grid',
                    gridTemplateColumns: props.section.districtHeaders.map(() => 'minmax(0, 1fr)').join(' '),
                    gridTemplateRows: 'subgrid',
                }}
            >
                {props.section.congressionalRuns.map((run, bucketIndex) => (
                    <CongressionalTableRunRows
                        key={bucketIndex}
                        section={props.section}
                        run={run}
                        columnIndex={props.columnIndex}
                        bucketIndex={bucketIndex}
                        isLastBucket={bucketIndex === props.section.congressionalRuns.length - 1}
                        borderColor={props.borderColor}
                    />
                ))}
            </div>
        </Fragment>
    )
}

/** Round a calendar year to the nearest multiple of 10 (half-to-even at .5). */
function bankersDecadeForYear(year: number): number {
    const sign = year < 0 ? -1 : 1
    const y = Math.abs(year)
    const q = Math.floor(y / 10)
    const r = y % 10
    if (r < 5) {
        return sign * q * 10
    }
    if (r > 5) {
        return sign * (q + 1) * 10
    }
    const lowerTen = q * 10
    const upperTen = (q + 1) * 10
    return sign * (q % 2 === 0 ? lowerTen : upperTen)
}

function useCongressionalTableScrollViewportHeight(displayRows: CongressionalDisplayRow[]): {
    scrollContainerRef: React.RefObject<HTMLDivElement>
    scrollContainerHeight: CSSProperties['height']
} {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null)
    const [preferredScrollableHeight, setPreferredScrollableHeight] = React.useState<number | undefined>(undefined)
    const years = useSelectedYears()
    const minDecade = years.length > 0 ? Math.min(...years) : 2020
    const maxDecade = years.length > 0 ? Math.max(...years) : 2020

    React.useLayoutEffect(() => {
        const container = scrollContainerRef.current
        if (!container) {
            return
        }

        // Default to the newest terms at the top.
        container.scrollTop = 0

        const targetDisplayIndex = displayRows.reduce((lastIndex, row, displayIndex) => {
            if (
                row.kind === 'term-label'
                && bankersDecadeForYear(row.termStart) >= minDecade
                && bankersDecadeForYear(row.termStart) <= maxDecade
            ) {
                return displayIndex
            }
            return lastIndex
        }, -1)

        if (targetDisplayIndex === -1) {
            setPreferredScrollableHeight(undefined)
            return
        }

        const firstTermDisplayIndex = displayRows.findIndex(row => row.kind === 'term-label')
        const firstTermRow = firstTermDisplayIndex === -1
            ? null
            : container.querySelector<HTMLElement>(`[data-display-index="${firstTermDisplayIndex}"]`)
        const targetRow = container.querySelector<HTMLElement>(`[data-display-index="${targetDisplayIndex}"]`)
        if (!firstTermRow || !targetRow) {
            setPreferredScrollableHeight(undefined)
            return
        }

        // Measure using element rects to avoid offsetParent/positioning artifacts.
        // Tall enough for the header plus term rows from newest through the last term in the selected decade range.
        const containerRect = container.getBoundingClientRect()
        const firstTermRect = firstTermRow.getBoundingClientRect()
        const targetRect = targetRow.getBoundingClientRect()
        const headerHeight = Math.max(0, firstTermRect.top - containerRect.top)
        const termRangeHeight = Math.max(0, targetRect.bottom - firstTermRect.top)
        const nextHeight = Math.max(220, Math.ceil(headerHeight + termRangeHeight + 1))
        setPreferredScrollableHeight(previous => (previous === nextHeight ? previous : nextHeight))
    }, [displayRows, minDecade, maxDecade])

    return {
        scrollContainerRef,
        scrollContainerHeight: preferredScrollableHeight === undefined ? '70vh' : `${preferredScrollableHeight}px`,
    }
}

function CongressionalRepresentativesTableRenderer(props: {
    model: CongressionalTableModel
    widthLeftHeader: number
    columnWidth: number
    extraSpaceRight: number[]
}): ReactNode {
    const colors = useColors()
    const borderColor = colors.textMain
    const panelBackground = colors.slightlyDifferentBackground
    const { scrollContainerRef, scrollContainerHeight } = useCongressionalTableScrollViewportHeight(props.model.displayRows)

    const gridTemplateColumns = `${props.widthLeftHeader}% ${props.model.supercolumns.map((_, i) => `${props.columnWidth + props.extraSpaceRight[i]}%`).join(' ')}`
    return (
        <div
            ref={scrollContainerRef}
            style={{
                width: '100%',
                marginTop: '4px',
                marginBottom: '4px',
                borderTop: `1px solid ${borderColor}`,
                borderBottom: `1px solid ${borderColor}`,
                overflowY: 'auto',
                height: scrollContainerHeight,
            }}
        >
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns,
                    gridTemplateRows: `auto repeat(${props.model.displayRows.length}, minmax(0, auto))`,
                    alignItems: 'stretch',
                }}
            >
                <div
                    style={{
                        gridColumn: 1,
                        gridRow: 1,
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        textAlign: 'right',
                        borderRight: `1px solid ${borderColor}`,
                        borderBottom: `1px solid ${borderColor}`,
                        backgroundColor: panelBackground,
                    }}
                    className="serif value"
                >
                    Term
                </div>
                <CongressionalTableColumnHeaders
                    supercolumns={props.model.supercolumns}
                    borderColor={borderColor}
                    panelBackground={panelBackground}
                />

                <CongressionalTableTermLabels
                    displayRows={props.model.displayRows}
                    borderColor={borderColor}
                />

                {props.model.supercolumns.map((supercolumn, columnIndex) => supercolumn.sections.map((section) => {
                    return (
                        <CongressionalTableSection
                            key={`${columnIndex}-${section.contentStartDisplayIndex}`}
                            section={section}
                            columnIndex={columnIndex}
                            borderColor={borderColor}
                            sectionBackgroundColor={colors.background}
                        />
                    )
                }))}
            </div>
        </div>
    )
}

export function CongressionalRepresentativesWidget(props: {
    regions: CongressionalRegionData[]
    widthLeftHeader: number
    columnWidth: number
    extraSpaceRight: number[]
}): ReactNode {
    assert(props.regions.length > 0, 'CongressionalRepresentativesWidget requires at least one region')
    const model = useMemo(
        () => computeCongressionalWidgetModel(props.regions),
        [props.regions],
    )

    return (
        <CongressionalRepresentativesTableRenderer
            model={model}
            widthLeftHeader={props.widthLeftHeader}
            columnWidth={props.columnWidth}
            extraSpaceRight={props.extraSpaceRight}
        />
    )
}

function formatTermLabel(termStart: number): string {
    return `${termStart}-${String(termStart + 2).slice(2)}`
}
