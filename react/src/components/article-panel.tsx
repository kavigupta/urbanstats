import '../common.css'
import './article.css'

import React, { ReactNode, useContext, useMemo, useRef } from 'react'

import { Navigator } from '../navigation/Navigator'
import { StatGroupSettings } from '../page_template/statistic-settings'
import { PageTemplate } from '../page_template/template'
import { Universe, universeContext, useUniverse } from '../universe'
import { sanitize } from '../utils/paths'
import { Article, IRelatedButtons } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { ArticleMap } from './ArticleMap'
import { ExternalLinks } from './ExternalLiinks'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { StagingControls } from './StagingControls'
import { ArticleEditTable } from './article-edit-table'
import { ArticleTable } from './article-table'
import { useCSVExport } from './csv-export'
import { useEditModeState } from './edit-table'
import { ArticleRow } from './load-article'
import { Related } from './related-button'
import { createScreenshot, ScreencapElements } from './screenshot'
import { SearchBox } from './search'

export function ArticlePanel({ article, rows, universe }: { article: Article, rows: (settings: StatGroupSettings) => ArticleRow[][], universe: Universe }): ReactNode {
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

    const articles = useMemo(() => [article], [article])
    const csvExportCallback = useCSVExport(articles, rows, () => true, article.longname)

    const navigator = useContext(Navigator.Context)

    // Held here rather than in the table section so the staging banner, which leaves edit
    // mode, can render outside tableRef and stay out of screenshots.
    const editState = useEditModeState()

    return (
        <universeContext.Provider value={{
            universes: article.universes as readonly Universe[],
            universe,
            setUniverse(newUniverse) {
                void navigator.navigate({
                    kind: 'article',
                    longname: article.longname,
                    universe: newUniverse,
                }, { history: 'push', scroll: { kind: 'none' } })
            },

        }}
        >
            <QuerySettingsConnection />
            <PageTemplate
                screencap={(...args) => createScreenshot(screencapElements, ...args)}
                csvExportCallback={csvExportCallback}
            >
                <div>
                    <div ref={headersRef}>
                        <div className={headerTextClass}>{article.shortname}</div>
                        <div className={subHeaderTextClass}>{article.longname}</div>
                    </div>
                    <div style={{ marginBlockEnd: '16px' }}></div>

                    <StagingControls onExitStaging={editState.exitEditMode} />

                    <div ref={tableRef}>
                        <div className="stats_table">
                            {editState.editMode
                                ? (
                                        <ArticleEditTable
                                            rows={rows}
                                            article={article}
                                            editState={editState}
                                        />
                                    )
                                : (
                                        <ArticleTable
                                            rows={rows}
                                            article={article}
                                            onEdit={() => { editState.setEditMode(true) }}
                                        />
                                    )}
                        </div>
                    </div>

                    <p></p>

                    <div ref={mapRef}>
                        <ArticleMap
                            longname={article.longname}
                            related={article.related as NormalizeProto<IRelatedButtons>[]}
                            articleType={article.articleType}
                        />
                    </div>

                    <div style={{ marginBlockEnd: '1em' }}></div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ flex: '0 0 auto', marginRight: '1em' }}>
                            <ExternalLinks metadataProtos={article.metadata} />
                        </div>
                        <div style={{ flex: '0 0 auto', marginRight: '1em' }}>
                            <div className="serif" style={comparisonHeadStyle}>Compare to: </div>
                        </div>
                        <div style={{ flex: '1 1 auto' }}>
                            <ComparisonSearchBox longname={article.longname} type={article.articleType} />
                        </div>
                    </div>

                    <Related
                        related={article.related as NormalizeProto<IRelatedButtons>[]}
                        articleType={article.articleType}
                    />
                </div>
            </PageTemplate>
        </universeContext.Provider>
    )
}

function ComparisonSearchBox({ longname, type }: { longname: string, type: string }): ReactNode {
    const currentUniverse = useUniverse()
    const navContext = useContext(Navigator.Context)
    return (
        <SearchBox
            style={{ ...useComparisonHeadStyle(), width: '100%' }}
            placeholder="Other region..."
            articleLink={x => navContext.link({
                kind: 'comparison',
                universe: currentUniverse,
                longnames: [longname, x],
            }, { scroll: { kind: 'position', top: 0 } })}
            autoFocus={false}
            prioritizeArticleType={type}
        />
    )
}
