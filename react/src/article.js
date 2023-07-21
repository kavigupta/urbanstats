import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { data_link } from "./navigation/links.js";

import { ArticlePanel } from './components/article-panel';
import { loadProtobuf } from './load_json';


async function loadPage() {
    const window_info = new URLSearchParams(window.location.search);

    const longname = window_info.get("longname");
    const data = await loadProtobuf("/data_files.proto", data_link(longname));
    document.title = data.shortname;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<ArticlePanel longname={longname} {...data} />);
}

loadPage();