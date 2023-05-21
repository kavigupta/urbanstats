import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import { data_link } from "./navigation/links.js";

import { ArticlePanel } from './components/article-panel';


async function loadPage() {
    const window_info = new URLSearchParams(window.location.search);

    const longname = window_info.get("longname");
    const data = await fetch(data_link(longname)).then(res => res.json());
    document.title = data.shortname;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<ArticlePanel longname={longname} {...data} />);
}

loadPage();