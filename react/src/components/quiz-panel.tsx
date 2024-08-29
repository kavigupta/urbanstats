import React, { useState } from 'react';

import { PageTemplate } from "../page_template/template";
import "../common.css";
import "./quiz.css";
import { History, reportToServer, reportToServerRetro } from '../quiz/statistics';
import { QuizQuestionDispatch } from '../quiz/quiz-question';
import { QuizResult } from '../quiz/quiz-result';
import { a_correct, ENDPOINT, QuizDescriptor, QuizQuestion } from "../quiz/quiz";

function loadQuizHistory(): History {
    const history = JSON.parse(localStorage.getItem("quiz_history") ?? "{}") as History;

    // set 42's correct_pattern's 0th element to true
    if ("42" in history) {
        if ("correct_pattern" in history["42"]) {
            if (history["42"]["correct_pattern"].length > 0) {
                history["42"]["correct_pattern"][0] = true;
            }
        }
    }
    return history;
}

export function QuizPanel(props: { quizDescriptor: QuizDescriptor, today_name: string, todays_quiz: QuizQuestion[], parameters: string }) {

    const [quiz_history, set_quiz_history] = useState(loadQuizHistory);
    const [waiting, setWaiting] = useState(false);

    const todays_quiz_history = quiz_history[props.quizDescriptor.name] ?? { choices: [], correct_pattern: [] }

    const is_daily = typeof props.quizDescriptor.name == "number";

    const is_weekly = typeof props.quizDescriptor.name == "string" && props.quizDescriptor.name.match(/^W-?\d+$/);

    const set_todays_quiz_history = (history_today: History[string]) => {
        const newHistory = { ...quiz_history, [props.quizDescriptor.name]: history_today }
        set_quiz_history(newHistory);
        setWaiting(true);
        // if today is a number and not a string
        if (is_daily || is_weekly) {
            localStorage.setItem("quiz_history", JSON.stringify(history));
        }
    }

    const on_select = (selected: "A" | "B") => {
        if (waiting) {
            return;
        }
        const history = todays_quiz_history;
        const idx = history.correct_pattern.length;
        const question = (props.todays_quiz)[idx];
        history.choices.push(selected);
        history.correct_pattern.push((selected == "A") == a_correct(question));
        set_todays_quiz_history(history);
        setTimeout(() => setWaiting(false), 500)
    }

    return <PageTemplate>{() => {

        const quiz = props.todays_quiz;
        const history = todays_quiz_history;

        let index = history["choices"].length;
        if (waiting) {
            index -= 1;
        }

        if (index == quiz.length) {

            let get_per_question;
            if (is_daily) {
                reportToServer(quiz_history);
                // POST to endpoint /juxtastat/get_per_question_stats with the current day
                get_per_question = fetch(ENDPOINT + "/juxtastat/get_per_question_stats", {
                    method: "POST",
                    body: JSON.stringify({ day: props.quizDescriptor.name }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
            }
            if (is_weekly && typeof props.quizDescriptor.name == "string") {
                reportToServerRetro(quiz_history);
                get_per_question = fetch(ENDPOINT + "/retrostat/get_per_question_stats", {
                    method: "POST",
                    body: JSON.stringify({ week: parseInt(props.quizDescriptor.name.substring(1)) }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
            }
            return (
                <QuizResult
                    quiz={quiz}
                    whole_history={quiz_history}
                    history={history}
                    today_name={props.today_name}
                    parameters={props.parameters}
                    get_per_question={get_per_question}
                    quizDescriptor={props.quizDescriptor}
                />
            )
        }

        return (
            <QuizQuestionDispatch
                quiz={props.quizDescriptor}
                question={quiz[index]}
                history={history}
                length={quiz.length}
                on_select={on_select}
                waiting={waiting}
                nested={false}
                no_header={false}
                no_footer={false}
            />
        );
    }}</PageTemplate>
}