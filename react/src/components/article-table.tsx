import React, { ReactNode, useContext } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useSetting, useSettings } from '../page_template/settings'
import { groupYearKeys, StatGroupSettings } from '../page_template/statistic-settings'
import { useDefinedUniverse } from '../universe'
import { Article } from '../utils/protos'
import { useMobileLayout } from '../utils/responsive'

import { placeWarnings, useArticleWarnings } from './ArticleWarnings'
import { ArticleRow } from './load-article'
import { pullRelevantPlotProps, useExpandedByStat } from './plots'
import { useScreenshotMode } from './screenshot'
import { computeNameSpecsWithGroups, nameSpecsForRows } from './statistic-name-specs'
import { CellSpec, PlotSpec, TableContents, TableLayout } from './supertable'
import { ColumnIdentifier } from './table'

const allColumns: ColumnIdentifier[] = ['statval', 'statval_unit', 'statistic_percentile', 'statistic_ordinal', 'pointer_in_class', 'pointer_overall']

function useExpandedPlotSpecs(rows: ArticleRow[], article: Article): (PlotSpec | undefined)[] {
    const colors = useColors()
    const expanded = useExpandedByStat(rows.map(row => row.statpath), index => rows[index].extraStats.length > 0)
    return rows.map((row, index) => expanded[index]
        ? {
                statDescription: row.renderedStatname,
                plotProps: pullRelevantPlotProps(rows, index, colors.hueColors.blue, article.shortname, article.longname, article.articleType),
            }
        : undefined,
    )
}

function useArticleTableLayout(): TableLayout {
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const isMobile = useMobileLayout()
    const screenshotMode = useScreenshotMode()

    // TODO clean this up and reduce the amount of magic numbers
    const nonPointerColumns = 15 + 10 + (simpleOrdinals ? 7 + 8 : 17 + 25)
    const pointerColumns = 8 * (screenshotMode ? 0 : (!simpleOrdinals && isMobile ? 1 : 2))
    const numerator = 31
    const denominator = nonPointerColumns + pointerColumns + numerator
    const widthLeftHeader = 100 * (numerator / denominator)

    return {
        simpleOrdinals,
        widthLeftHeader,
        columnWidth: 100 - widthLeftHeader,
        onlyColumns: allColumns,
    }
}

export function ArticleTable(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
}): ReactNode {
    const currentUniverse = useDefinedUniverse()
    const layout = useArticleTableLayout()
    const navContext = useContext(Navigator.Context)

    // Subscribed to here rather than in the panel, so changing the statistics shown doesn't
    // re-render the map and the surrounding page.
    const settings = useSettings(groupYearKeys())
    const filteredRows = props.rows(settings)[0]

    const warnings = useArticleWarnings()
    const warningRows = placeWarnings(filteredRows.map(row => row.statpath), warnings)

    const { updatedNameSpecs: leftHeaderSpecs, groupNames } = computeNameSpecsWithGroups(
        nameSpecsForRows(filteredRows, props.article.longname, currentUniverse),
    )

    const plotSpecs = useExpandedPlotSpecs(filteredRows, props.article)

    const cellSpecs: CellSpec[][] = filteredRows.map(row => [({
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
        simpleOrdinals: layout.simpleOrdinals,
        onlyColumns: layout.onlyColumns,
    })])

    return (
        <div className="stats_table">
            <TableContents
                layout={layout}
                leftHeaderSpec={{ leftHeaderSpecs, groupNames }}
                rowSpecs={cellSpecs}
                horizontalPlotSpecs={plotSpecs}
                verticalPlotSpecs={[]}
                topLeftSpec={{ type: 'top-left-header' }}
                warningRows={warningRows}
            />
        </div>
    )
}
