export { QuizPanel };

import React from 'react';

import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./quiz.css";
import { reportToServer } from '../quiz/statistics.js';
import { QuizQuestionDispatch } from '../quiz/quiz-question.js';
import { QuizResult } from '../quiz/quiz-result.js';

export const ENDPOINT = "https://persistent.urbanstats.org";

class QuizPanel extends PageTemplate {
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            quiz_history: JSON.parse(localStorage.getItem("quiz_history")) || {},
            waiting: false
        }
        this.today = this.props.today;
        this.today_name = this.props.today_name;
        this.todays_quiz = this.props.todays_quiz;
    }

    main_content() {

        const quiz = this.todays_quiz;
        const history = this.get_todays_quiz_history();

        let index = history["choices"].length;
        if (this.state.waiting) {
            index -= 1;
        }

        if (index == quiz.length) {

            var get_per_question = null;
            if (this.is_daily()) {
                reportToServer(this.get_whole_history());
                // POST to endpoint /juxtastat/get_per_question_stats with the current day
                get_per_question = fetch(ENDPOINT + "/juxtastat/get_per_question_stats", {
                    method: "POST",
                    body: JSON.stringify({ day: this.today }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                });
            }
            return (
                <QuizResult
                    quiz={quiz}
                    whole_history={this.get_whole_history()}
                    history={history}
                    today={this.today}
                    today_name={this.today_name}
                    settings={this.state.settings}
                    parameters={this.props.parameters}
                    get_per_question={get_per_question}
                />
            )
        }

        return (
            <QuizQuestionDispatch
                quiz_kind={this.props.quiz_kind}
                {...quiz[index]}
                history={history}
                length={quiz.length}
                on_select={x => this.on_select(x)}
                waiting={this.state.waiting}
                today={this.today}
            />
        );
    }

    get_whole_history() {
        const history = this.state.quiz_history;
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

    get_todays_quiz_history() {
        return this.get_whole_history()[this.today] || { "choices": [], "correct_pattern": [] };
    }

    is_daily() {
        return typeof this.today == "number";
    }

    set_todays_quiz_history(history_today) {
        const history = this.get_whole_history();
        history[this.today] = history_today;
        this.setState({ history: history, waiting: true });
        // if today is a number and not a string
        if (this.is_daily()) {
            localStorage.setItem("quiz_history", JSON.stringify(history));
        }
    }

    on_select(selected) {
        if (this.state.waiting) {
            return;
        }
        const history = this.get_todays_quiz_history();
        const idx = history.correct_pattern.length;
        const quiz = (this.todays_quiz)[idx];
        history.choices.push(selected);
        history.correct_pattern.push((selected == "A") == (quiz.stat_a > quiz.stat_b));
        this.set_todays_quiz_history(history);
        setTimeout(function () { //Start the timer
            this.setState({ waiting: false }) //After 1 second, set render to true
        }.bind(this), 500)
    }
}
