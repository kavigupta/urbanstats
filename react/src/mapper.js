import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";

// import { ArticlePanel } from './components/article-panel';
import { MapperPanel } from './components/mapper-panel';


async function loadPage() {
    const window_info = new URLSearchParams(window.location.search);

    // const longname = window_info.get("longname");
    // const data = await loadProtobuf(data_link(longname), "Article");
    // document.title = data.shortname;
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<MapperPanel/>);
}

loadPage();