import React, { ReactNode, useContext } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { useSetting } from '../page_template/settings'
import { StatGroupSettings, useVisibleRows } from '../page_template/statistic-settings'
import { useDefinedUniverse } from '../universe'
import { Article } from '../utils/protos'
import { useMobileLayout } from '../utils/responsive'

import { ArticleRow } from './load-article'
import { pullRelevantPlotProps, useExpandedByStat } from './plots'
import { useScreenshotMode } from './screenshot'
import { computeNameSpecsWithGroups, nameSpecsForRows } from './statistic-name-specs'
import { CellSpec, PlotSpec, TableContents, TableLayout } from './supertable'
import { ColumnIdentifier, valueOnlyColumns } from './table'

const allColumns: ColumnIdentifier[] = ['statval', 'statval_unit', 'statistic_percentile', 'statistic_ordinal', 'pointer_in_class', 'pointer_overall']

/** Percent of the table the name column takes in mobile edit mode, where it has fewer columns to compete with. */
const mobileEditWidthLeftHeader = 58

/** A plot for each row whose extras are currently expanded, and undefined for the rest. */
export function useExpandedPlotSpecs(rows: ArticleRow[], article: Article): (PlotSpec | undefined)[] {
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

function computeWidths(simpleOrdinals: boolean, isMobile: boolean, screenshotMode: boolean): { widthLeftHeader: number, columnWidth: number } {
    // TODO clean this up and reduce the amount of magic numbers
    const nonPointerColumns = 15 + 10 + (simpleOrdinals ? 7 + 8 : 17 + 25)
    const pointerColumns = 8 * (screenshotMode ? 0 : (!simpleOrdinals && isMobile ? 1 : 2))
    const numerator = 31
    const denominator = nonPointerColumns + pointerColumns + numerator
    const widthLeftHeader = 100 * (numerator / denominator)
    const columnWidth = 100 - widthLeftHeader
    return { widthLeftHeader, columnWidth }
}

/** The column shape both the normal article table and its edit mode are laid out against. */
export function useArticleTableLayout(mode: 'normal' | 'edit'): TableLayout {
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const isMobile = useMobileLayout()
    const screenshotMode = useScreenshotMode()

    // On mobile, edit mode drops every column but the value, and the name column gets a
    // wider share since it no longer competes with them.
    const layout: TableLayout = mode === 'edit' && isMobile
        ? {
                simpleOrdinals,
                widthLeftHeader: mobileEditWidthLeftHeader,
                columnWidth: 100 - mobileEditWidthLeftHeader,
                onlyColumns: valueOnlyColumns,
            }
        : {
                simpleOrdinals,
                ...computeWidths(simpleOrdinals, isMobile, screenshotMode),
                onlyColumns: allColumns,
            }

    return layout
}

export function ArticleTable(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
    onEdit: () => void
}): ReactNode {
    const currentUniverse = useDefinedUniverse()
    const layout = useArticleTableLayout('normal')
    const navContext = useContext(Navigator.Context)

    // Subscribed to here rather than higher up so that edit mode, which shows every row
    // regardless of the group settings, doesn't redo this filter on every checkbox click.
    const filteredRows = useVisibleRows(props.rows, false)[0]

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

    const topLeftSpec = {
        type: 'top-left-header',
        editMode: { open: false, onEdit: props.onEdit, label: 'Edit' },
    } satisfies CellSpec

    return (
        <TableContents
            layout={layout}
            leftHeaderSpec={{ leftHeaderSpecs, groupNames }}
            rowSpecs={cellSpecs}
            horizontalPlotSpecs={plotSpecs}
            verticalPlotSpecs={[]}
            topLeftSpec={topLeftSpec}
        />
    )
}
