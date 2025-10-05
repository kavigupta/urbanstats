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
import { ArticleRow } from './load-article'
import { Map } from './map'
import { Related } from './related-button'
import { ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { CellSpec, PlotSpec, SuperTableRow } from './supertable'
import { StatisticHeaderCells, TableHeaderContainer, TableRowContainer } from './table'

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
    const filteredRows = preprocessRows(rows(settings)[0])

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

type ProcessedArticleRow = ArticleRow & {
    statParent: ReturnType<typeof statParents.get>
    currentGroupId: string | undefined
    showGroupHeader: boolean
    isIndented: boolean
    displayName: string
}

function preprocessRows(filteredRows: ArticleRow[]): ProcessedArticleRow[] {
    return filteredRows.map((row, index) => {
        const statParent = statParents.get(row.statpath)
        const currentGroupId = statParent?.group.id
        const isFirstInGroup = index === 0 || statParents.get(filteredRows[index - 1].statpath)?.group.id !== currentGroupId

        const groupRows = filteredRows.filter(r => statParents.get(r.statpath)?.group.id === currentGroupId)
        const groupSize = groupRows.length

        const groupSourcesSet = new Set(
            groupRows
                .map(r => statParents.get(r.statpath)?.source)
                .filter(source => source !== null)
                .map(source => source!.name),
        )
        const groupHasMultipleSources = groupSourcesSet.size > 1

        const sourceName = statParent?.source?.name
        let statName = groupSize > 1 ? (statParent?.indentedName ?? row.renderedStatname) : row.renderedStatname
        if (groupHasMultipleSources && sourceName) {
            statName = `${statName} [${sourceName}]`
        }

        return {
            ...row,
            statParent,
            currentGroupId,
            showGroupHeader: isFirstInGroup && groupSize > 1,
            isIndented: groupSize > 1,
            displayName: statName,
        }
    })
}

function ArticleTable(props: {
    filteredRows: ProcessedArticleRow[]
    article: Article
}): ReactNode {
    const colors = useColors()
    const expandedSettings = useSettings(props.filteredRows.map(row => rowExpandedKey(row.statpath)))
    const expandedEach = props.filteredRows.map(row => expandedSettings[rowExpandedKey(row.statpath)])
    const currentUniverse = useUniverse()
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const navContext = useContext(Navigator.Context)

    const { widthLeftHeader, columnWidth } = useWidths()

    const leftHeaderSpecs: CellSpec[] = props.filteredRows.map(row => ({
        type: 'statistic-name',
        longname: props.article.longname,
        row,
        isIndented: row.isIndented,
        currentUniverse,
        displayName: row.displayName,
    }))

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
        onlyColumns: ['statval', 'statval_unit', 'statistic_percentile', 'statistic_ordinal', 'pointer_in_class', 'pointer_overall'],
    })])

    const plotSpecs: (PlotSpec | undefined)[] = expandedEach.map((expanded, index) => expanded
        ? {
                statDescription: props.filteredRows[index].renderedStatname,
                plotProps: [{ ...props.filteredRows[index], color: colors.hueColors.blue, shortname: props.article.shortname }],
            }
        : undefined,
    )

    return (
        <div className="stats_table">
            <StatisticTableHeader />
            {props.filteredRows.map((row, index) => (
                <>
                    {row.showGroupHeader && (
                        <TableRowContainer index={index}>
                            <StatisticHeader
                                longname={props.article.longname}
                                groupName={row.statParent?.group.name}
                            />
                        </TableRowContainer>
                    )}
                    <SuperTableRow
                        rowIndex={index}
                        leftHeaderSpec={leftHeaderSpecs[index]}
                        cellSpecs={cellSpecs[index]}
                        plotSpec={plotSpecs[index]}
                        widthLeftHeader={widthLeftHeader}
                        columnWidth={columnWidth}
                    />
                </>
            ))}
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

function StatisticTableHeader(): ReactNode {
    const [simpleOrdinals] = useSetting('simple_ordinals')
    return (
        <TableHeaderContainer>
            <StatisticHeaderCells simpleOrdinals={simpleOrdinals} totalWidth={100} />
        </TableHeaderContainer>
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
