import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './common.css'

import { for_type } from './components/load-article'
import { StatisticPanel } from './components/statistic-panel'
import explanation_pages from './data/explanation_page'
import stats from './data/statistic_list'
import names from './data/statistic_name_list'
import paths from './data/statistic_path_list'
import { discordFix } from './discord-fix'
import { load_ordering, load_ordering_protobuf } from './load_json'
import { UNIVERSE_CONTEXT, get_universe, remove_universe_if_default } from './universe'
import { IDataList } from './utils/protos'
import { NormalizeProto } from './utils/types'

export type StatName = (typeof names)[number]

async function loadPage(): Promise<void> {
    const window_info = new URLSearchParams(window.location.search)

    // TODO: Use zod to better parse these
    const article_type = window_info.get('article_type')!
    const statname = window_info.get('statname')!.replace('__PCT__', '%') as StatName
    const start = parseInt(window_info.get('start') ?? '1')
    const amount = window_info.get('amount')
    const order = (window_info.get('order') ?? 'descending') as 'ascending' | 'descending'
    const highlight = window_info.get('highlight') ?? undefined
    // delete highlight then replaceState
    window_info.delete('highlight')
    window.history.replaceState({}, '', `?${window_info.toString()}`)
    const statpath = paths[names.indexOf(statname)]
    const explanation_page = explanation_pages[names.indexOf(statname)]
    const statcol = stats[names.indexOf(statname)]
    remove_universe_if_default('world')
    const universe = get_universe('world')
    const article_names = await load_ordering(universe, statpath, article_type)
    const data = await load_ordering_protobuf(universe, statpath, article_type, true) as NormalizeProto<IDataList>
    let parsedAmount: number
    if (amount === 'All') {
        parsedAmount = article_names.length
    }
    else {
        parsedAmount = parseInt(amount ?? '10')
    }
    document.title = statname
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
        <UNIVERSE_CONTEXT.Provider value={universe}>
            <StatisticPanel
                statname={statname}
                count={for_type(universe, statcol, article_type)}
                explanation_page={explanation_page}
                ordering={order}
                highlight={highlight}
                article_type={article_type}
                joined_string={statpath}
                start={start}
                amount={parsedAmount}
                article_names={article_names}
                data={data}
                rendered_statname={statname}
            />
        </UNIVERSE_CONTEXT.Provider>,
    )
}

discordFix()
void loadPage()
