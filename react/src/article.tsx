import React from 'react'
import ReactDOM from 'react-dom/client'
import './style.css'
import './common.css'

import { ArticlePanel } from './components/article-panel'
import { loadProtobuf } from './load_json'
import { data_link } from './navigation/links'
import { UNIVERSE_CONTEXT, default_article_universe, get_universe, remove_universe_if_default, remove_universe_if_not_in } from './universe'

async function loadPage(): Promise<void> {
    const window_info = new URLSearchParams(window.location.search)

    const longname = window_info.get('longname')!
    const data = await loadProtobuf(data_link(longname), 'Article')
    document.title = data.shortname
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    remove_universe_if_not_in(data.universes)
    const default_universe = default_article_universe(longname)
    remove_universe_if_default(default_universe)
    root.render(
        <UNIVERSE_CONTEXT.Provider value={get_universe(default_universe)}>
            <ArticlePanel article={data} />
        </UNIVERSE_CONTEXT.Provider>,
    )
}

void loadPage()
