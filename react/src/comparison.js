import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { data_link } from "./navigation/links";

import { loadProtobuf } from './load_json';
import { ComparisonPanel } from './components/comparison-panel.js';
import { default_comparison_universe, get_universe, remove_universe_if_default, remove_universe_if_not_in } from './universe';


async function loadPage() {
    const window_info = new URLSearchParams(window.location.search);

    const names = JSON.parse(window_info.get("longnames"));
    const datas = await Promise.all(names.map(name => loadProtobuf(data_link(name), "Article")));

    const joined_string = datas.map(x => x.shortname).join(" vs ");
    document.title = joined_string;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    // intersection of all the data.universes
    const universes = datas.map(x => x.universes).reduce((a, b) => a.filter(c => b.includes(c)));
    remove_universe_if_not_in(universes)
    const default_universe = default_comparison_universe(names);
    remove_universe_if_default(default_universe);
    root.render(<ComparisonPanel names={names} datas={datas} joined_string={joined_string} universes={universes}
        universe={get_universe(
            default_universe
        )}
    />);
}

loadPage();