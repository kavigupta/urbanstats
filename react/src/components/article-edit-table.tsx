import React, { ReactNode, useMemo } from 'react'

import { StatGroupSettings } from '../page_template/statistic-settings'
import { Article } from '../utils/protos'

import { useArticleTableLayout, useExpandedPlotSpecs } from './article-table'
import { EditRow, EditTable, EditTableLayout, editRowsByGroup, useAllRows } from './edit-table'
import { ArticleRow } from './load-article'
import { displayNamesForRows } from './statistic-name-specs'
import { CellSpec } from './supertable'
import { maxLayoutInformation } from './table'

export function ArticleEditTable(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
    filter: string
    setFilter: (filter: string) => void
    onExit: () => void
}): ReactNode {
    const { currentUniverse, simpleOrdinals, widthLeftHeader, columnWidth, onlyColumns } = useArticleTableLayout('edit')
    const allRows = useAllRows(props.rows)[0]
    const { longname } = props.article

    // Keep the expandable per-stat plots ("extras") available in edit mode, driven
    // by the same rowExpandedKey setting the normal table uses.
    const plotSpecs = useExpandedPlotSpecs(allRows, props.article)

    const displayNames = useMemo(
        () => displayNamesForRows(allRows, longname, currentUniverse),
        [allRows, longname, currentUniverse],
    )

    const rowsByGroup = editRowsByGroup(allRows.map((row, index): EditRow => ({
        statpath: row.statpath,
        displayName: displayNames[index],
        adornmentRow: row,
        cellSpecs: [{
            type: 'statistic-row',
            longname,
            row,
            onlyColumns,
            simpleOrdinals,
        } satisfies CellSpec],
        plotSpec: plotSpecs[index],
    })))

    const columnWidthsInfo = useMemo(
        () => maxLayoutInformation(allRows, currentUniverse, simpleOrdinals),
        [allRows, currentUniverse, simpleOrdinals],
    )

    const layout: EditTableLayout = {
        widthLeftHeader,
        columnWidth,
        onlyColumns,
        simpleOrdinals,
        extraSpaceRight: [0],
        columnWidthsInfo: [columnWidthsInfo],
    }

    return (
        <EditTable
            rowsByGroup={rowsByGroup}
            layout={layout}
            filter={props.filter}
            setFilter={props.setFilter}
            onExit={props.onExit}
            topLeftType="top-left-header"
        />
    )
}
