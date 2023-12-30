import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { data_link } from "./navigation/links.js";

import { loadProtobuf } from './load_json.js';
import { ComparisonPanel } from './components/comparison-panel.js';


async function loadPage() {
    const window_info = new URLSearchParams(window.location.search);

    const name_1 = window_info.get("longname_1");
    const data_1 = await loadProtobuf(data_link(name_1), "Article");
    const name_2 = window_info.get("longname_2");
    const data_2 = await loadProtobuf(data_link(name_2), "Article");
    document.title = data_1.shortname + " vs. " + data_2.shortname;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<ComparisonPanel data_1={{ longname: name_1, ...data_1 }} data_2={{ longname: name_2, ...data_2 }} />);
}

loadPage();