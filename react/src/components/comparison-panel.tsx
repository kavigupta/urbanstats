import '../common.css'
import './article.css'

import React, { CSSProperties, ReactNode, useContext, useRef } from 'react'

import { Navigator } from '../navigation/Navigator'
import { sanitize } from '../navigation/links'
import { HueColors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { rowExpandedKey, useSettings } from '../page_template/settings'
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
import { PlotProps, RenderedPlot } from './plots'
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

    const expandedSettings = useSettings(dataByArticleStat[0].filter(row => row.extraStat !== undefined).map(row => rowExpandedKey(row.statpath)))

    const expandedByStatIndex = dataByStatArticle.map(([{ statpath }]) => expandedSettings[rowExpandedKey(statpath)] ?? false)

    const widthColumns = (includeOrdinals ? 1.5 : 1) * props.articles.length + 1

    const leftMarginPercent = 0.18
    const numColumns = props.articles.length
    const columnWidth = 100 * (1 - leftMarginPercent) / (numColumns)

    const leftSpacerCell = (): ReactNode => {
        return <div style={{ width: `${leftMarginPercent * 100}%` }}></div>
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

    const heading = (articleIndex: number, width: number): ReactNode => {
        return (
            <div key={props.articles[articleIndex].longname} style={{ width: `${width}%` }}>
                <HeadingDisplay
                    longname={props.articles[articleIndex].longname}
                    includeDelete={props.articles.length > 1}
                    onDelete={() => {
                        void navContext.navigate({
                            kind: 'comparison',
                            universe: currentUniverse,
                            longnames: names.filter((_, index) => index !== articleIndex),
                        }, { history: 'push', scroll: { kind: 'none' } })
                    }}
                    onReplace={x =>
                        navContext.link({
                            kind: 'comparison',
                            universe: currentUniverse,
                            longnames: names.map((value, index) => index === articleIndex ? x : value),
                        }, { scroll: { kind: 'none' } })}
                    manipulationJustify="flex-end"
                />
            </div>
        )
    }

    const bars = (backgroundColor: (i: number) => string | undefined): ReactNode => {
        return (
            <div style={{ display: 'flex' }}>
                {leftSpacerCell()}
                {Array.from({ length: numColumns }).map(
                    (_, i) => (
                        <div
                            key={i}
                            style={{
                                width: `${columnWidth}%`,
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
                    <StatisticHeaderCells key={columnIndex} onlyColumns={onlyColumns} simpleOrdinals={true} totalWidth={columnWidth} />,
                ]),
        ]
    }

    const statName = (statIndex: number, width: number, center: boolean): ReactNode => {
        const nameRow = dataByStatArticle[statIndex].find(row => row.extraStat !== undefined) ?? dataByStatArticle[statIndex][0]
        return (
            <div key={nameRow.statpath} style={{ ...comparisonHeadStyle, width: `${width}%` }}>
                <StatisticName
                    row={nameRow} // So that we show the expand if there's a least one extra
                    longname={names[0]}
                    currentUniverse={currentUniverse}
                    center={center}
                />
            </div>
        )
    }

    const valueCells = (articleIndex: number, statIndex: number): ReactNode => {
        return [
            <StatisticRowCells
                key={`${names[articleIndex]}${dataByArticleStat[articleIndex][statIndex].statpath}`}
                row={dataByArticleStat[articleIndex][statIndex]}
                longname={names[articleIndex]}
                onlyColumns={onlyColumns}
                blankColumns={validOrdinalsByStat[statIndex] ? [] : ['statistic_ordinal', 'statistic_percentile']}
                simpleOrdinals={true}
                statisticStyle={highlightArticleIndicesByStat[statIndex] === articleIndex ? { backgroundColor: mixWithBackground(color(colors.hueColors, articleIndex), colors.mixPct / 100, colors.background) } : {}}
                onNavigate={(x) => {
                    void navContext.navigate({
                        kind: 'comparison',
                        universe: navContext.universe,
                        longnames: names.map((value, index) => index === articleIndex ? x : value),
                    }, { history: 'push', scroll: { kind: 'none' } })
                }}
                totalWidth={columnWidth}
            />,
        ]
    }

    const plotProps = (statIndex: number): PlotProps[] => dataByStatArticle[statIndex].map((row, articleIdx) => ({ ...row, color: color(colors.hueColors, articleIdx), shortname: props.articles[articleIdx].shortname }))

    const normalTableContents = (): ReactNode => {
        return (
            <>
                {bars(articleIndex => color(colors.hueColors, articleIndex))}
                <div style={{ display: 'flex' }}>
                    {leftSpacerCell()}
                    {Array.from({ length: props.articles.length }).map((_, articleIndex) => heading(articleIndex, columnWidth))}
                </div>
                {bars(articleIndex => color(colors.hueColors, articleIndex))}

                <TableHeaderContainer>
                    {comparisonHeaders()}
                </TableHeaderContainer>

                {
                    dataByStatArticle.map((articlesStatData, statIndex) => {
                        return (
                            <div key={articlesStatData[0].statpath}>
                                <TableRowContainer index={statIndex}>
                                    <ComparisonColorBar key="color" highlightIndex={highlightArticleIndicesByStat[statIndex]} />
                                    {statName(statIndex, 100 * (leftMarginPercent - leftBarMargin), false)}
                                    {dataByStatArticle[statIndex].map((_, articleIndex) => {
                                        return valueCells(articleIndex, statIndex)
                                    })}
                                </TableRowContainer>
                                {expandedByStatIndex[statIndex]
                                    ? (
                                            <div style={{ width: '100%', position: 'relative' }}>
                                                <RenderedPlot plotProps={plotProps(statIndex)} />
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

    const comparisonHeadStyle = useComparisonHeadStyle()

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
                            {normalTableContents()}
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

function HeadingDisplay({ longname, includeDelete, onDelete, onReplace, manipulationJustify }: {
    longname: string
    includeDelete: boolean
    onDelete: () => void
    onReplace: (q: string) => ReturnType<Navigator['link']>
    manipulationJustify: CSSProperties['justifyContent']
}): ReactNode {
    const colors = useColors()
    const [isEditing, setIsEditing] = React.useState(false)
    const currentUniverse = useUniverse()
    const comparisonHeadStyle = useComparisonHeadStyle()

    const manipulationButtons = (
        <div style={{ height: manipulationButtonHeight }}>
            <div style={{ display: 'flex', justifyContent: manipulationJustify, height: '100%' }}>
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
