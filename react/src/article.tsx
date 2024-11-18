import React, { createContext, DependencyList, ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'

import './style.css'
import './common.css'

import { ArticlePanel } from './components/article-panel'
import { discordFix } from './discord-fix'
import { loadProtobuf } from './load_json'
import { data_link } from './navigation/links'
import { UNIVERSE_CONTEXT, default_article_universe, get_universe, remove_universe_if_default, remove_universe_if_not_in } from './universe'
import { followSymlink } from './utils/symlinks'

function loadPage(): void {
    const root = ReactDOM.createRoot(document.getElementById('root')!)
    root.render(
        <Article />,
    )
}

discordFix()
loadPage()

function Article(): ReactNode {
    const [longname, setLongname] = useState(() => {
        const window_info = new URLSearchParams(window.location.search)

        let result = window_info.get('longname')!
        const [new_longname, changed] = followSymlink(result)
        if (changed) {
            result = new_longname
            window_info.set('longname', result)
            window.history.replaceState(null, '', `${window.location.pathname}?${window_info.toString()}`)
        }

        return result
    })

    const state = useAsyncLoad(async () => {
        const article = await loadProtobuf(data_link(longname), 'Article')
        remove_universe_if_not_in(article.universes)
        const default_universe = default_article_universe(article.universes)
        remove_universe_if_default(default_universe)
        const universe = get_universe(default_universe)
        return { article, universe }
    }, [longname])

    useEffect(() => {
        if (state.state === 'loaded') {
            document.title = state.thing.article.shortname
        }
    }, [state])

    switch (state.state) {
        case 'loaded':
            return (
                <navigationContext.Provider value={{ setLongname }}>
                    <UNIVERSE_CONTEXT.Provider value={state.thing.universe}>
                        <ArticlePanel article={state.thing.article} />
                    </UNIVERSE_CONTEXT.Provider>
                </navigationContext.Provider>
            )
        case 'loading':
            return <LoadingScreen />
        case 'error':
            return <ErrorScreen error={state.error} />
    }
}
