import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";

// import { ArticlePanel } from './components/article-panel';
import { MapperPanel } from './components/mapper-panel';


async function loadPage() {
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<MapperPanel key={window.location.pathname}/>);
}

loadPage();