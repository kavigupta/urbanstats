import React, { ReactNode, useState } from 'react'

import { useIsStaged } from '../page_template/settings'
import { StatGroupSettings } from '../page_template/statistic-settings'
import { Article } from '../utils/protos'

import { ArticleWarnings } from './ArticleWarnings'
import { ArticleEditTable } from './article-edit-table'
import { ArticleTable } from './article-table'
import { ArticleRow } from './load-article'

/**
 * The article's statistics table, in either its normal form or its edit form, in which
 * the statistic category/group checkbox tree is replicated directly on the table.
 *
 * Edit mode is deliberately not persisted (not a setting) — it resets on
 * navigation/reload. It opens on its own whenever the page enters staging mode (e.g. from
 * a settings link) so the pending changes are visible and reviewable on the table. Leaving
 * staging only closes it when the user does so via the table's own Discard/Apply buttons,
 * which double as Done.
 */
export function ArticleTableSection(props: {
    rows: (settings: StatGroupSettings) => ArticleRow[][]
    article: Article
}): ReactNode {
    const staged = useIsStaged()
    const [editMode, setEditMode] = useState(staged)
    const [prevStaged, setPrevStaged] = useState(staged)
    if (staged !== prevStaged) {
        setPrevStaged(staged)
        if (staged) {
            setEditMode(true)
        }
    }

    // Scoped to the current visit to edit mode, so reopening it starts from the whole tree.
    const [filter, setFilter] = useState('')

    const exitEditMode = (): void => {
        setEditMode(false)
        setFilter('')
    }

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
