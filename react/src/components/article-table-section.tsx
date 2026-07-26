import React, { ReactNode } from 'react'

import { StatGroupSettings } from '../page_template/statistic-settings'
import { Article } from '../utils/protos'

import { ArticleWarnings } from './ArticleWarnings'
import { ArticleEditTable } from './article-edit-table'
import { ArticleTable } from './article-table'
import { useEditModeState } from './edit-table'
import { ArticleRow } from './load-article'

/**
 * The article's statistics table, in either its normal form or its edit form, in which
 * the statistic category/group checkbox tree is replicated directly on the table.
 */
export function ArticleTableSection(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
}): ReactNode {
    const editState = useEditModeState()

    return (
        <div className="stats_table">
            {editState.editMode
                ? (
                        <ArticleEditTable
                            rows={props.rows}
                            article={props.article}
                            editState={editState}
                        />
                    )
                : (
                        <ArticleTable
                            rows={props.rows}
                            article={props.article}
                            onEdit={() => { editState.setEditMode(true) }}
                        />
                    )}
            <ArticleWarnings />
        </div>
    )
}
