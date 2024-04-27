import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { data_link } from "./navigation/links.js";

import { loadProtobuf } from './load_json.js';
import { ComparisonPanel } from './components/comparison-panel.js';
import { remove_universe_if_not_in } from './universe.js';


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
    root.render(<ComparisonPanel names={names} datas={datas} joined_string={joined_string} universes={universes} />);
}

loadPage();