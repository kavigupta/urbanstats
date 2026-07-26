import React, { ReactNode, useMemo } from 'react'

import { StatGroupSettings } from '../page_template/statistic-settings'
import { Article } from '../utils/protos'

import { useArticleTableLayout, useExpandedPlotSpecs } from './article-table'
import { EditTable, EditTableLayout, editRowsByGroup, useRowsForEditMode } from './edit-table'
import { ArticleRow } from './load-article'
import { CellSpec } from './supertable'
import { maxLayoutInformation } from './table'

export function ArticleEditTable(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
    filter: string
    setFilter: (filter: string) => void
    onExit: () => void
}): ReactNode {
    const { currentUniverse, layout: columnLayout } = useArticleTableLayout('edit')
    // This component only renders in edit mode, so every group is always forced on.
    const allRows = useRowsForEditMode(props.rows, true)[0]
    const { longname } = props.article

    // Keep the expandable per-stat plots ("extras") available in edit mode, driven
    // by the same rowExpandedKey setting the normal table uses.
    const plotSpecs = useExpandedPlotSpecs(allRows, props.article)

    const { simpleOrdinals, onlyColumns } = columnLayout

    const rowsByGroup = editRowsByGroup(allRows, longname, currentUniverse, (row, index) => ({
        cellSpecs: [{
            type: 'statistic-row',
            longname,
            row,
            onlyColumns,
            simpleOrdinals,
        } satisfies CellSpec],
        plotSpec: plotSpecs[index],
    }))

    const columnWidthsInfo = useMemo(
        () => maxLayoutInformation(allRows, currentUniverse, simpleOrdinals),
        [allRows, currentUniverse, simpleOrdinals],
    )

    const layout: EditTableLayout = { ...columnLayout, columnWidthsInfo: [columnWidthsInfo] }

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
