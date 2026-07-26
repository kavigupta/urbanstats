import React, { ReactNode, useContext } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { rowExpandedKey, useSetting, useSettings } from '../page_template/settings'
import { useUniverse } from '../universe'
import { assert } from '../utils/defensive'
import { Article } from '../utils/protos'
import { useMobileLayout } from '../utils/responsive'

import { ArticleWarnings } from './ArticleWarnings'
import { ArticleRow } from './load-article'
import { pullRelevantPlotProps } from './plots'
import { useScreenshotMode } from './screenshot'
import { computeNameSpecsWithGroups, nameSpecsForRows } from './statistic-name-specs'
import { CellSpec, PlotSpec, TableContents } from './supertable'
import { ColumnIdentifier } from './table'

export const allColumns: ColumnIdentifier[] = ['statval', 'statval_unit', 'statistic_percentile', 'statistic_ordinal', 'pointer_in_class', 'pointer_overall']

/** A plot for each row whose extras are currently expanded, and undefined for the rest. */
export function useExpandedPlotSpecs(rows: ArticleRow[], article: Article): (PlotSpec | undefined)[] {
    const colors = useColors()
    const expandedSettings = useSettings(rows.map(row => rowExpandedKey(row.statpath)))
    return rows.map((row, index) => {
        if (row.extraStats.length === 0 || !(expandedSettings[rowExpandedKey(row.statpath)] ?? false)) {
            return undefined
        }
        return {
            statDescription: row.renderedStatname,
            plotProps: pullRelevantPlotProps(rows, index, colors.hueColors.blue, article.shortname, article.longname, article.articleType),
        }
    })
}

export function useWidths(): { widthLeftHeader: number, columnWidth: number } {
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

export function ArticleTable(props: {
    filteredRows: ArticleRow[]
    article: Article
}): ReactNode {
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const navContext = useContext(Navigator.Context)

    const { widthLeftHeader, columnWidth } = useWidths()

    const { updatedNameSpecs: leftHeaderSpecs, groupNames } = computeNameSpecsWithGroups(
        nameSpecsForRows(props.filteredRows, props.article.longname, currentUniverse),
    )

    const plotSpecs = useExpandedPlotSpecs(props.filteredRows, props.article)

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
        onlyColumns: allColumns,
    })])

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
                onlyColumns={allColumns}
                simpleOrdinals={simpleOrdinals}
            />
            <ArticleWarnings />
        </div>
    )
}
