import '../common.css'
import './article.css'

import React, { CSSProperties, ReactNode, useContext, useRef } from 'react'

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

type ProcessedArticleRow = ArticleRow & {
    statParent: ReturnType<typeof statParents.get>
    currentGroupId: string | undefined
    isFirstInGroup: boolean
    groupSize: number
    showGroupHeader: boolean
    isIndented: boolean
    indentedName: string | undefined
    groupHasMultipleSources: boolean
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

        return {
            ...row,
            statParent,
            currentGroupId,
            isFirstInGroup,
            groupSize,
            showGroupHeader: isFirstInGroup && groupSize > 1,
            isIndented: groupSize > 1,
            indentedName: statParent ? statParent.indentedName : undefined,
            groupHasMultipleSources,
        }
    })
}
import { ArticleWarnings } from './ArticleWarnings'
import { QuerySettingsConnection } from './QuerySettingsConnection'
import { ArticleRow } from './load-article'
import { Map } from './map'
import { RenderedPlot } from './plots'
import { Related } from './related-button'
import { ScreencapElements, useScreenshotMode } from './screenshot'
import { SearchBox } from './search'
import { Cell } from './supertable'
import { ColumnLayout, StatisticHeaderCells, StatisticRowCells, TableHeaderContainer, TableRowContainer } from './table'

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
    const [simpleOrdinals] = useSetting('simple_ordinals')

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
                            <>
                                {row.showGroupHeader && (
                                    <TableRowContainer index={index}>
                                        <StatisticHeader
                                            longname={article.longname}
                                            groupName={row.statParent?.group.name}
                                        />
                                    </TableRowContainer>
                                )}
                                <StatisticTableRow
                                    row={row}
                                    index={index}
                                    key={row.statpath}
                                    longname={article.longname}
                                    shortname={article.shortname}
                                    isFirstInGroup={row.isFirstInGroup}
                                    isIndented={row.isIndented}
                                    indentedName={row.indentedName}
                                    groupHasMultipleSources={row.groupHasMultipleSources}
                                />
                            </>
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

export function StatisticHeader(props: {
    longname: string
    groupName?: string
}): ReactNode {
    return (
        <>
            <ColumnLayout
                cells={[
                    {
                        widthPercentage: 100,
                        columnIdentifier: 'statname',
                        content: (
                            <span className="serif value">
                                <span>{props.groupName}</span>
                            </span>
                        ),
                        style: { textAlign: 'left', paddingLeft: '1px' },
                    },
                ]}
                totalWidth={100}
            />
        </>
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

function StatisticTableRow(props: {
    shortname: string
    longname: string
    row: ArticleRow
    index: number
    isFirstInGroup?: boolean
    isIndented?: boolean
    indentedName?: string
    groupHasMultipleSources?: boolean
}): ReactNode {
    const colors = useColors()
    const [expanded] = useSetting(rowExpandedKey(props.row.statpath))
    const currentUniverse = useUniverse()
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const navContext = useContext(Navigator.Context)

    const isMobile = useMobileLayout()
    const screenshotMode = useScreenshotMode()

    // TODO clean this up and reduce the amount of magic numbers
    const nonPointerColumns = 15 + 10 + (simpleOrdinals ? 7 + 8 : 17 + 25)
    const pointerColumns = 8 * (screenshotMode ? 0 : (!simpleOrdinals && isMobile ? 1 : 2))
    const numerator = 31
    const denominator = nonPointerColumns + pointerColumns + numerator
    const widthLeftHeader = 100 * (numerator / denominator)
    const columnWidth = 100 - widthLeftHeader

    return (
        <>
            <TableRowContainer index={props.index}>
                <Cell
                    type="statistic-name"
                    width={widthLeftHeader}
                    longname={props.longname}
                    row={props.row}
                    isFirstInGroup={props.isFirstInGroup}
                    isIndented={props.isIndented}
                    indentedName={props.indentedName}
                    groupHasMultipleSources={props.groupHasMultipleSources}
                    currentUniverse={currentUniverse}
                    statParent={statParents.get(props.row.statpath)}
                />
                <Cell
                    type="statistic-row"
                    width={columnWidth}
                    longname={props.longname}
                    row={props.row}
                    onNavigate={(newArticle) => {
                        void navContext.navigate({
                            kind: 'article',
                            longname: newArticle,
                            universe: currentUniverse,
                        }, { history: 'push', scroll: { kind: 'none' } })
                    }}
                    simpleOrdinals={simpleOrdinals}
                    isFirstInGroup={props.isFirstInGroup}
                    isIndented={props.isIndented}
                    indentedName={props.indentedName}
                    groupHasMultipleSources={props.groupHasMultipleSources}
                    statParent={statParents.get(props.row.statpath)}
                    onlyColumns={['statval', 'statval_unit', 'statistic_percentile', 'statistic_ordinal', 'pointer_in_class', 'pointer_overall']}
                />
            </TableRowContainer>
            {expanded
                ? (
                        <div style={{ width: '100%', position: 'relative' }}>
                            <RenderedPlot statDescription={props.row.renderedStatname} plotProps={[{ ...props.row, color: colors.hueColors.blue, shortname: props.shortname }]} />
                        </div>
                    )
                : null}
        </>
    )
}
