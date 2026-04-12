import React, { Fragment, ReactNode, useMemo } from 'react'

import partyPages from '../../data/party_pages'
import { useColors } from '../../page_template/colors'
import { assert } from '../../utils/defensive'

import { computeCongressionalWidgetModel, CongressionalRegionData } from './compute-model'
import {
    CongressionalRepresentativeEntry,
    CongressionalTableModel,
    RepresentativesForRegionAndDistrict,
    RepresentativesForRegionDistrictAndDisplayRun,
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

function CongressionalRepresentativesTableRenderer(props: {
    model: CongressionalTableModel
    widthLeftHeader: number
    columnWidth: number
    extraSpaceRight: number[]
}): ReactNode {
    const colors = useColors()
    const borderColor = colors.textMain
    const panelBackground = colors.slightlyDifferentBackground

    const districtArticleHref = (district: string): string | undefined => {
        if (district === 'No district data' || district === 'District unknown') {
            return undefined
        }
        return `article.html?longname=${encodeURIComponent(district)}`
    }

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
                {props.model.supercolumns.map((column, columnIndex) => (
                    <div
                        key={`reps_column_header_${columnIndex}`}
                        style={{
                            gridColumn: columnIndex + 2,
                            gridRow: 1,
                            padding: '6px 8px',
                            textAlign: 'center',
                            borderLeft: `1px solid ${borderColor}`,
                            borderBottom: `1px solid ${borderColor}`,
                            backgroundColor: panelBackground,
                        }}
                        className="serif value"
                    >
                        {column.longname}
                    </div>
                ))}

                {props.model.displayRows.map((row, displayIndex) => (
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
                            borderBottom: displayIndex === props.model.displayRows.length - 1 ? 'none' : `1px solid ${borderColor}`,
                        }}
                        className="serif value"
                    >
                        {row.kind === 'term-label' && row.termStart !== undefined ? formatTermLabel(row.termStart) : ''}
                    </div>
                ))}

                {props.model.supercolumns.map((supercolumn, columnIndex) => supercolumn.sections.map((section) => {
                    const gridTemplateColumnsDistrict = section.districtHeaders.map(() => 'minmax(0, 1fr)').join(' ')
                    const sectionRowCount = section.contentEndDisplayIndex - section.contentStartDisplayIndex + 1
                    return (
                        <Fragment key={`reps_section_${columnIndex}_${section.contentStartDisplayIndex}_${section.contentEndDisplayIndex}`}>
                            {section.headerDisplayIndex !== undefined && (
                                <div
                                    style={{
                                        gridColumn: columnIndex + 2,
                                        gridRow: section.headerDisplayIndex + 2,
                                        borderLeft: `1px solid ${borderColor}`,
                                        borderBottom: `1px solid ${borderColor}`,
                                        backgroundColor: colors.background,
                                        display: 'flex',
                                    }}
                                >
                                    <div style={{ display: 'grid', gridTemplateColumns: gridTemplateColumnsDistrict, width: '100%', height: '100%' }}>
                                        {section.districtHeaders.map((districtHeaderGroup, bucketIndex) => (
                                            <div
                                                key={`district_header_${columnIndex}_${section.contentStartDisplayIndex}_${bucketIndex}`}
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
                                                    borderRight: bucketIndex === section.districtHeaders.length - 1 ? 'none' : `1px solid ${borderColor}`,
                                                    lineHeight: 1.25,
                                                }}
                                            >
                                                {districtHeaderGroup.map((districtHeader, headerIndex) => (
                                                    <Fragment key={`district_header_text_${columnIndex}_${section.contentStartDisplayIndex}_${bucketIndex}_${headerIndex}`}>
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
                            )}

                            <div
                                style={{
                                    gridColumn: columnIndex + 2,
                                    gridRow: `${section.contentStartDisplayIndex + 2} / ${section.contentEndDisplayIndex + 3}`,
                                    borderLeft: `1px solid ${borderColor}`,
                                    borderBottom: section.contentEndDisplayIndex === props.model.displayRows.length - 1 ? 'none' : `1px solid ${borderColor}`,
                                    display: 'grid',
                                    gridTemplateColumns: gridTemplateColumnsDistrict,
                                    gridTemplateRows: 'subgrid',
                                }}
                            >
                                {section.congressionalRuns.map((run: RepresentativesForRegionAndDistrict, bucketIndex) => (
                                    <div
                                        key={`district_cell_${columnIndex}_${section.contentStartDisplayIndex}_${bucketIndex}`}
                                        style={{
                                            gridColumn: bucketIndex + 1,
                                            gridRow: `1 / ${sectionRowCount + 1}`,
                                            textAlign: 'center',
                                            borderRight: bucketIndex === section.congressionalRuns.length - 1 ? 'none' : `1px solid ${borderColor}`,
                                            display: 'grid',
                                            gridTemplateRows: 'subgrid',
                                        }}
                                    >
                                        {run.displayRuns.length === 0
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
                                                        {run.displayRuns.map((displayRun: RepresentativesForRegionDistrictAndDisplayRun, displayRunIndex) => {
                                                            const relativeStartRow = displayRun.startDisplayIndex - section.contentStartDisplayIndex + 1
                                                            const relativeEndRow = displayRun.endDisplayIndex - section.contentStartDisplayIndex + 1
                                                            const rowStart = Math.min(relativeStartRow, relativeEndRow)
                                                            const spanCount = Math.abs(relativeEndRow - relativeStartRow) + 1
                                                            const bottomRow = rowStart + spanCount - 1
                                                            return (
                                                                <div
                                                                    key={`rep_run_${columnIndex}_${section.contentStartDisplayIndex}_${bucketIndex}_${displayRunIndex}`}
                                                                    style={{
                                                                        gridRow: `${rowStart} / span ${spanCount}`,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        textAlign: 'center',
                                                                        padding: '6px 8px',
                                                                        borderBottom: bottomRow >= sectionRowCount ? 'none' : `1px solid ${borderColor}`,
                                                                        gap: '10px',
                                                                    }}
                                                                >
                                                                    {displayRun.representatives.length === 0
                                                                        ? <span className="serif value" style={{ opacity: 0.65 }}>-</span>
                                                                        : displayRun.representatives.map((representative, representativeIndex) => (
                                                                            <span key={`rep_run_item_${columnIndex}_${section.contentStartDisplayIndex}_${bucketIndex}_${displayRunIndex}_${representativeIndex}`} className="serif value" style={{ textAlign: 'center' }}>
                                                                                <Representative representative={representative} />
                                                                            </span>
                                                                        ))}
                                                                </div>
                                                            )
                                                        })}
                                                    </>
                                                )}
                                    </div>
                                ))}
                            </div>
                        </Fragment>
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
