import '../common.css'
import './article.css'

import React, { ReactNode, useContext, useRef } from 'react'

import { Navigator } from '../navigation/Navigator'
import { sanitize } from '../navigation/links'
import { useColors } from '../page_template/colors'
import { rowExpandedKey, useSetting, useSettings } from '../page_template/settings'
import { groupYearKeys, StatGroupSettings } from '../page_template/statistic-settings'
import { statParents } from '../page_template/statistic-tree'
import { PageTemplate } from '../page_template/template'
import { useUniverse } from '../universe'
import { Article, IRelatedButtons } from '../utils/protos'
import { useComparisonHeadStyle, useHeaderTextClass, useMobileLayout, useSubHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'

import { ArticleWarnings } from './ArticleWarnings'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { generateCSVDataForArticles } from './csv-export'
import { ArticleRow } from './load-article'
import { Map } from './map'
import { Related } from './related-button'
import { ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { CellSpec, PlotSpec, TableContents } from './supertable'
import { ColumnIdentifier } from './table'

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

    // Generate CSV data for the article
    const csvData = generateCSVDataForArticles([article], [filteredRows], true) // Include ordinals for articles
    const csvFilename = `${sanitize(article.longname)}.csv`

    return (
        <>
            <QuerySettingsConnection />
            <PageTemplate
                screencapElements={screencapElements}
                csvData={csvData}
                csvFilename={csvFilename}
                hasUniverseSelector={true}
                universes={article.universes}
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
                        <Map
                            longname={article.longname}
                            related={article.related as NormalizeProto<IRelatedButtons>[]}
                            articleType={article.articleType}
                            basemap={{ type: 'osm' }}
                            attribution="startVisible"
                        />
                    </div>

                    <div style={{ marginBlockEnd: '1em' }}></div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '30%', marginRight: '1em' }}>
                            <div className="serif" style={comparisonHeadStyle}>Compare to: </div>
                        </div>
                        <div style={{ width: '70%' }}>
                            <ComparisonSearchBox longname={article.longname} type={article.articleType} />
                        </div>
                    </div>

                    <Related
                        related={article.related as NormalizeProto<IRelatedButtons>[]}
                        articleType={article.articleType}
                    />
                </div>
            </PageTemplate>
        </>
    )
}

type NameSpec = Extract<CellSpec, { type: 'statistic-name' }>

export function computeNameSpecsWithGroups(nameSpecs: NameSpec[]): { updatedNameSpecs: NameSpec[], groupNames: (string | undefined)[] } {
    const updatedNameSpecs: NameSpec[] = []
    const groupNames: (string | undefined)[] = []

    for (const spec of nameSpecs) {
        const statParent = statParents.get(spec.row.statpath)

        const groupRows = nameSpecs.filter(s => statParents.get(s.row.statpath)?.group.id === statParent?.group.id)
        const groupSize = groupRows.length

        const groupSourcesSet = new Set(
            groupRows
                .map(s => statParents.get(s.row.statpath)?.source)
                .filter(source => source !== null)
                .map(source => source!.name),
        )
        const groupHasMultipleSources = groupSourcesSet.size > 1

        const sourceName = statParent?.source?.name
        let displayName = groupSize > 1 ? (statParent?.indentedName ?? spec.row.renderedStatname) : spec.row.renderedStatname
        if (groupHasMultipleSources && sourceName) {
            displayName = `${displayName} [${sourceName}]`
        }

        updatedNameSpecs.push({
            ...spec,
            isIndented: groupSize > 1,
            displayName,
        })
        groupNames.push(groupSize > 1 ? statParent?.group.name : undefined)
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
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const navContext = useContext(Navigator.Context)

    const { widthLeftHeader, columnWidth } = useWidths()

    const statNameSpecs: Extract<CellSpec, { type: 'statistic-name' }>[] = props.filteredRows.map(row => ({
        type: 'statistic-name',
        longname: props.article.longname,
        row,
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
                plotProps: [{ ...props.filteredRows[index], color: colors.hueColors.blue, shortname: props.article.shortname, longname: props.article.longname, sharedTypeOfAllArticles: props.article.articleType }], // TODO add other articles when comparison is implemented
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
            link={x => navContext.link({
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
