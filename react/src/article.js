import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";
import { data_link } from "./navigation/links.js";

import { ArticlePanel } from './components/article-panel';


async function loadPage() {
    const window_info = new URLSearchParams(window.location.search);

    const longname = window_info.get("longname");
    const JSON5 = require("json5");
    const text = await fetch(data_link(longname)).then(res => res.text());
    const data = JSON5.parse(text);
    document.title = data.shortname;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<ArticlePanel longname={longname} {...data} />);
}

loadPage();