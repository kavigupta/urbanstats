import '../common.css'
import './article.css'

import React, { ReactNode, useContext, useEffect, useRef } from 'react'

import { sanitize } from '../navigation/links'
import { NavigationContext } from '../navigation/navigator'
import { HueColors, useColors } from '../page_template/colors'
import { row_expanded_key, useSetting, useSettings } from '../page_template/settings'
import { groupYearKeys, StatPathsContext } from '../page_template/statistic-settings'
import { PageTemplate } from '../page_template/template'
import { useUniverse } from '../universe'
import { mixWithBackground } from '../utils/color'
import { Article } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'

import { ArticleWarnings } from './ArticleWarnings'
import { ArticleComparisonQuerySettingsConnection } from './QuerySettingsConnection'
import { ArticleRow, load_articles } from './load-article'
import { MapGeneric, MapGenericProps, Polygons } from './map'
import { WithPlot } from './plots'
import { ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { TableRowContainer, StatisticRowCells, TableHeaderContainer, StatisticHeaderCells, ColumnIdentifier } from './table'

const left_bar_margin = 0.02
const left_margin_pct = 0.18
const bar_height = '5px'

export function ComparisonPanel(props: { universes: string[], articles: Article[] }): ReactNode {
    const colors = useColors()
    const table_ref = useRef<HTMLDivElement>(null)
    const map_ref = useRef(null)

    const joined_string = props.articles.map(x => x.shortname).join(' vs ')
    const names = props.articles.map(a => a.longname)

    const screencap_elements = (): ScreencapElements => ({
        path: `${sanitize(joined_string)}.png`,
        overall_width: table_ref.current!.offsetWidth * 2,
        elements_to_render: [table_ref.current!, map_ref.current!],
    })

    const left_margin = (): number => {
        return 100 * left_margin_pct
    }

    const cell = (is_left: boolean, i: number, contents: React.ReactNode): ReactNode => {
        if (is_left) {
            return (
                <div key={i} style={{ width: `${left_margin()}%` }}>
                    {contents}
                </div>
            )
        }
        const width = `${each(props.articles)}%`
        return (
            <div key={i} style={{ width }}>
                {contents}
            </div>
        )
    }

    const bars = (): ReactNode => {
        return (
            <div style={{ display: 'flex' }}>
                {cell(true, 0, <div></div>)}
                {props.articles.map(
                    (data, i) => (
                        <div
                            key={i}
                            style={{
                                width: `${each(props.articles)}%`,
                                height: bar_height,
                                backgroundColor: color(colors.hueColors, i),
                            }}
                        />
                    ),
                )}
            </div>
        )
    }

    const mobileLayout = useMobileLayout()

    const allArticlesOfSameType = props.articles.every(article => article.articleType === props.articles[0].articleType)

    const onlyColumns: ColumnIdentifier[] = allArticlesOfSameType ? ['statval', 'statval_unit', 'statistic_ordinal', 'statistic_percentile'] : ['statval', 'statval_unit']

    const maxColumns = mobileLayout ? 4 : 6

    const widthColumns = (allArticlesOfSameType ? 1.5 : 1) * props.articles.length + 1

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
    const settings = useSettings(groupYearKeys())

    const curr_universe = useUniverse()

    const { rows, statPaths } = load_articles(props.articles, curr_universe, settings)

    useEffect(() => {
        document.title = joined_string
    }, [joined_string])

    const navContext = useContext(NavigationContext)!

    return (
        <StatPathsContext.Provider value={statPaths}>
            <ArticleComparisonQuerySettingsConnection pageKind="comparison" />
            <PageTemplate screencap_elements={screencap_elements} has_universe_selector={true} universes={props.universes}>
                <div>
                    <div className={headerTextClass}>Comparison</div>
                    <div className={subHeaderTextClass}>{joined_string}</div>
                    <div style={{ marginBlockEnd: '16px' }}></div>

                    <div style={{ display: 'flex' }}>
                        <div style={{ width: `${100 * left_margin_pct}%` }} />
                        <div style={{ width: `${50 * (1 - left_margin_pct)}%`, marginRight: '1em' }}>
                            <div className="serif" style={comparisonRightStyle}>Add another region:</div>
                        </div>
                        <div style={{ width: `${50 * (1 - left_margin_pct)}%` }}>
                            <SearchBox
                                style={{ ...searchComparisonStyle, width: '100%' }}
                                placeholder="Name"
                                on_change={(x) => {
                                    navContext.navigate({
                                        kind: 'comparison',
                                        universe: curr_universe,
                                        longnames: [...names, x],
                                    }, 'push')
                                }}
                                autoFocus={false}
                            />
                        </div>
                    </div>

                    <div style={{ marginBlockEnd: '1em' }}></div>

                    {maybeScroll(
                        <div ref={table_ref}>
                            {bars()}
                            <div style={{ display: 'flex' }}>
                                {cell(true, 0, <div></div>)}
                                {props.articles.map(
                                    (data, i) => cell(false, i,
                                        <div>
                                            <HeadingDisplay
                                                longname={data.longname}
                                                include_delete={props.articles.length > 1}
                                                on_click={() => {
                                                    navContext.navigate({
                                                        kind: 'comparison',
                                                        universe: curr_universe,
                                                        longnames: names.filter((_, index) => index !== i),
                                                    }, 'push')
                                                }}
                                                on_change={(x) => {
                                                    navContext.navigate({
                                                        kind: 'comparison',
                                                        universe: curr_universe,
                                                        longnames: names.map((value, index) => index === i ? x : value),
                                                    }, 'push')
                                                }}
                                            />
                                        </div>,
                                    ),
                                )}
                            </div>
                            {bars()}

                            <TableHeaderContainer>
                                <ComparisonHeaders onlyColumns={onlyColumns} length={props.articles.length} />
                            </TableHeaderContainer>

                            {
                                rows[0].map((_, row_idx) => (
                                    <ComparisonRowBody
                                        key={rows[0][row_idx].statpath}
                                        index={row_idx}
                                        rows={rows.map(row => row[row_idx])}
                                        articles={props.articles}
                                        names={names}
                                        onlyColumns={onlyColumns}
                                    />
                                ),
                                )
                            }
                            <ArticleWarnings />
                        </div>,
                    )}
                    <div className="gap"></div>

                    <div ref={map_ref}>
                        <ComparisonMap
                            longnames={props.articles.map(x => x.longname)}
                            colors={props.articles.map((_, i) => color(colors.hueColors, i))}
                            basemap={{ type: 'osm' }}
                        />
                    </div>
                </div>
            </PageTemplate>
        </StatPathsContext.Provider>
    )
}

function color(colors: HueColors, i: number): string {
    const color_cycle = [
        colors.blue,
        colors.orange,
        colors.purple,
        colors.red,
        colors.grey,
        colors.pink,
        colors.yellow,
        colors.green,
    ]
    return color_cycle[i % color_cycle.length]
}

function each({ length }: { length: number }): number {
    return 100 * (1 - left_margin_pct) / length
}

function ComparisonRowBody({ rows, articles, names, onlyColumns, index }: {
    rows: ArticleRow[]
    articles: Article[]
    names: string[]
    onlyColumns: ColumnIdentifier[]
    index: number
}): ReactNode {
    const colors = useColors()
    const [expanded] = useSetting(row_expanded_key(rows[0].statpath))
    const plot_props = rows.map((row, data_idx) => ({ ...row, color: color(colors.hueColors, data_idx), shortname: articles[data_idx].shortname }))
    return (
        <WithPlot plot_props={plot_props} expanded={expanded ?? false}>
            <TableRowContainer index={index}>
                <ComparisonCells
                    rows={rows}
                    names={names}
                    onlyColumns={onlyColumns}
                />
            </TableRowContainer>
        </WithPlot>
    )
}

function ComparisonCells({ names, rows, onlyColumns }: {
    names: string[]
    rows: ArticleRow[]
    onlyColumns: ColumnIdentifier[]
}): ReactNode {
    const colors = useColors()
    const navContext = useContext(NavigationContext)!

    const highlightIndex = rows.map(x => x.statval).reduce<number | undefined>((iMax, x, i, arr) => {
        if (isNaN(x)) {
            return iMax
        }
        if (iMax === undefined) {
            return i
        }
        return x > arr[iMax] ? i : iMax
    }, undefined)

    return [
        <ComparisonColorBar key="color" highlightIndex={highlightIndex} />,
        <StatisticRowCells
            key="statname"
            onlyColumns={['statname']}
            longname={names[0]}
            totalWidth={100 * (left_margin_pct - left_bar_margin)}
            row={rows.find(row => row.extra_stat !== undefined) ?? rows[0]} // So that we show the expand if there's a least one extra
            simpleOrdinals={true}
        />,
        ...rows.map((row, i) => (
            <StatisticRowCells
                key={names[i]}
                row={row}
                longname={names[i]}
                onlyColumns={onlyColumns}
                simpleOrdinals={true}
                statisticStyle={highlightIndex === i ? { backgroundColor: mixWithBackground(color(colors.hueColors, i), colors.mixPct / 100, colors.background) } : {}}
                onNavigate={(x) => {
                    navContext.navigate({
                        kind: 'comparison',
                        universe: navContext.universe!,
                        longnames: names.map((value, index) => index === i ? x : value),
                    }, 'push')
                }}
                totalWidth={each(rows)}
            />
        )),
    ]
}

function ComparisonHeaders({ onlyColumns, length }: { onlyColumns: ColumnIdentifier[], length: number }): ReactNode {
    return [
        <ComparisonColorBar key="color" highlightIndex={undefined} />,
        <StatisticHeaderCells key="statname" onlyColumns={['statname']} simpleOrdinals={true} totalWidth={100 * (left_margin_pct - left_bar_margin)} />,
        ...Array.from({ length })
            .map((_, index) => <StatisticHeaderCells key={index} onlyColumns={onlyColumns} simpleOrdinals={true} totalWidth={each({ length })} />),
    ]
}

function ComparisonColorBar({ highlightIndex }: { highlightIndex: number | undefined }): ReactNode {
    const colors = useColors()

    return (
        <div
            key="color"
            style={{
                width: `${100 * left_bar_margin}%`,
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

const manipulation_button_height = '24px'

function ManipulationButton({ color: buttonColor, on_click, text }: { color: string, on_click: () => void, text: string }): ReactNode {
    return (
        <div
            style={{
                height: manipulation_button_height,
                lineHeight: manipulation_button_height,
                cursor: 'pointer',
                paddingLeft: '0.5em', paddingRight: '0.5em',
                borderRadius: '0.25em',
                verticalAlign: 'middle',
                backgroundColor: buttonColor,
            }}
            className={`serif manipulation-button-${text}`}
            onClick={on_click}
        >
            {text}
        </div>
    )
}

function HeadingDisplay({ longname, include_delete, on_click, on_change: on_search_change }: { longname: string, include_delete: boolean, on_click: () => void, on_change: (q: string) => void }): ReactNode {
    const colors = useColors()
    const [is_editing, set_is_editing] = React.useState(false)
    const curr_universe = useUniverse()
    const comparisonHeadStyle = useComparisonHeadStyle()

    const manipulation_buttons = (
        <div style={{ height: manipulation_button_height }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', height: '100%' }}>
                <ManipulationButton color={colors.unselectedButton} on_click={() => { set_is_editing(!is_editing) }} text="replace" />
                {!include_delete
                    ? null
                    : (
                            <>
                                <div style={{ width: '5px' }} />
                                <ManipulationButton color={colors.unselectedButton} on_click={on_click} text="delete" />
                            </>
                        )}
                <div style={{ width: '5px' }} />
            </div>
        </div>
    )

    const screenshot_mode = useScreenshotMode()

    const navContext = useContext(NavigationContext)!

    return (
        <div>
            {screenshot_mode ? undefined : manipulation_buttons}
            <div style={{ height: '5px' }} />
            <a
                className="serif"
                {
                    ...navContext.link({
                        kind: 'article',
                        longname,
                        universe: curr_universe,
                    })
                }
                style={{ textDecoration: 'none' }}
            >
                <div style={useComparisonHeadStyle()}>{longname}</div>
            </a>
            {is_editing
                ? (
                        <SearchBox
                            autoFocus={true}
                            style={{ ...comparisonHeadStyle, width: '100%' }}
                            placeholder="Replacement"
                            on_change={on_search_change}
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

    zoom_button(i: number, buttonColor: string, onClick: () => void): ReactNode {
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

    override compute_polygons(): Promise<Polygons> {
        const names = []
        const styles = []

        for (const i of this.props.longnames.keys()) {
            names.push(this.props.longnames[i])
            styles.push({ color: this.props.colors[i], fillColor: this.props.colors[i], fillOpacity: 0.5, weight: 1 })
        }

        const zoom_index = -1

        const metas = names.map(() => { return {} })

        return Promise.resolve([names, styles, metas, zoom_index])
    }

    override mapDidRender(): Promise<void> {
        this.zoom_to_all()
        return Promise.resolve()
    }
}

export function ComparisonMapButtons(props: { map: ComparisonMap }): ReactNode {
    const colors = useColors()
    return (
        <div style={{
            display: 'flex', backgroundColor: colors.background, padding: '0.5em', borderRadius: '0.5em',
            alignItems: 'center',
        }}
        >
            <span className="serif" style={{ fontSize: '15px', fontWeight: 500 }}>Zoom to:</span>
            <div style={{ width: '0.25em' }} />
            {props.map.zoom_button(-1, colors.textMain, () => { props.map.zoom_to_all() })}
            {props.map.props.longnames.map((longname, i) => {
                return props.map.zoom_button(i, props.map.props.colors[i], () => { props.map.zoom_to(longname) })
            })}
        </div>
    )
}
