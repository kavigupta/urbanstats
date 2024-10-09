import '../common.css'
import './article.css'

import React, { ReactNode, useRef } from 'react'

import { article_link, comparison_link, sanitize } from '../navigation/links'
import { useSetting, useTableCheckboxSettings } from '../page_template/settings'
import { PageTemplate } from '../page_template/template'
import { longname_is_exclusively_american, useUniverse } from '../universe'
import { Article, IRelatedButtons } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { load_article } from './load-article'
import { Map } from './map'
import { Related } from './related-button'
import { ScreencapElements } from './screenshot'
import { SearchBox } from './search'
import { StatisticRowRaw } from './table'

export function ArticlePanel({ article }: { article: Article }): ReactNode {
    const headers_ref = useRef<HTMLDivElement>(null)
    const table_ref = useRef<HTMLDivElement>(null)
    const map_ref = useRef<HTMLDivElement>(null)

    const screencap_elements = (): ScreencapElements => ({
        path: `${sanitize(article.longname)}.png`,
        overall_width: table_ref.current!.offsetWidth * 2,
        elements_to_render: [headers_ref.current!, table_ref.current!, map_ref.current!],
    })

    const headerTextClass = useHeaderTextClass()
    const subHeaderTextClass = useSubHeaderTextClass()
    const comparisonHeadStyle = useComparisonHeadStyle('right')

    return (
        <PageTemplate screencap_elements={screencap_elements} has_universe_selector={true} universes={article.universes}>
            {template_info => (
                <div>
                    <div ref={headers_ref}>
                        <div className={headerTextClass}>{article.shortname}</div>
                        <div className={subHeaderTextClass}>{article.longname}</div>
                    </div>
                    <div style={{ marginBlockEnd: '16px' }}></div>

                    <div className="stats_table" ref={table_ref}>
                        <StatisticRowHeader screenshot_mode={template_info.screenshot_mode} />
                        <ArticlePanelRows
                            longname={article.longname}
                            shortname={article.shortname}
                            article_row={article}
                            screenshot_mode={template_info.screenshot_mode}
                        />
                    </div>

                    <p></p>

                    <div ref={map_ref}>
                        <Map
                            longname={article.longname}
                            related={article.related as NormalizeProto<IRelatedButtons>[]}
                            article_type={article.articleType}
                            basemap={{ type: 'osm' }}
                        />
                    </div>

                    <div style={{ marginBlockEnd: '1em' }}></div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '30%', marginRight: '1em' }}>
                            <div className="serif" style={comparisonHeadStyle}>Compare to: </div>
                        </div>
                        <div style={{ width: '70%' }}>
                            <ComparisonSearchBox longname={article.longname} />
                        </div>
                    </div>

                    <script src="/scripts/map.js"></script>

                    <Related
                        related={article.related as NormalizeProto<IRelatedButtons>[]}
                        article_type={article.articleType}
                    />
                </div>
            )}
        </PageTemplate>
    )
}

function ComparisonSearchBox({ longname }: { longname: string }): ReactNode {
    const curr_universe = useUniverse()
    return (
        <SearchBox
            style={{ ...useComparisonHeadStyle(), width: '100%' }}
            placeholder="Other region..."
            on_change={(x) => {
                document.location.href = comparison_link(
                    curr_universe,
                    [longname, x])
            }}
            autoFocus={false}
        />
    )
}

function StatisticRowHeader(props: { screenshot_mode: boolean }): ReactNode {
    const [simple_ordinals] = useSetting('simple_ordinals')
    return <StatisticRowRaw index={0} _idx={-1} is_header={true} simple={simple_ordinals} screenshot_mode={props.screenshot_mode} />
}

function ArticlePanelRows(props: { article_row: Article, longname: string, shortname: string, screenshot_mode: boolean }): ReactNode {
    const curr_universe = useUniverse()
    const settings = useTableCheckboxSettings()
    const [simple_ordinals] = useSetting('simple_ordinals')
    const [filtered_rows] = load_article(curr_universe, props.article_row, settings,
        longname_is_exclusively_american(props.longname))
    return (
        <>
            {filtered_rows.map((row, i) => (
                <StatisticRowRaw
                    is_header={false}
                    _idx={i}
                    key={row.statname}
                    index={i}
                    {...row}
                    onReplace={(x) => { document.location = article_link(curr_universe, x) }}
                    simple={simple_ordinals}
                    longname={props.longname}
                    shortname={props.shortname}
                    screenshot_mode={props.screenshot_mode}
                />
            ))}
        </>
    )
}
