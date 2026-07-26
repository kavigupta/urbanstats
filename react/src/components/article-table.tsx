import React, { ReactNode, useContext } from 'react'

import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { rowExpandedKey, useSetting, useSettings } from '../page_template/settings'
import { groupYearKeys, StatGroupSettings } from '../page_template/statistic-settings'
import { Universe, useUniverse } from '../universe'
import { assert } from '../utils/defensive'
import { Article } from '../utils/protos'
import { useMobileLayout } from '../utils/responsive'

import { ArticleRow } from './load-article'
import { pullRelevantPlotProps } from './plots'
import { useScreenshotMode } from './screenshot'
import { computeNameSpecsWithGroups, nameSpecsForRows } from './statistic-name-specs'
import { CellSpec, PlotSpec, TableContents, TableLayout } from './supertable'
import { ColumnIdentifier } from './table'

const allColumns: ColumnIdentifier[] = ['statval', 'statval_unit', 'statistic_percentile', 'statistic_ordinal', 'pointer_in_class', 'pointer_overall']

/** Percent of the table the name column takes in mobile edit mode, where it has fewer columns to compete with. */
const mobileEditWidthLeftHeader = 58

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

interface ArticleTableLayout extends TableLayout {
    currentUniverse: Universe
}

/** The column shape both the normal article table and its edit mode are laid out against. */
export function useArticleTableLayout(mode: 'normal' | 'edit'): ArticleTableLayout {
    const currentUniverse = useUniverse()
    assert(currentUniverse !== undefined, 'no universe')
    const [simpleOrdinals] = useSetting('simple_ordinals')
    const isMobile = useMobileLayout()
    const screenshotMode = useScreenshotMode()

    // On mobile, edit mode drops the percentile/ordinal/pointer columns so the
    // checkboxes and names have room; only the value stays. The name column also
    // gets a wider share since it no longer competes with those columns.
    if (mode === 'edit' && isMobile) {
        return {
            currentUniverse,
            simpleOrdinals,
            widthLeftHeader: mobileEditWidthLeftHeader,
            columnWidth: 100 - mobileEditWidthLeftHeader,
            onlyColumns: ['statval', 'statval_unit'],
        }
    }

    return {
        currentUniverse,
        simpleOrdinals,
        ...computeWidths(simpleOrdinals, isMobile, screenshotMode),
        onlyColumns: allColumns,
    }
}

export function ArticleTable(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
    onEdit: () => void
}): ReactNode {
    const { currentUniverse, simpleOrdinals, widthLeftHeader, columnWidth, onlyColumns } = useArticleTableLayout('normal')
    const navContext = useContext(Navigator.Context)

    // Subscribed to here rather than higher up so that edit mode, which shows every row
    // regardless of the group settings, doesn't redo this filter on every checkbox click.
    const groupSettings = useSettings(groupYearKeys())
    const filteredRows = props.rows(groupSettings)[0]

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
        simpleOrdinals,
        onlyColumns,
    })])

    const topLeftSpec = {
        type: 'top-left-header',
        editMode: { open: false, onEdit: props.onEdit, label: 'Edit' },
    } satisfies CellSpec

    return (
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
    )
}
