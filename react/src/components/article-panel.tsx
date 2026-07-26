import '../common.css'
import './article.css'

import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useIsStaged, useSettings } from '../page_template/settings'
import { groupYearKeys, StatGroupSettings } from '../page_template/statistic-settings'
import { PageTemplate } from '../page_template/template'
import { Universe, universeContext, useUniverse } from '../universe'
import { sanitize } from '../utils/paths'
import { Article, IRelatedButtons } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useSubHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { ArticleMap } from './ArticleMap'
import { ExternalLinks } from './ExternalLiinks'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { ArticleEditTable } from './article-edit-table'
import { ArticleTable } from './article-table'
import { generateCSVDataForArticles, CSVExportData } from './csv-export'
import { ArticleRow } from './load-article'
import { Related } from './related-button'
import { createScreenshot, ScreencapElements } from './screenshot'
import { SearchBox } from './search'
import { EditModeContext } from './table-edit-context'

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

    const settings = useSettings(groupYearKeys())
    const filteredRows = rows(settings)[0]

    // Edit mode is ephemeral (not a setting), but it opens automatically when the
    // page enters staging mode (e.g. from a settings link) so the pending changes
    // are visible and reviewable on the table. The initial state covers a fresh
    // load into staging; the effect covers navigating into staging on an already
    // mounted panel. Neither forces edit mode closed when staging ends.
    const staged = useIsStaged()
    const [editMode, setEditMode] = useState(staged)
    const wasStaged = useRef(staged)
    useEffect(() => {
        if (staged && !wasStaged.current) {
            setEditMode(true)
        }
        wasStaged.current = staged
    }, [staged])
    const [filter, setFilter] = useState('')
    const editModeState = useMemo(() => ({ editMode, setEditMode, filter, setFilter }), [editMode, filter])

    const csvExportCallback = useCallback<CSVExportData>(() => {
        const data = generateCSVDataForArticles([article], [filteredRows], true)
        const filename = `${sanitize(article.longname)}.csv`
        return { csvData: data, csvFilename: filename }
    }, [article, filteredRows])

    const navigator = useContext(Navigator.Context)

    return (
        <EditModeContext.Provider value={editModeState}>
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
                    screencap={(...args) => createScreenshot(screencapElements(), ...args)}
                    csvExportCallback={csvExportCallback}
                >
                    <div>
                        <div ref={headersRef}>
                            <div className={headerTextClass}>{article.shortname}</div>
                            <div className={subHeaderTextClass}>{article.longname}</div>
                        </div>
                        <div style={{ marginBlockEnd: '16px' }}></div>

                        <div ref={tableRef}>
                            {editMode
                                ? <ArticleEditTable rows={rows} article={article} filter={filter} />
                                : <ArticleTable filteredRows={filteredRows} article={article} />}
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
        </EditModeContext.Provider>
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
