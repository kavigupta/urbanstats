import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { data_link, ordering_data_link, ordering_link } from "./navigation/links.js";

import { ArticlePanel } from './components/article-panel';
import { loadProtobuf } from './load_json';
import { StatisticPanel } from './components/statistic-panel.js';
import { for_type } from './components/load-article.js';
import { get_universe, remove_universe_if_default } from './universe.js';


async function loadPage() {
    const window_info = new URLSearchParams(window.location.search);

    const article_type = window_info.get("article_type");
    const statname = window_info.get("statname");
    const start = parseInt(window_info.get("start") || "1");
    var amount = window_info.get("amount");
    const order = window_info.get("order");
    const highlight = window_info.get("highlight");
    // delete highlight then replaceState
    window_info.delete("highlight");
    window.history.replaceState({}, "", "?" + window_info.toString());
    const names = require("./data/statistic_name_list.json");
    const paths = require("./data/statistic_path_list.json");
    const explanation_pages = require("./data/explanation_page.json");
    const stats = require("./data/statistic_list.json");
    const statpath = paths[names.indexOf(statname)];
    const explanation_page = explanation_pages[names.indexOf(statname)];
    const statcol = stats[names.indexOf(statname)];
    remove_universe_if_default("world");
    const universe = get_universe("world");
    const article_names = await loadProtobuf(ordering_link(universe, statpath, article_type), "StringList");
    const data = await loadProtobuf(ordering_data_link(universe, statpath, article_type), "DataList");
    if (amount == "All") {
        amount = article_names.elements.length;
    } else {
        amount = parseInt(amount || "10");
    }
    document.title = statname;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    const universes = require("./data/universes_ordered.json");
    root.render(<StatisticPanel
        statname={statname}
        statpath={statpath}
        count={for_type(universe, statcol, article_type)}
        explanation_page={explanation_page}
        ordering={order}
        highlight={highlight}
        article_type={article_type}
        joined_string={statpath}
        start={start}
        amount={amount}
        order={order}
        article_names={article_names}
        data={data}
        universes={universes}
        universe={universe}
    />);
}

loadPage();