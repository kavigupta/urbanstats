import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";

import { load_ordering_protobuf, load_ordering } from './load_json';
import { StatisticPanel } from './components/statistic-panel.js';
import { for_type, render_statname } from './components/load-article';
import { get_universe, longname_is_exclusively_american, remove_universe_if_default } from './universe';


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
    const article_names = await load_ordering(universe, statpath, article_type);
    const data = await load_ordering_protobuf(universe, statpath, article_type, true);
    if (amount == "All") {
        amount = article_names.length;
    } else {
        amount = parseInt(amount || "10");
    }
    document.title = statname;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    const universes = require("./data/universes_ordered.json");
    const exclusively_american = article_names.every(longname_is_exclusively_american);
    root.render(
        <UNIVERSE_CONTEXT.Provider value={universe}>
            <StatisticPanel
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
                rendered_statname={render_statname(names.indexOf(statname), statname, exclusively_american)}
            />
        </UNIVERSE_CONTEXT.Provider>
    );
}

loadPage();