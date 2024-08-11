import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { data_link } from "./navigation/links";

import { ArticlePanel } from './components/article-panel';
import { loadProtobuf } from './load_json';
import { default_article_universe, get_universe, remove_universe_if_default, remove_universe_if_not_in, UNIVERSE_CONTEXT } from './universe';


async function loadPage() {
    const window_info = new URLSearchParams(window.location.search);

    const longname = window_info.get("longname");
    const data = await loadProtobuf(data_link(longname), "Article");
    document.title = data.shortname;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    remove_universe_if_not_in(data.universes)
    const default_universe = default_article_universe(longname);
    remove_universe_if_default(default_universe);
    root.render(
        <UNIVERSE_CONTEXT.Provider value={get_universe(default_universe)}>
            <ArticlePanel longname={longname} {...data} universe={get_universe(default_universe)} />
        </UNIVERSE_CONTEXT.Provider>
    );
}

loadPage();