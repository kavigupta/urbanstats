import '../common.css'
import './article.css'

import React, { ReactNode, useContext, useEffect, useMemo, useRef } from 'react'

import { Navigator } from '../navigation/Navigator'
import { sanitize } from '../navigation/links'
import { HueColors } from '../page_template/color-themes'
import { colorFromCycle, useColors } from '../page_template/colors'
import { rowExpandedKey, useSettings } from '../page_template/settings'
import { groupYearKeys, StatGroupSettings } from '../page_template/statistic-settings'
import { PageTemplate } from '../page_template/template'
import { useUniverse } from '../universe'
import { mixWithBackground } from '../utils/color'
import { Article } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'
import { TransposeContext } from '../utils/transpose'

import { ArticleWarnings } from './ArticleWarnings'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { ArticleRow } from './load-article'
import { MapGeneric, MapGenericProps, ShapeRenderingSpec } from './map'
import { PlotProps, RenderedPlot } from './plots'
import { transposeSettingsHeight } from './plots-histogram'
import { ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { TableRowContainer, StatisticRowCells, TableHeaderContainer, StatisticHeaderCells, ColumnIdentifier, StatisticNameCell, ComparisonLongnameCell, leftBarMargin, ComparisonColorBar } from './table'

const barHeight = '5px'

export function ComparisonPanel(props: { universes: string[], articles: Article[], rows: (settings: StatGroupSettings) => ArticleRow[][], mapPartitions: number[][] }): ReactNode {
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

    const dataByArticleStat = props.rows(settings)
    const dataByStatArticle = dataByArticleStat[0].map((_, statIndex) => dataByArticleStat.map(articleData => articleData[statIndex]))

    const mobileLayout = useMobileLayout()

    const validOrdinalsByStat = dataByStatArticle.map(statData => statData.every(value => value.disclaimer !== 'heterogenous-sources'))

    const includeOrdinals = (
        props.articles.every(article => article.articleType === props.articles[0].articleType)
        && (validOrdinalsByStat.length === 0 || validOrdinalsByStat.some(x => x))
    )

    const onlyColumns: ColumnIdentifier[] = includeOrdinals ? ['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile'] : ['statval', 'statval_unit']

    const maxColumns = mobileLayout ? 4 : 6

    const expandedSettings = useSettings(dataByStatArticle.filter(statData => statData.some(row => row.extraStat !== undefined)).map(([{ statpath }]) => rowExpandedKey(statpath)))

    const expandedByStatIndex = dataByStatArticle.map(([{ statpath }]) => expandedSettings[rowExpandedKey(statpath)] ?? false)
    const numExpandedExtras = expandedByStatIndex.filter(v => v).length

    let widthColumns = (includeOrdinals ? 1.5 : 1) * props.articles.length + 1
    let widthTransposeColumns = (includeOrdinals ? 1.5 : 1) * (dataByArticleStat[0].length + numExpandedExtras) + 1.5

    const transpose = widthColumns > maxColumns && widthColumns > widthTransposeColumns

    if (transpose) {
        ([widthColumns, widthTransposeColumns] = [widthTransposeColumns, widthColumns])
    }

    const leftMarginPercent = transpose ? 0.24 : 0.18
    const numColumns = transpose ? dataByArticleStat[0].length : props.articles.length
    const columnWidth = 100 * (1 - leftMarginPercent) / (numColumns + (transpose ? numExpandedExtras : 0))

    const expandedColumnWidth = (columnIndex: number): number => {
        return transpose && expandedByStatIndex[columnIndex] ? 2 * columnWidth : columnWidth
    }

    const leftSpacerCell = (): ReactNode => {
        return <div style={{ width: `${leftMarginPercent * 100}%` }}></div>
    }

    const transposeHistogramSpacer = (columnIndex: number): ReactNode => {
        return transpose && expandedByStatIndex[columnIndex] ? <div key={`spacer_${columnIndex}`} style={{ width: `${columnWidth}%` }}></div> : null
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

    const highlightArticleIndicesByStat: (number | undefined)[] = dataByStatArticle.map(articlesStatData => getHighlightIndex(articlesStatData))

    const headerTextClass = useHeaderTextClass()
    const subHeaderTextClass = useSubHeaderTextClass()
    const comparisonRightStyle = useComparisonHeadStyle('right')
    const searchComparisonStyle = useComparisonHeadStyle()

    const currentUniverse = useUniverse()

    const navContext = useContext(Navigator.Context)

    const sharedTypeOfAllArticles = props.articles.every(article => article.articleType === props.articles[0].articleType) ? props.articles[0].articleType : undefined

    const bars = (backgroundColor: (i: number) => string | undefined): ReactNode => {
        return (
            <div style={{ display: 'flex' }}>
                {leftSpacerCell()}
                {Array.from({ length: numColumns }).map(
                    (_, i) => (
                        <div
                            key={`bar_${i}`}
                            style={{
                                width: `${expandedColumnWidth(i)}%`,
                                height: barHeight,
                                backgroundColor: backgroundColor(i),
                            }}
                        />
                    ),
                )}
            </div>
        )
    }

    const comparisonHeaders = (statNameOverride?: string): ReactNode => {
        return [
            <ComparisonColorBar key="color" highlightIndex={undefined} />,
            <StatisticHeaderCells key="statname" onlyColumns={['statname']} simpleOrdinals={true} totalWidth={100 * (leftMarginPercent - leftBarMargin)} statNameOverride={statNameOverride} />,
            ...Array.from({ length: numColumns })
                .map((_, columnIndex) => [
                    <StatisticHeaderCells key={`headerCells_${columnIndex}`} onlyColumns={onlyColumns} simpleOrdinals={true} totalWidth={columnWidth} />,
                    transposeHistogramSpacer(columnIndex),
                ]),
        ]
    }

    const rowToDisplayForStat = (statIndex: number): ArticleRow => {
        return dataByStatArticle[statIndex].find(row => row.extraStat !== undefined) ?? dataByStatArticle[statIndex][0]
    }

    const valueCells = (articleIndex: number, statIndex: number): ReactNode => {
        return [
            <StatisticRowCells
                key={`rowCells_${articleIndex}_${statIndex}`}
                row={dataByArticleStat[articleIndex][statIndex]}
                longname={names[articleIndex]}
                onlyColumns={onlyColumns}
                blankColumns={validOrdinalsByStat[statIndex] ? [] : ['statistic_ordinal', 'statistic_percentile']}
                simpleOrdinals={true}
                statisticStyle={highlightArticleIndicesByStat[statIndex] === articleIndex ? { backgroundColor: mixWithBackground(colorFromCycle(colors.hueColors, articleIndex), colors.mixPct / 100, colors.background) } : {}}
                onNavigate={(x) => {
                    void navContext.navigate({
                        kind: 'comparison',
                        universe: navContext.universe,
                        longnames: names.map((value, index) => index === articleIndex ? x : value),
                    }, { history: 'push', scroll: { kind: 'none' } })
                }}
                totalWidth={columnWidth}
            />,
            transposeHistogramSpacer(statIndex),
        ]
    }

    const plotProps = (statIndex: number): PlotProps[] => dataByStatArticle[statIndex].map((row, articleIdx) => ({ ...row, color: colorFromCycle(colors.hueColors, articleIdx), shortname: props.articles[articleIdx].shortname }))

    const normalTableContents = (): ReactNode => {
        return (
            <>
                {bars(articleIndex => colorFromCycle(colors.hueColors, articleIndex))}
                <div style={{ display: 'flex' }}>
                    {leftSpacerCell()}
                    {Array.from({ length: props.articles.length }).map((_, articleIndex) => (
                        <ComparisonLongnameCell
                            key={`heading_${articleIndex}`}
                            articleIndex={articleIndex}
                            width={columnWidth}
                            articles={props.articles}
                            names={names}
                            transpose={transpose}
                            sharedTypeOfAllArticles={sharedTypeOfAllArticles}
                        />
                    ))}
                </div>
                {bars(articleIndex => colorFromCycle(colors.hueColors, articleIndex))}

                <TableHeaderContainer>
                    {comparisonHeaders()}
                </TableHeaderContainer>

                {
                    dataByStatArticle.map((articlesStatData, statIndex) => {
                        return (
                            <div key={`TableRowContainer_${statIndex}`}>
                                <TableRowContainer index={statIndex}>
                                    <StatisticNameCell
                                        row={rowToDisplayForStat(statIndex)}
                                        longname={names[0]}
                                        currentUniverse={currentUniverse}
                                        width={100 * (leftMarginPercent - leftBarMargin)}
                                        center={false}
                                        highlightIndex={highlightArticleIndicesByStat[statIndex]}
                                        transpose={transpose}
                                    />
                                    {dataByStatArticle[statIndex].map((_, articleIndex) => {
                                        return valueCells(articleIndex, statIndex)
                                    })}
                                </TableRowContainer>
                                {expandedByStatIndex[statIndex]
                                    ? (
                                            <div style={{ width: '100%', position: 'relative' }}>
                                                <RenderedPlot statDescription={articlesStatData[0].renderedStatname} plotProps={plotProps(statIndex)} />
                                            </div>
                                        )
                                    : null}
                            </div>
                        )
                    })
                }
            </>
        )
    }

    const transposeTableContents = (): ReactNode => {
        const someExpanded = expandedByStatIndex.some(e => e)
        const headerHeight = transposeSettingsHeight
        const contentHeight = '379.5px'

        return (
            <>
                {bars(
                    statIndex => highlightArticleIndicesByStat[statIndex] !== undefined ? colorFromCycle(colors.hueColors, highlightArticleIndicesByStat[statIndex]) : undefined,
                )}
                <div style={{
                    display: 'flex',
                    flexDirection: 'row' }}
                >
                    {leftSpacerCell()}
                    {
                        dataByStatArticle.map((_, statIndex) => {
                            return (
                                <StatisticNameCell
                                    key={`statName_${statIndex}`}
                                    row={rowToDisplayForStat(statIndex)}
                                    longname={names[0]}
                                    currentUniverse={currentUniverse}
                                    width={expandedColumnWidth(statIndex)}
                                    center={true}
                                    transpose={transpose}
                                />
                            )
                        })
                    }
                </div>

                <div style={{ position: 'relative', minHeight: someExpanded ? `calc(${headerHeight} + ${contentHeight})` : undefined }}>

                    <TableHeaderContainer>
                        {comparisonHeaders('Region')}
                    </TableHeaderContainer>

                    {props.articles.map((_: Article, articleIndex: number) => {
                        return (
                            <TableRowContainer key={`TableRowContainer_${articleIndex}`} index={articleIndex} minHeight={someExpanded ? `calc(${contentHeight} / ${props.articles.length})` : undefined}>
                                <ComparisonColorBar highlightIndex={articleIndex} />
                                <ComparisonLongnameCell
                                    articleIndex={articleIndex}
                                    width={(leftMarginPercent - 2 * leftBarMargin) * 100}
                                    articles={props.articles}
                                    names={names}
                                    transpose={transpose}
                                    sharedTypeOfAllArticles={sharedTypeOfAllArticles}
                                />
                                <ComparisonColorBar highlightIndex={articleIndex} />
                                { dataByArticleStat[articleIndex].map((stat: ArticleRow, statIndex: number) => {
                                    return valueCells(articleIndex, statIndex)
                                })}
                            </TableRowContainer>
                        )
                    })}
                    {dataByStatArticle.map((rows, statIndex) => {
                        if (!expandedByStatIndex[statIndex]) {
                            return null
                        }
                        // Must account for other expanded columns
                        const leftPercent = 100 * leftMarginPercent + Array.from({ length: statIndex }).reduce((acc: number, _, i) => acc + expandedColumnWidth(i), columnWidth)
                        return (
                            <div key={`statPlot_${statIndex}`} style={{ position: 'absolute', top: 0, left: `${leftPercent}%`, bottom: 0, width: `${columnWidth}%` }}>
                                <RenderedPlot statDescription={rows[0].renderedStatname} plotProps={plotProps(statIndex)} />
                            </div>
                        )
                    })}
                </div>
            </>
        )
    }

    return (
        <TransposeContext.Provider value={transpose}>
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
                                prioritizeArticleType={sharedTypeOfAllArticles}
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
                        <ComparisonMultiMap
                            longnames={props.articles.map(x => x.longname)}
                            colors={props.articles.map((_, i) => colorFromCycle(colors.hueColors, i))}
                            basemap={{ type: 'osm' }}
                            mapPartitions={props.mapPartitions}
                        />
                    </div>
                </div>
            </PageTemplate>
        </TransposeContext.Provider>
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

function ComparisonMultiMap(props: Omit<MapGenericProps, 'attribution'> & { longnames: string[], colors: string[], mapPartitions: number[][] }): ReactNode {
    const partitionedLongNames = props.mapPartitions.map(partition => partition.map(longnameIndex => props.longnames[longnameIndex]))

    const maps = useRef<(ComparisonMap | null)[]>([])

    // Want to re-zoom the maps when the partitioning changes
    useEffect(() => {
        const timeout = setTimeout(() => {
            for (const map of maps.current) {
                if (map !== null) {
                    try {
                        map.zoomToAll()
                    }
                    catch (e) {
                        // Sometimes this fails if the map isn't ready
                        console.warn(e)
                    }
                }
            }
        }, 0)
        return () => { clearTimeout(timeout) }
    }, [partitionedLongNames])

    // Will get filled up on render immediately after
    maps.current = Array<null>(props.mapPartitions.length).fill(null)

    /*
     If mobile, make 2 columns, if one at the end, use full width

     If desktop, make 3 columns, if 4 at the end, make 4, if 2 at the end, make 2 (there will never be 1 at the end because that's 4)
     */
    const isMobile = useMobileLayout()
    const rows: [number, number[]][][] = useMemo(() => {
        const slice = (from: number, to: number): [number, number[]][] => {
            return props.mapPartitions.slice(from, to).map((partition, sliceIndex) => [from + sliceIndex, partition])
        }

        if (isMobile) {
            const result: [number, number[]][][] = []
            for (let i = 0; i < props.mapPartitions.length; i += 2) {
                result.push(slice(i, i + 2))
            }
            return result
        }
        else {
            const result: [number, number[]][][] = []
            for (let i = 0; i < props.mapPartitions.length; i += 3) {
                if (props.mapPartitions.length - i === 4) {
                    result.push(
                        slice(i, i + 2),
                        slice(i + 2, i + 4),
                    )
                    i += 1
                }
                else {
                    result.push(slice(i, i + 3))
                }
            }
            return result
        }
    }, [isMobile, props.mapPartitions])

    return rows.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', width: '100%' }}>
            {row.map(([partitionIndex, partition]) => {
                return (
                    <div key={partitionIndex} style={{ position: 'relative', width: `${100 / row.length}%` }}>
                        <ComparisonMap
                            ref={map => maps.current[partitionIndex] = map}
                            {...props}
                            longnames={partition.map(index => props.longnames[index])}
                            colors={partition.map(index => props.colors[index])}
                            attribution={
                                partitionIndex === props.mapPartitions.length - 1 ? 'startVisible' : 'none'
                            }
                        />
                    </div>
                )
            })}
        </div>
    ))
}

// eslint-disable-next-line prefer-function-component/prefer-function-component -- TODO: Maps don't support function components yet.
class ComparisonMap extends MapGeneric<MapGenericProps & { longnames: string[], colors: string[] }> {
    override buttons(): ReactNode {
        return <ComparisonMapButtons map={this} />
    }

    zoomButton(i: number, buttonColor: string, onClick: () => void): ReactNode {
        return (
            <div
                key={`zoomButton_${i}`}
                style={{
                    display: 'inline-block', width: '2em', height: '2em',
                    backgroundColor: buttonColor, borderRadius: '50%', marginLeft: '5px', marginRight: '5px',
                    cursor: 'pointer',
                }}
                onClick={onClick}
            />
        )
    }

    override computeShapesToRender(): Promise<ShapeRenderingSpec> {
        return Promise.resolve({
            shapes: this.props.longnames.map((longname, i) => ({
                name: longname,
                spec: { type: 'polygon', style: { color: this.props.colors[i], fillColor: this.props.colors[i], fillOpacity: 0.5, weight: 1 } },
                meta: {},
            })),
            zoomIndex: -1,
        })
    }

    override mapDidRender(): Promise<void> {
        this.zoomToAll({ animate: false })
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
