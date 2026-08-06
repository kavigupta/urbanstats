import React, { ReactNode } from 'react'

import { StatGroupSettings, useVisibleRows } from '../page_template/statistic-settings'
import { useDefinedUniverse } from '../universe'
import { Article } from '../utils/protos'

import { useArticleTableLayout, useExpandedPlotSpecs } from './article-table'
import { EditModeState, EditTable, editRowsByGroup, useEditTableLayout } from './edit-table'
import { ArticleRow } from './load-article'
import { CellSpec } from './supertable'

export function ArticleEditTable(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
    editState: EditModeState
}): ReactNode {
    const currentUniverse = useDefinedUniverse()
    const columnLayout = useArticleTableLayout('edit')
    // This component only renders in edit mode, so every group is always forced on.
    const rowsByArticle = useVisibleRows(props.rows, true)
    const allRows = rowsByArticle[0]
    const { longname } = props.article

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

    const layout = useEditTableLayout(columnLayout, rowsByArticle, currentUniverse)

    return (
        <EditTable
            rowsByGroup={rowsByGroup}
            layout={layout}
            editState={props.editState}
            topLeftSpec={{ type: 'top-left-header' }}
        />
    )
}
