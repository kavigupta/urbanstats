import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";

import { QuizPanel } from './components/quiz-panel.js';

import { get_retrostat_offset_number } from './quiz/dates.js';
import { loadJSON } from './load_json.js';

async function loadPage() {
    document.title = "Retrostat";
    const root = ReactDOM.createRoot(document.getElementById("root"));
    // if there's a query, parse it
    const this_week = get_retrostat_offset_number();
    const this_quiz = loadJSON("/retrostat/" + this_week);
    root.render(<QuizPanel
        today={"retro_week_" + this_week}
        today_name={"retro_week_" + this_week}
        todays_quiz={this_quiz}
        parameters={"retro=true"}
    />);
}

loadPage();