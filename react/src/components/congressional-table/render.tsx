import React, { Fragment, ReactNode, useMemo } from 'react'

import partyPages from '../../data/party_pages'
import { useColors } from '../../page_template/colors'
import { assert } from '../../utils/defensive'

import { computeCongressionalWidgetModel, CongressionalRegionData } from './compute-model'
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

function districtArticleHref(district: string): string | undefined {
    if (district === 'No district data' || district === 'District unknown') {
        return undefined
    }
    return `article.html?longname=${encodeURIComponent(district)}`
}

function CongressionalTableTermLabels(props: {
    displayRows: CongressionalDisplayRow[]
    borderColor: string
}): ReactNode {
    return (
        <>
            {props.displayRows.map((row, displayIndex) => (
                <div
                    key={`reps_term_display_row_${displayIndex}_${row.termIndex}`}
                    style={{
                        gridColumn: 1,
                        gridRow: displayIndex + 2,
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        textAlign: 'right',
                        borderBottom: displayIndex === props.displayRows.length - 1 ? 'none' : `1px solid ${props.borderColor}`,
                    }}
                    className="serif value"
                >
                    {row.kind === 'term-label' && row.termStart !== undefined ? formatTermLabel(row.termStart) : ''}
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
                    key={`reps_column_header_${columnIndex}`}
                    style={{
                        gridColumn: columnIndex + 2,
                        gridRow: 1,
                        padding: '6px 8px',
                        textAlign: 'center',
                        borderLeft: `1px solid ${props.borderColor}`,
                        borderBottom: `1px solid ${props.borderColor}`,
                        backgroundColor: props.panelBackground,
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
                borderLeft: `1px solid ${props.borderColor}`,
                borderBottom: `1px solid ${props.borderColor}`,
                backgroundColor: props.backgroundColor,
                display: 'flex',
            }}
        >
            <div style={{ display: 'grid', gridTemplateColumns: gridTemplateColumnsDistrict, width: '100%', height: '100%' }}>
                {props.section.districtHeaders.map((districtHeaderGroup, bucketIndex) => (
                    <div
                        key={`district_header_${props.columnIndex}_${props.section.contentStartDisplayIndex}_${bucketIndex}`}
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
                            lineHeight: 1.25,
                        }}
                    >
                        {districtHeaderGroup.map((districtHeader, headerIndex) => (
                            <Fragment key={`district_header_text_${props.columnIndex}_${props.section.contentStartDisplayIndex}_${bucketIndex}_${headerIndex}`}>
                                {headerIndex > 0 && <br />}
                                {districtArticleHref(districtHeader) === undefined
                                    ? districtHeader
                                    : (
                                            <a
                                                href={districtArticleHref(districtHeader)}
                                                style={{ textDecoration: 'none', color: 'inherit' }}
                                            >
                                                {districtHeader}
                                            </a>
                                        )}
                            </Fragment>
                        ))}
                    </div>
                ))}
            </div>
        </div>
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
    const sectionRowCount = props.section.contentEndDisplayIndex - props.section.contentStartDisplayIndex + 1

    return (
        <div
            style={{
                gridColumn: props.bucketIndex + 1,
                gridRow: `1 / ${sectionRowCount + 1}`,
                textAlign: 'center',
                borderRight: props.isLastBucket ? 'none' : `1px solid ${props.borderColor}`,
                display: 'grid',
                gridTemplateRows: 'subgrid',
            }}
        >
            {props.run.displayRuns.length === 0
                ? (
                        <div
                            style={{
                                gridRow: `1 / ${sectionRowCount + 1}`,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px 8px',
                            }}
                        >
                            <span className="serif value" style={{ opacity: 0.65 }}>-</span>
                        </div>
                    )
                : (
                        <>
                            {props.run.displayRuns.map((displayRun, displayRunIndex) => {
                                const relativeStartRow = displayRun.startDisplayIndex - props.section.contentStartDisplayIndex + 1
                                const relativeEndRow = displayRun.endDisplayIndex - props.section.contentStartDisplayIndex + 1
                                const rowStart = Math.min(relativeStartRow, relativeEndRow)
                                const spanCount = Math.abs(relativeEndRow - relativeStartRow) + 1
                                const bottomRow = rowStart + spanCount - 1
                                return (
                                    <div
                                        key={`rep_run_${props.columnIndex}_${props.section.contentStartDisplayIndex}_${props.bucketIndex}_${displayRunIndex}`}
                                        style={{
                                            gridRow: `${rowStart} / span ${spanCount}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            padding: '6px 8px',
                                            borderBottom: bottomRow >= sectionRowCount ? 'none' : `1px solid ${props.borderColor}`,
                                            gap: '10px',
                                        }}
                                    >
                                        {displayRun.representatives.length === 0
                                            ? <span className="serif value" style={{ opacity: 0.65 }}>-</span>
                                            : displayRun.representatives.map((representative, representativeIndex) => (
                                                <span key={`rep_run_item_${props.columnIndex}_${props.section.contentStartDisplayIndex}_${props.bucketIndex}_${displayRunIndex}_${representativeIndex}`} className="serif value" style={{ textAlign: 'center' }}>
                                                    <Representative representative={representative} />
                                                </span>
                                            ))}
                                    </div>
                                )
                            })}
                        </>
                    )}
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
        <Fragment key={`reps_section_${props.columnIndex}_${props.section.contentStartDisplayIndex}_${props.section.contentEndDisplayIndex}`}>
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
                    borderLeft: `1px solid ${props.borderColor}`,
                    borderBottom: 'none',
                    display: 'grid',
                    gridTemplateColumns: props.section.districtHeaders.map(() => 'minmax(0, 1fr)').join(' '),
                    gridTemplateRows: 'subgrid',
                }}
            >
                {props.section.congressionalRuns.map((run, bucketIndex) => (
                    <CongressionalTableRunRows
                        key={`district_cell_${props.columnIndex}_${props.section.contentStartDisplayIndex}_${bucketIndex}`}
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

function CongressionalRepresentativesTableRenderer(props: {
    model: CongressionalTableModel
    widthLeftHeader: number
    columnWidth: number
    extraSpaceRight: number[]
}): ReactNode {
    const colors = useColors()
    const borderColor = colors.textMain
    const panelBackground = colors.slightlyDifferentBackground

    const gridTemplateColumns = `${props.widthLeftHeader}% ${props.model.supercolumns.map((_, i) => `${props.columnWidth + props.extraSpaceRight[i]}%`).join(' ')}`
    return (
        <div style={{ width: '100%', marginTop: '4px', marginBottom: '4px', borderTop: `1px solid ${borderColor}`, borderBottom: `1px solid ${borderColor}` }}>
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
                            key={`reps_section_${columnIndex}_${section.contentStartDisplayIndex}_${section.contentEndDisplayIndex}`}
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
    const model = useMemo(
        () => computeCongressionalWidgetModel(props.regions),
        [props.regions],
    )

    if (model === undefined) {
        return null
    }

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
