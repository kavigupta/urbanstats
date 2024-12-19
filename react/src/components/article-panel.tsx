import '../common.css'
import './article.css'

import React, { ReactNode, useContext, useEffect, useRef } from 'react'

import { sanitize } from '../navigation/links'
import { Navigator } from '../navigation/navigator'
import { useColors } from '../page_template/colors'
import { rowExpandedKey, useSetting, useSettings } from '../page_template/settings'
import { groupYearKeys, StatGroupSettings } from '../page_template/statistic-settings'
import { PageTemplate } from '../page_template/template'
import { useUniverse } from '../universe'
import { Article, IRelatedButtons } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { ArticleWarnings } from './ArticleWarnings'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { ArticleRow } from './load-article'
import { Map } from './map'
import { WithPlot } from './plots'
import { Related } from './related-button'
import { ScreencapElements } from './screenshot'
import { SearchBox } from './search'
import { StatisticHeaderCells, StatisticRowCells, TableHeaderContainer, TableRowContainer } from './table'

export function ArticlePanel({ article, rows }: { article: Article, rows: (settings: StatGroupSettings) => ArticleRow[][] }): ReactNode {
    const headersRef = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<HTMLDivElement>(null)

    const screencapElements = (): ScreencapElements => ({
        path: `${sanitize(article.longname)}.png`,
        overallWidth: tableRef.current!.offsetWidth * 2,
        elementsToRender: [headersRef.current!, tableRef.current!, mapRef.current!],
    })

    const headerTextClass = useHeaderTextClass()
    const subHeaderTextClass = useSubHeaderTextClass()
    const comparisonHeadStyle = useComparisonHeadStyle('right')

    const settings = useSettings(groupYearKeys())
    const filteredRows = rows(settings)[0]

    useEffect(() => {
        document.title = article.shortname
    }, [article.shortname])

    return (
        <>
            <QuerySettingsConnection />
            <PageTemplate screencapElements={screencapElements} hasUniverseSelector={true} universes={article.universes}>
                <div>
                    <div ref={headersRef}>
                        <div className={headerTextClass}>{article.shortname}</div>
                        <div className={subHeaderTextClass}>{article.longname}</div>
                    </div>
                    <div style={{ marginBlockEnd: '16px' }}></div>

                    <div className="stats_table" ref={tableRef}>
                        <StatisticTableHeader />
                        {filteredRows.map((row, index) => (
                            <StatisticTableRow
                                row={row}
                                index={index}
                                key={row.statpath}
                                longname={article.longname}
                                shortname={article.shortname}
                            />
                        ))}
                        <ArticleWarnings />
                    </div>

                    <p></p>

                    <div ref={mapRef}>
                        <Map
                            longname={article.longname}
                            related={article.related as NormalizeProto<IRelatedButtons>[]}
                            articleType={article.articleType}
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
                        articleType={article.articleType}
                    />
                </div>
            </PageTemplate>
        </>
    )
}

function ComparisonSearchBox({ longname }: { longname: string }): ReactNode {
    const currentUniverse = useUniverse()
    const navContext = useContext(Navigator.Context)
    return (
        <SearchBox
            style={{ ...useComparisonHeadStyle(), width: '100%' }}
            placeholder="Other region..."
            link={x => navContext.link({
                kind: 'comparison',
                universe: currentUniverse,
                longnames: [longname, x],
            })}
            autoFocus={false}
        />
    )
}

function StatisticTableHeader(): ReactNode {
    const [simpleOrdinals] = useSetting('simple_ordinals')
    return (
        <TableHeaderContainer>
            <StatisticHeaderCells simpleOrdinals={simpleOrdinals} totalWidth={100} />
        </TableHeaderContainer>
    )
}

function StatisticTableRow(props: { shortname: string, longname: string, row: ArticleRow, index: number }): ReactNode {
    const colors = useColors()
    const [expanded] = useSetting(rowExpandedKey(props.row.statpath))
    const currentUniverse = useUniverse()
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const navContext = useContext(Navigator.Context)

    return (
        <WithPlot plotProps={[{ ...props.row, color: colors.hueColors.blue, shortname: props.shortname }]} expanded={expanded ?? false}>
            <TableRowContainer index={props.index}>
                <StatisticRowCells
                    totalWidth={100}
                    longname={props.longname}
                    row={props.row}
                    onNavigate={(newArticle) => {
                        void navContext.navigate({
                            kind: 'article',
                            longname: newArticle,
                            universe: currentUniverse,
                        }, 'push')
                    }}
                    simpleOrdinals={simpleOrdinals}
                />
            </TableRowContainer>
        </WithPlot>
    )
}
