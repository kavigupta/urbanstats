import '../common.css'
import './article.css'

import React, { ReactNode, useCallback, useContext, useRef } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { rowExpandedKey, useSetting, useSettings } from '../page_template/settings'
import { groupYearKeys, StatGroupSettings } from '../page_template/statistic-settings'
import { statParents } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import { Universe, universeContext, useUniverse } from '../universe'
import { assert } from '../utils/defensive'
import { sanitize } from '../utils/paths'
import { Article, IRelatedButtons } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { ArticleMap } from './ArticleMap'
import { ArticleWarnings } from './ArticleWarnings'
import { ExternalLinks } from './ExternalLiinks'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { pullRelevantPlotProps } from './comparison-panel'
import { generateCSVDataForArticles, CSVExportData } from './csv-export'
import { ArticleRow } from './load-article'
import { Related } from './related-button'
import { createScreenshot, ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { CellSpec, PlotSpec, TableContents } from './supertable'
import { ColumnIdentifier } from './table'

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

    const csvExportCallback = useCallback<CSVExportData>(() => {
        const data = generateCSVDataForArticles([article], [filteredRows], true)
        const filename = `${sanitize(article.longname)}.csv`
        return { csvData: data, csvFilename: filename }
    }, [article, filteredRows])

    const navigator = useContext(Navigator.Context)

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
                screencap={(u, colors) => createScreenshot(screencapElements(), u, colors)}
                csvExportCallback={csvExportCallback}
            >
                <div>
                    <div ref={headersRef}>
                        <div className={headerTextClass}>{article.shortname}</div>
                        <div className={subHeaderTextClass}>{article.longname}</div>
                    </div>
                    <div style={{ marginBlockEnd: '16px' }}></div>

                    <div ref={tableRef}>
                        <ArticleTable
                            filteredRows={filteredRows}
                            article={article}
                        />
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

type NameSpec = Extract<CellSpec, { type: 'statistic-name' }>

function getGroupAndDisplayNames(nameSpec: NameSpec, nameSpecs: NameSpec[]): [string | undefined, string] {
    if (nameSpec.row === undefined) {
        return [undefined, nameSpec.renderedStatname]
    }
    const statParent = statParents.get(nameSpec.row.statpath)

    const groupRows = nameSpecs.filter(s => s.row !== undefined && statParents.get(s.row.statpath)?.group.id === statParent?.group.id)
    const groupSize = groupRows.length

    const groupSourcesSet = new Set(
        groupRows
            .map(s => statParents.get(s.row!.statpath)?.source)
            .filter(source => source !== null)
            .map(source => source!.name),
    )
    const groupHasMultipleSources = groupSourcesSet.size > 1

    const sourceName = statParent?.source?.name
    let displayName = groupSize > 1 ? (statParent?.indentedName ?? nameSpec.renderedStatname) : nameSpec.renderedStatname
    if (groupHasMultipleSources && sourceName) {
        displayName = `${displayName} [${sourceName}]`
    }
    const groupName = groupSize > 1 ? statParent?.group.name : undefined
    return [groupName, displayName]
}

export function computeNameSpecsWithGroups(nameSpecs: NameSpec[]): { updatedNameSpecs: NameSpec[], groupNames: (string | undefined)[] } {
    const updatedNameSpecs: NameSpec[] = []
    const groupNames: (string | undefined)[] = []

    for (const spec of nameSpecs) {
        const [groupName, displayName] = getGroupAndDisplayNames(spec, nameSpecs)

        updatedNameSpecs.push({
            ...spec,
            isIndented: groupName !== undefined,
            displayName,
        })
        groupNames.push(groupName)
    }

    return { updatedNameSpecs, groupNames }
}

function ArticleTable(props: {
    filteredRows: ArticleRow[]
    article: Article
}): ReactNode {
    const colors = useColors()
    const expandedSettings = useSettings(props.filteredRows.map(row => rowExpandedKey(row.statpath)))
    const expandedEach = props.filteredRows.map(row => expandedSettings[rowExpandedKey(row.statpath)])
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const navContext = useContext(Navigator.Context)

    const { widthLeftHeader, columnWidth } = useWidths()

    const statNameSpecs: Extract<CellSpec, { type: 'statistic-name' }>[] = props.filteredRows.map(row => ({
        type: 'statistic-name',
        longname: props.article.longname,
        row,
        renderedStatname: row.renderedStatname,
        currentUniverse,
    }))

    const { updatedNameSpecs: leftHeaderSpecs, groupNames } = computeNameSpecsWithGroups(statNameSpecs)

    const onlyColumns: ColumnIdentifier[] = ['statval', 'statval_unit', 'statistic_percentile', 'statistic_ordinal', 'pointer_in_class', 'pointer_overall']
    const cellSpecs: CellSpec[][] = props.filteredRows.map(row => [({
        type: 'statistic-row',
        longname: props.article.longname,
        row,
        onNavigate: (newArticle) => {
            void navContext.navigate({
                kind: 'article',
                longname: newArticle,
                universe: currentUniverse,
            }, { history: 'push', scroll: { kind: 'none' } })
        },
        simpleOrdinals,
        onlyColumns,
    })])

    const plotSpecs: (PlotSpec | undefined)[] = expandedEach.map((expanded, index) => expanded
        ? {
                statDescription: props.filteredRows[index].renderedStatname,
                plotProps: pullRelevantPlotProps(
                    props.filteredRows,
                    index,
                    colors.hueColors.blue,
                    props.article.shortname,
                    props.article.longname,
                    props.article.articleType,
                ),
            }
        : undefined,
    )

    const topLeftSpec = { type: 'top-left-header' } satisfies CellSpec

    return (
        <div className="stats_table">
            <TableContents
                leftHeaderSpec={{ leftHeaderSpecs, groupNames }}
                rowSpecs={cellSpecs}
                horizontalPlotSpecs={plotSpecs}
                verticalPlotSpecs={[]}
                topLeftSpec={topLeftSpec}
                widthLeftHeader={widthLeftHeader}
                columnWidth={columnWidth}
                onlyColumns={onlyColumns}
                simpleOrdinals={simpleOrdinals}
            />
            <ArticleWarnings />
        </div>
    )
}

export function StatisticHeader(props: {
    longname: string
    groupName?: string
}): ReactNode {
    return (
        <div style={{ width: '100%', padding: '1px' }}>
            <span className="serif value">
                <span>{props.groupName}</span>
            </span>
        </div>
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

function useWidths(): { widthLeftHeader: number, columnWidth: number } {
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const isMobile = useMobileLayout()
    const screenshotMode = useScreenshotMode()

    // TODO clean this up and reduce the amount of magic numbers
    const nonPointerColumns = 15 + 10 + (simpleOrdinals ? 7 + 8 : 17 + 25)
    const pointerColumns = 8 * (screenshotMode ? 0 : (!simpleOrdinals && isMobile ? 1 : 2))
    const numerator = 31
    const denominator = nonPointerColumns + pointerColumns + numerator
    const widthLeftHeader = 100 * (numerator / denominator)
    const columnWidth = 100 - widthLeftHeader
    return { widthLeftHeader, columnWidth }
}
