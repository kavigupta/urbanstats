import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";

import { QuizPanel } from './components/quiz-panel';


async function loadPage() {
    document.title = "Juxtastat";
    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<QuizPanel />);
}

loadPage();