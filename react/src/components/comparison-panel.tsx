import '../common.css'
import './article.css'

import React, { ReactNode, useContext, useRef } from 'react'

import { Navigator } from '../navigation/Navigator'
import { sanitize } from '../navigation/links'
import { HueColors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { rowExpandedKey, useSetting, useSettings } from '../page_template/settings'
import { groupYearKeys, StatGroupSettings } from '../page_template/statistic-settings'
import { PageTemplate } from '../page_template/template'
import { useUniverse } from '../universe'
import { mixWithBackground } from '../utils/color'
import { Article } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'

import { ArticleWarnings } from './ArticleWarnings'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { ArticleRow } from './load-article'
import { MapGeneric, MapGenericProps, Polygons } from './map'
import { WithPlot } from './plots'
import { ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { TableRowContainer, StatisticRowCells, TableHeaderContainer, StatisticHeaderCells, ColumnIdentifier, StatisticName } from './table'

const leftBarMargin = 0.02
const barHeight = '5px'

export function ComparisonPanel(props: { universes: string[], articles: Article[], rows: (settings: StatGroupSettings) => ArticleRow[][] }): ReactNode {
    const colors = useColors()
    const tableRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef(null)

    const joinedString = props.articles.map(x => x.shortname).join(' vs ')
    const names = props.articles.map(a => a.longname)

    const screencapElements = (): ScreencapElements => ({
        path: `${sanitize(joinedString)}.png`,
        overallWidth: tableRef.current!.offsetWidth * 2,
        elementsToRender: [tableRef.current!, mapRef.current!],
    })

    const settings = useSettings(groupYearKeys())

    const rows = props.rows(settings)

    const mobileLayout = useMobileLayout()

    const validOrdinals = rows[0].map((_, i) => rows.every(row => row[i].disclaimer !== 'heterogenous-sources'))

    const includeOrdinals = (
        props.articles.every(article => article.articleType === props.articles[0].articleType)
        && (validOrdinals.length === 0 || validOrdinals.some(x => x))
    )

    const onlyColumns: ColumnIdentifier[] = includeOrdinals ? ['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile'] : ['statval', 'statval_unit']

    const maxColumns = mobileLayout ? 4 : 6

    let widthColumns = (includeOrdinals ? 1.5 : 1) * props.articles.length + 1
    let heightRows = 1 * rows[0].length + 1

    const transpose = widthColumns > maxColumns && widthColumns > heightRows

    if (transpose) {
        ([widthColumns, heightRows] = [heightRows, widthColumns])
    }

    const leftMarginPercent = transpose ? 0.24 : 0.18

    const cell = (kind: 'left' | 'leftWithoutBar' | 'contents', i: number, contents: React.ReactNode): ReactNode => {
        if (kind !== 'contents') {
            return (
                <div key={i} style={{ width: `${(leftMarginPercent - (kind === 'leftWithoutBar' ? leftBarMargin : 0)) * 100}%` }}>
                    {contents}
                </div>
            )
        }
        const width = `${each({ length: (transpose ? rows[0] : props.articles).length, leftMarginPercent })}%`
        return (
            <div key={i} style={{ width }}>
                {contents}
            </div>
        )
    }

    const maybeScroll = (contents: React.ReactNode): ReactNode => {
        if (widthColumns > maxColumns) {
            return (
                <div style={{ overflowX: 'scroll' }}>
                    <div style={{ width: `${100 * widthColumns / (maxColumns - 0.7)}%` }}>
                        {contents}
                    </div>
                </div>
            )
        }
        return contents
    }

    const headerTextClass = useHeaderTextClass()
    const subHeaderTextClass = useSubHeaderTextClass()
    const comparisonRightStyle = useComparisonHeadStyle('right')
    const searchComparisonStyle = useComparisonHeadStyle()

    const currentUniverse = useUniverse()

    const navContext = useContext(Navigator.Context)

    const headings = props.articles.map(
        (data, i) => cell(transpose ? 'leftWithoutBar' : 'contents', transpose ? 0 : i,
            <div>
                <HeadingDisplay
                    longname={data.longname}
                    includeDelete={props.articles.length > 1}
                    onDelete={() => {
                        void navContext.navigate({
                            kind: 'comparison',
                            universe: currentUniverse,
                            longnames: names.filter((_, index) => index !== i),
                        }, { history: 'push', scroll: { kind: 'none' } })
                    }}
                    onReplace={x =>
                        navContext.link({
                            kind: 'comparison',
                            universe: currentUniverse,
                            longnames: names.map((value, index) => index === i ? x : value),
                        }, { scroll: { kind: 'none' } })}
                />
            </div>,
        ),
    )

    const normalTableContents = (): ReactNode => {
        const bars = (): ReactNode => {
            return (
                <div style={{ display: 'flex' }}>
                    {cell('left', 0, <div></div>)}
                    {props.articles.map(
                        (data, i) => (
                            <div
                                key={i}
                                style={{
                                    width: `${each({ length: props.articles.length, leftMarginPercent })}%`,
                                    height: barHeight,
                                    backgroundColor: color(colors.hueColors, i),
                                }}
                            />
                        ),
                    )}
                </div>
            )
        }
        return (
            <>
                {bars()}
                <div style={{ display: 'flex' }}>
                    {cell('left', 0, <div></div>)}
                    {headings}
                </div>
                {bars()}

                <TableHeaderContainer>
                    <ComparisonHeaders onlyColumns={onlyColumns} length={props.articles.length} leftMarginPercent={leftMarginPercent} />
                </TableHeaderContainer>

                {
                    rows[0].map((_, rowIdx) => (
                        <ComparisonRowBody
                            key={rows[0][rowIdx].statpath}
                            index={rowIdx}
                            rows={rows.map(row => row[rowIdx])}
                            articles={props.articles}
                            names={names}
                            onlyColumns={onlyColumns}
                            blankColumns={validOrdinals[rowIdx] ? [] : ['statistic_ordinal', 'statistic_percentile']}
                            leftMarginPercent={leftMarginPercent}
                        />
                    ),
                    )
                }
            </>
        )
    }

    const comparisonHeadStyle = useComparisonHeadStyle()

    const transposeTableContents = (): ReactNode => {
        const bars = (): ReactNode => {
            return (
                <div style={{ display: 'flex' }}>
                    {cell('left', 0, <div></div>)}
                    {rows[0].map(
                        (_, i) => {
                            const highlightIndex = getHighlightIndex(rows.map(r => r[i]))
                            return (
                                <div
                                    key={i}
                                    style={{
                                        width: `${each({ length: rows[0].length, leftMarginPercent })}%`,
                                        height: barHeight,
                                        backgroundColor: highlightIndex !== undefined ? color(colors.hueColors, highlightIndex) : undefined,
                                    }}
                                />
                            )
                        },
                    )}
                </div>
            )
        }
        return (
            <>
                {bars()}
                <div style={{
                    display: 'flex',
                    flexDirection: 'row' }}
                >
                    {cell('left', 0, <div></div>)}
                    {
                        rows[0].map((data, i) => {
                            const statRows = rows.map(row => row[i])
                            return cell('contents', i,
                                <div style={comparisonHeadStyle}>
                                    <StatisticName
                                        row={statRows.find(row => row.extraStat !== undefined) ?? statRows[0]} // So that we show the expand if there's a least one extra
                                        longname={names[0]}
                                        currentUniverse={currentUniverse}
                                        center={true}
                                    />
                                </div>,
                            )
                        })
                    }
                </div>
                {bars()}

                <TableHeaderContainer>
                    <ComparisonHeaders onlyColumns={onlyColumns} length={rows[0].length} statNameOverride="Region" leftMarginPercent={leftMarginPercent} />
                </TableHeaderContainer>

                {props.articles.map((article, i) => {
                    return (
                        <TableRowContainer key={article.longname} index={i}>
                            <ComparisonColorBar key="color" highlightIndex={i} />
                            {headings[i]}
                            { rows[i].map((row, rowIdx) => {
                                const highlightIndex = getHighlightIndex(rows.map(r => r[rowIdx]))

                                return (
                                    <StatisticRowCells
                                        key={names[i]}
                                        row={row}
                                        longname={names[i]}
                                        onlyColumns={onlyColumns}
                                        blankColumns={validOrdinals[rowIdx] ? [] : ['statistic_ordinal', 'statistic_percentile']}
                                        simpleOrdinals={true}
                                        statisticStyle={highlightIndex === i ? { backgroundColor: mixWithBackground(color(colors.hueColors, i), colors.mixPct / 100, colors.background) } : {}}
                                        onNavigate={(x) => {
                                            void navContext.navigate({
                                                kind: 'comparison',
                                                universe: navContext.universe,
                                                longnames: names.map((value, index) => index === i ? x : value),
                                            }, { history: 'push', scroll: { kind: 'none' } })
                                        }}
                                        totalWidth={each({ length: rows[0].length, leftMarginPercent })}
                                    />
                                )
                            })}
                        </TableRowContainer>
                    )
                })}
            </>
        )
    }

    return (
        <>
            <QuerySettingsConnection />
            <PageTemplate screencapElements={screencapElements} hasUniverseSelector={true} universes={props.universes}>
                <div>
                    <div className={headerTextClass}>Comparison</div>
                    <div className={subHeaderTextClass}>{joinedString}</div>
                    <div style={{ marginBlockEnd: '16px' }}></div>

                    <div style={{ display: 'flex' }}>
                        <div style={{ width: `${100 * leftMarginPercent}%` }} />
                        <div style={{ width: `${50 * (1 - leftMarginPercent)}%`, marginRight: '1em' }}>
                            <div className="serif" style={comparisonRightStyle}>Add another region:</div>
                        </div>
                        <div style={{ width: `${50 * (1 - leftMarginPercent)}%` }}>
                            <SearchBox
                                style={{ ...searchComparisonStyle, width: '100%' }}
                                placeholder="Name"
                                link={x =>
                                    navContext.link({
                                        kind: 'comparison',
                                        universe: currentUniverse,
                                        longnames: [...names, x],
                                    }, { scroll: { kind: 'none' } })}
                                autoFocus={false}
                            />
                        </div>
                    </div>

                    <div style={{ marginBlockEnd: '1em' }}></div>

                    {maybeScroll(
                        <div ref={tableRef}>
                            {transpose ? transposeTableContents() : normalTableContents()}
                            <ArticleWarnings />
                        </div>,
                    )}
                    <div className="gap"></div>

                    <div ref={mapRef}>
                        <ComparisonMap
                            longnames={props.articles.map(x => x.longname)}
                            colors={props.articles.map((_, i) => color(colors.hueColors, i))}
                            basemap={{ type: 'osm' }}
                        />
                    </div>
                </div>
            </PageTemplate>
        </>
    )
}

function color(colors: HueColors, i: number): string {
    const colorCycle = [
        colors.blue,
        colors.orange,
        colors.purple,
        colors.red,
        colors.grey,
        colors.pink,
        colors.yellow,
        colors.green,
    ]
    return colorCycle[i % colorCycle.length]
}

function each({ length, leftMarginPercent }: { length: number, leftMarginPercent: number }): number {
    return 100 * (1 - leftMarginPercent) / length
}

function ComparisonRowBody({ rows, articles, names, onlyColumns, blankColumns, index, leftMarginPercent }: {
    rows: ArticleRow[]
    articles: Article[]
    names: string[]
    onlyColumns: ColumnIdentifier[]
    blankColumns: ColumnIdentifier[]
    index: number
    leftMarginPercent: number
}): ReactNode {
    const colors = useColors()
    const [expanded] = useSetting(rowExpandedKey(rows[0].statpath))
    const plotProps = rows.map((row, dataIdx) => ({ ...row, color: color(colors.hueColors, dataIdx), shortname: articles[dataIdx].shortname }))
    return (
        <WithPlot plotProps={plotProps} expanded={expanded ?? false}>
            <TableRowContainer index={index}>
                <ComparisonCells
                    rows={rows}
                    names={names}
                    onlyColumns={onlyColumns}
                    blankColumns={blankColumns}
                    leftMarginPercent={leftMarginPercent}
                />
            </TableRowContainer>
        </WithPlot>
    )
}

function getHighlightIndex(rows: ArticleRow[]): number | undefined {
    return rows.map(x => x.statval).reduce<number | undefined>((iMax, x, i, arr) => {
        if (isNaN(x)) {
            return iMax
        }
        if (iMax === undefined) {
            return i
        }
        return x > arr[iMax] ? i : iMax
    }, undefined)
}

function ComparisonCells({ names, rows, onlyColumns, blankColumns, leftMarginPercent }: {
    names: string[]
    rows: ArticleRow[]
    onlyColumns: ColumnIdentifier[]
    blankColumns: ColumnIdentifier[]
    leftMarginPercent: number
}): ReactNode {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    const highlightIndex = getHighlightIndex(rows)

    return [
        <ComparisonColorBar key="color" highlightIndex={highlightIndex} />,
        <StatisticRowCells
            key="statname"
            onlyColumns={['statname']}
            longname={names[0]}
            totalWidth={100 * (leftMarginPercent - leftBarMargin)}
            row={rows.find(row => row.extraStat !== undefined) ?? rows[0]} // So that we show the expand if there's a least one extra
            simpleOrdinals={true}
        />,
        ...rows.map((row, i) => (
            <StatisticRowCells
                key={names[i]}
                row={row}
                longname={names[i]}
                onlyColumns={onlyColumns}
                blankColumns={blankColumns}
                simpleOrdinals={true}
                statisticStyle={highlightIndex === i ? { backgroundColor: mixWithBackground(color(colors.hueColors, i), colors.mixPct / 100, colors.background) } : {}}
                onNavigate={(x) => {
                    void navContext.navigate({
                        kind: 'comparison',
                        universe: navContext.universe,
                        longnames: names.map((value, index) => index === i ? x : value),
                    }, { history: 'push', scroll: { kind: 'none' } })
                }}
                totalWidth={each({ length: rows.length, leftMarginPercent })}
            />
        )),
    ]
}

function ComparisonHeaders({ onlyColumns, length, statNameOverride, leftMarginPercent }: { onlyColumns: ColumnIdentifier[], length: number, statNameOverride?: string, leftMarginPercent: number }): ReactNode {
    return [
        <ComparisonColorBar key="color" highlightIndex={undefined} />,
        <StatisticHeaderCells key="statname" onlyColumns={['statname']} simpleOrdinals={true} totalWidth={100 * (leftMarginPercent - leftBarMargin)} statNameOverride={statNameOverride} />,
        ...Array.from({ length })
            .map((_, index) => <StatisticHeaderCells key={index} onlyColumns={onlyColumns} simpleOrdinals={true} totalWidth={each({ length, leftMarginPercent })} />),
    ]
}

function ComparisonColorBar({ highlightIndex }: { highlightIndex: number | undefined }): ReactNode {
    const colors = useColors()

    return (
        <div
            key="color"
            style={{
                width: `${100 * leftBarMargin}%`,
                alignSelf: 'stretch',
            }}
        >
            <div style={{
                backgroundColor: highlightIndex === undefined ? colors.background : color(colors.hueColors, highlightIndex),
                height: '100%',
                width: '50%',
                margin: 'auto',
            }}
            />
        </div>
    )
}

const manipulationButtonHeight = '24px'

function ManipulationButton({ color: buttonColor, onClick, text }: { color: string, onClick: () => void, text: string }): ReactNode {
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
            {text}
        </div>
    )
}

function HeadingDisplay({ longname, includeDelete, onDelete, onReplace }: { longname: string, includeDelete: boolean, onDelete: () => void, onReplace: (q: string) => ReturnType<Navigator['link']> }): ReactNode {
    const colors = useColors()
    const [isEditing, setIsEditing] = React.useState(false)
    const currentUniverse = useUniverse()
    const comparisonHeadStyle = useComparisonHeadStyle()

    const manipulationButtons = (
        <div style={{ height: manipulationButtonHeight }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', height: '100%' }}>
                <ManipulationButton color={colors.unselectedButton} onClick={() => { setIsEditing(!isEditing) }} text="replace" />
                {!includeDelete
                    ? null
                    : (
                            <>
                                <div style={{ width: '5px' }} />
                                <ManipulationButton color={colors.unselectedButton} onClick={onDelete} text="delete" />
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
                        />
                    )
                : null}
        </div>
    )
}

// eslint-disable-next-line prefer-function-component/prefer-function-component -- TODO: Maps don't support function components yet.
class ComparisonMap extends MapGeneric<MapGenericProps & { longnames: string[], colors: string[] }> {
    override buttons(): ReactNode {
        return <ComparisonMapButtons map={this} />
    }

    zoomButton(i: number, buttonColor: string, onClick: () => void): ReactNode {
        return (
            <div
                key={i}
                style={{
                    display: 'inline-block', width: '2em', height: '2em',
                    backgroundColor: buttonColor, borderRadius: '50%', marginLeft: '5px', marginRight: '5px',
                    cursor: 'pointer',
                }}
                onClick={onClick}
            />
        )
    }

    override computePolygons(): Promise<Polygons> {
        return Promise.resolve({
            polygons: this.props.longnames.map((longname, i) => ({
                name: longname,
                style: { color: this.props.colors[i], fillColor: this.props.colors[i], fillOpacity: 0.5, weight: 1 },
                meta: {},
            })),
            zoomIndex: -1,
        })
    }

    override mapDidRender(): Promise<void> {
        this.zoomToAll()
        return Promise.resolve()
    }
}

export function ComparisonMapButtons(props: { map: ComparisonMap }): ReactNode {
    const colors = useColors()
    const isScreenshot = useScreenshotMode()

    if (isScreenshot) {
        return null
    }

    return (
        <div style={{
            display: 'flex', backgroundColor: colors.background, padding: '0.5em', borderRadius: '0.5em',
            alignItems: 'center',
        }}
        >
            <span className="serif" style={{ fontSize: '15px', fontWeight: 500 }}>Zoom to:</span>
            <div style={{ width: '0.25em' }} />
            {props.map.zoomButton(-1, colors.textMain, () => { props.map.zoomToAll() })}
            {props.map.props.longnames.map((longname, i) => {
                return props.map.zoomButton(i, props.map.props.colors[i], () => { props.map.zoomTo(longname) })
            })}
        </div>
    )
}
