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
    const { editMode, setEditMode, filter, setFilter, exitEditMode } = useEditModeState()

    return (
        <div className="stats_table">
            {editMode
                ? (
                        <ArticleEditTable
                            rows={props.rows}
                            article={props.article}
                            filter={filter}
                            setFilter={setFilter}
                            onExit={exitEditMode}
                        />
                    )
                : (
                        <ArticleTable
                            rows={props.rows}
                            article={props.article}
                            onEdit={() => { setEditMode(true) }}
                        />
                    )}
            <ArticleWarnings />
        </div>
    )
}
