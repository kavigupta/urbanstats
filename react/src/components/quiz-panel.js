export { QuizPanel };

import React from 'react';

import { Statistic } from "./table.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./quiz.css";
import { isMobile, isFirefox } from 'react-device-detect';
import { article_link } from '../navigation/links.js';
import { reportToServer } from '../quiz/statistics.js';
import { Header } from '../quiz/quiz-components.js';
import { QuizQuestionDispatch } from '../quiz/quiz-question.js';

const ENDPOINT = "https://persistent.urbanstats.org";

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
                // TODO: report to server if weekly too
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
        console.log(history);
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

    is_weekly() {
        console.log("today: " + this.today);
        // matches W followed by a number
        return typeof this.today == "string" && this.today.match(/^W-?\d+$/);
    }

    set_todays_quiz_history(history_today) {
        const history = this.get_whole_history();
        history[this.today] = history_today;
        this.setState({ history: history, waiting: true });
        // if today is a number and not a string
        if (this.is_daily() || this.is_weekly()) {
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


function AudienceStatistics({ total, per_question, scores }) {
    // two flexboxes of the scores for each
    return <div>
        <div className="serif quiz_summary">Question Difficulty</div>
        <DisplayedStats statistics={
            per_question.map((x, i) => {
                return {
                    name: "Q" + (i + 1) + " Correct",
                    value: (x / total * 100).toFixed(0) + "%",
                    addtl_class: x / total > 0.5 ? "text_quiz_correct" : "text_quiz_incorrect",
                }
            }
            )
        } />
        {/* <div className="gap_small" />
        <DisplayedStats statistics={
            scores.map((x, i) => {
                return {
                    name: "Score " + (i) + "/5",
                    value: (x / total * 100).toFixed(0) + "%",
                }
            }
            )
        } /> */}
    </div>
}

class QuizResult extends PageTemplate {
    constructor(props) {
        super(props);
        this.button = React.createRef();
        this.state = { total: 0, per_question: [0, 0, 0, 0, 0] };
    }

    render() {
        const today = this.props.today;
        const today_name = this.props.today_name;
        const correct_pattern = this.props.history.correct_pattern;
        const total_correct = correct_pattern.reduce((partialSum, a) => partialSum + a, 0);
        const self = this;

        console.log("UPDATE");

        const is_share = isMobile && navigator.canShare && !isFirefox;

        return (
            <div>
                <Header today={today} />
                <div className="gap"></div>
                <Summary correct_pattern={correct_pattern} total_correct={total_correct} total={correct_pattern.length} />
                <div className="gap_small"></div>
                <button className="serif quiz_copy_button" ref={this.button} onClick={async () => {
                    const [text, url] = await summary(today_name, correct_pattern, total_correct, this.props.parameters);

                    async function copy_to_clipboard() {
                        navigator.clipboard.writeText(text + "\n" + url);
                        self.button.current.textContent = "Copied!";
                    }

                    console.log("is mobile: " + isMobile);
                    if (is_share) {
                        try {
                            console.log(text);
                            console.log(url);
                            await navigator.share({
                                url: url,
                                text: text + "\n",
                            })
                        } catch (err) {
                            console.log("caught");
                            console.log(err);
                            await copy_to_clipboard();
                        }
                    } else {
                        await copy_to_clipboard();
                    }
                }}>
                    <div>{is_share ? "Share" : "Copy"}</div>
                    <div style={{ marginInline: "0.25em" }}></div>
                    <img src="/share.png" className="icon" style={{ width: "1em", height: "1em" }} />
                </button>
                <div className="gap" />
                <div className="gap"></div>
                {
                    this.state.total > 30 ? <div>
                        <AudienceStatistics total={this.state.total} per_question={this.state.per_question} />
                        <div className="gap"></div>
                        <div className="gap"></div>
                    </div> : undefined
                }
                <QuizStatistics whole_history={this.props.whole_history} today={this.props.today} />
                <div className="gap"></div>
                <span className="serif quiz_summary">Details (spoilers, don't share!)</span>
                <div className="gap_small"></div>
                {
                    this.props.quiz.map(
                        (quiz, index) => (
                            <QuizResultRow {...quiz}
                                key={index}
                                index={index}
                                choice={this.props.history.choices[index]}
                                correct={correct_pattern[index]}
                                settings={this.props.settings}
                            />
                        )
                    )
                }
            </div>
        )
    }
    async componentDidMount() {
        if (this.props.get_per_question != null) {
            const response = await this.props.get_per_question.then((response) => response.json());
            console.log(response);
            this.setState({ total: response["total"], per_question: response["per_question"] });
        }
    }
}

function DisplayedStat({ number, name, addtl_class }) {
    if (addtl_class == undefined) {
        addtl_class = "";
    }
    // large font for numbers, small for names. Center-aligned using flexbox
    return <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.3em" }}>
        <div className={"serif " + addtl_class} style={{ fontSize: "1.5em" }}>{number}</div>
        <div className="serif" style={{ fontSize: "0.5em" }}>{name}</div>
    </div>

}

function DisplayedStats({ statistics }) {
    return <div className="serif" style={
        {
            textAlign: "center", width: "100%", margin: "auto", fontSize: "1.5em",
            display: "flex", flexWrap: "wrap", justifyContent: "center"
        }
    }>
        {
            statistics.map((stat, i) =>
                <DisplayedStat key={i} number={stat.value} name={stat.name} addtl_class={stat.addtl_class} />
            )
        }
    </div>
}

class QuizStatistics extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
        const whole_history = this.props.whole_history;
        const historical_correct = new Array(this.props.today + 1).fill(-1);
        const frequencies = new Array(6).fill(0);
        const played_games = [];
        for (var i = 0; i <= this.props.today; i++) {
            const hist_i = whole_history[i];
            if (hist_i === undefined) {
                continue;
            } else {
                const amount = whole_history[i + ""].correct_pattern.reduce((partialSum, a) => partialSum + a, 0);
                historical_correct[i] = amount;
                frequencies[amount] += 1;
                played_games.push(amount);
            }
        }
        const streaks = new Array(6).fill(0);
        for (var val = 0; val < streaks.length; val++) {
            for (var i = historical_correct.length - 1; i >= 0; i--) {
                if (historical_correct[i] >= val) {
                    streaks[val] += 1;
                } else {
                    break;
                }
            }
        }
        const total_freq = frequencies.reduce((partialSum, a) => partialSum + a, 0);
        const today_score = historical_correct[this.props.today];
        const statistics = [
            {
                name: "Played",
                value: played_games.length,
            },
            {
                name: "Mean score",
                value: (
                    played_games.reduce((partialSum, a) => partialSum + a, 0)
                    / played_games.length
                ).toFixed(2),
            },
            {
                name: "Win Rate (3+)",
                value: (
                    played_games.filter((x) => x >= 3).length
                    / played_games.length * 100
                ).toFixed(0) + "%",
            },
            {
                name: "Current Streak (3+)",
                value: streaks[3],
            },
        ]
        return <div>
            <div className="serif quiz_summary">Your Statistics</div>
            <DisplayedStats statistics={statistics} />
            <div className="gap_small" />
            <table className="quiz_barchart">
                <tbody>
                    {
                        frequencies.map((amt, i) =>
                            <tr key={i}>
                                <td className="quiz_bar_td serif">
                                    {i}/5
                                </td>
                                <td className="quiz_bar_td serif">
                                    <span className="quiz_bar" style={{ width: (amt / total_freq * 20) + "em" }}>
                                    </span>
                                    {amt > 0 ? (<span className="quiz_stat">{amt} ({(amt / total_freq * 100).toFixed(1)}%)</span>) : undefined}
                                </td>
                            </tr>
                        )
                    }
                </tbody>
            </table>
        </div>
    }

}

function red_and_green_squares(correct_pattern) {
    return correct_pattern.map(function (x) {
        // red square emoji for wrong, green for right
        return x ? "🟩" : "🟥";
    }).join("");
}

async function summary(today, correct_pattern, total_correct, parameters, no_url) {
    // wordle-style summary
    let text = "Juxtastat " + today + " " + total_correct + "/" + correct_pattern.length;

    text += "\n";
    text += "\n";

    text += red_and_green_squares(correct_pattern);

    text += "\n";


    var url = "https://juxtastat.org";
    if (parameters != "") {
        console.log(parameters);
        if (parameters.length > 100) {
            // POST to endpoint
            var response = await fetch(ENDPOINT + "/shorten", {
                method: "POST",
                body: JSON.stringify({ full_text: parameters }),
                headers: {
                    "Content-Type": "application/json",
                },
            }).then((response) => response.json());

            // get short url
            const short = response["shortened"];
            parameters = "short=" + short;

        }
        url += "/#" + parameters;
    }
    return [text, url];
}

class Summary extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
        let show = "error";
        // let frac = this.props.total_correct / this.props.total_correct;
        let correct = this.props.total_correct;
        let incorrect = this.props.total - this.props.total_correct;

        if (correct == 0) {
            show = "Impressively Bad Job! 🤷";
        } else if (incorrect == 0) {
            show = "Perfect! 🔥";
        } else if (correct == 1) {
            show = "No! No!! 😠";
        } else if (incorrect == 1) {
            show = "Excellent! 😊";
        } else if (incorrect == 2) {
            show = "Good! 🙃";
        } else {
            show = "Better luck next time! 🫤";
        }
        show = show + " " + correct + "/" + this.props.total;
        return <div>
            <span className="serif quiz_summary">{show}</span>
            <span className="serif quiz_summary">{red_and_green_squares(this.props.correct_pattern)}</span>
        </div>
    }

}

function Clickable({ longname }) {
    // return <a href={article_link(longname)}>{longname}</a>
    // same without any link formatting
    return <a
        href={article_link(longname)}
        style={{ textDecoration: "none", color: "inherit" }}
    >
        {longname}
    </a>
}


class QuizResultRow extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
        const comparison = this.props.stat_a > this.props.stat_b ?
            (<span>&gt;</span>) : (<span>&lt;</span>);
        let first = "serif quiz_result_name_left";
        let second = "serif quiz_result_name_right";

        if (this.props.choice == "A") {
            first += " quiz_selected";
        } else {
            second += " quiz_selected";
        }
        const result = this.props.correct ? "🟩" : "🟥";
        return (
            <div key={this.props.index}>
                <span className="serif quiz_results_question">
                    {this.props.stat_column}
                </span>
                <table className="stats_table quiz_results_table">
                    <tbody>
                        <tr>
                            <td className={first}>
                                <Clickable longname={this.props.longname_a} />
                            </td>
                            <td className="quiz_result_value_left">
                                {this.create_value(this.props.stat_a)}
                            </td>
                            <td className="serif quiz_result_symbol">
                                {comparison}
                            </td>
                            <td className="quiz_result_value_right">
                                {this.create_value(this.props.stat_b)}
                            </td>
                            <td className={second}>
                                <Clickable longname={this.props.longname_b} />
                            </td>
                            <td className="serif quiz_result_symbol">
                                {result}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div className="gap_small" />
            </div>

        )
    }

    create_value(stat) {
        return <div>
            <Statistic
                statname={this.props.stat_column}
                value={stat}
                is_unit={false}
                settings={this.props.settings}
            />
            <Statistic
                statname={this.props.stat_column}
                value={stat}
                is_unit={true}
                settings={this.props.settings}
            />
        </div>
    }
}