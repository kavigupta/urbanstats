import React from 'react';

import ReactDOM from 'react-dom/client';
import "./style.css";
import "./common.css";

import { loadJSON } from './load_json.js';
import { gunzipSync, gzipSync } from 'zlib';

import { QuizPanel } from './components/quiz-panel';
import { sampleQuiz } from './quiz/sample';

const ENDPOINT = "https://persistent.urbanstats.org";

function get_daily_offset_number() {
    // fractional days since 2023-09-02
    // today's date without the time
    var today = new Date();
    var reference = new Date(2023, 8, 2); // 8 is September, since months are 0-indexed for some fucking reason
    today.setHours(0, 0, 0, 0);
    var offset = (today - reference) / (1000 * 60 * 60 * 24);
    // round to nearest day. this handles daylight savings time, since it's always a midnight-to-midnight comparison.
    // E.g., if it's 9/3 at 1am, the offset will be 9/3 at 0am - 9/2 at 0am = 1 day, which is correct.
    // Similarly, if it's 11/11 at 1am, the offset will be
    //      11/11 at 0am [NO DST] - 9/2 at 0am [DST] = (30 + 31 + 9) days + 1 hour = 70 days + 1 hour
    //      which rounded to the nearest day is 70 days, which is correct.
    offset = Math.round(offset);
    return offset;
}

async function loadPage() {
    document.title = "Juxtastat";
    const root = ReactDOM.createRoot(document.getElementById("root"));
    // if there's a query, parse it
    const params_string = window.location.search.substring(1) || window.location.hash.substring(1);
    console.log(params_string)
    var urlParams = new URLSearchParams(
        params_string
    );
    if (urlParams.has('short')) {
        // look up short url
        const short = urlParams.get('short');
        // POST to endpoint
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
    var quiz_kind = "juxtastat";
    if (mode == "random") {
        const seed = urlParams.get('seed') || Math.floor(Math.random() * 1000000);
        const quiz = sampleQuiz(5, seed);
        // encode quiz as base64
        const quiz_json = JSON.stringify(quiz);
        // gzip quiz
        const quiz_gzip = gzipSync(Buffer.from(quiz_json)).toString('base64');
        const msg = {
            mode: "custom",
            quiz: quiz_gzip,
            name: "random",
        };
        // encode as query string
        const long = "?" + new URLSearchParams(msg).toString();

        window.location.href = window.location.href.split("?")[0].split("#")[0] + long;

    } else if (mode == "custom") {
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
        today = get_daily_offset_number();
        todays_quiz = loadJSON("/quiz/" + today);
        today_name = today;
    }
    root.render(<QuizPanel
        today={today}
        today_name={today_name}
        todays_quiz={todays_quiz}
        parameters={params_string}
        quiz_kind={quiz_kind}
    />);
}

loadPage();