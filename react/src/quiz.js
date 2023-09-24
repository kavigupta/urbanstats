import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";

import { loadJSON } from './load_json.js';
import { gunzipSync } from 'zlib';

import { QuizPanel } from './components/quiz-panel';

const ENDPOINT = "http://168.235.81.104:5000";

async function loadPage() {
    document.title = "Juxtastat";
    const root = ReactDOM.createRoot(document.getElementById("root"));
    // fractional days since 2023-09-02
    const offset = (new Date() - new Date(2023, 8, 2)) / (1000 * 60 * 60 * 24);
    // if there's a query, parse it
    const params_string = window.location.search || window.location.hash.substring(1);
    var urlParams = new URLSearchParams(
        params_string
    );
    if (urlParams.has('short')) {
        // look up short url
        const short = urlParams.get('short');
        // POST to endpoint
        /*
        response = requests.post(
        #     "http://localhost:5000/lengthen",
            "http://168.235.81.104:5000/lengthen",
            data=dict(shortened="5ef76d021c8326f"),
        )
        with open("/home/kavi/temp.html", "wb") as f:
            f.write(response.content)
        print(response.content)
        response.json()
        */
        var response = await fetch(ENDPOINT + "/lengthen", {
            method: "POST",
            body: JSON.stringify({ shortened: short }),
            headers: {
                "Content-Type": "application/json",
            },
        }).then((response) => response.json());
        console.log(response);
        response = response["full_text"];
        console.log(response);
        urlParams = new URLSearchParams(response);
        console.log(urlParams);
    }
    const mode = urlParams.get('mode');
    var todays_quiz = null;
    var today_name = null;
    var today = null;
    if (mode == "custom") {
        // parse from query
        const quiz_base64 = urlParams.get('quiz');
        console.log(quiz_base64)
        const quiz_json = gunzipSync(Buffer.from(quiz_base64, 'base64')).toString();
        todays_quiz = JSON.parse(quiz_json);
        // compute hash of today's quiz, take first 8 characters
        const hash = quiz_base64.split("").reduce(
            (a, b) => (((a << 5) - a) + b.charCodeAt(0)) | 0, 0
        ).toString(16).slice(1, 9);
        // if has name parameter use that else hash
        today_name = "Custom (" + (urlParams.get('name') || hash) + ")";
        today = today_name;
    } else {
        // daily quiz
        today = Math.floor(offset);
        todays_quiz = loadJSON("/quiz/" + today);
        today_name = today;
    }
    root.render(<QuizPanel
        today={today}
        today_name={today_name}
        todays_quiz={todays_quiz}
        parameters={params_string}
    />);
}

loadPage();