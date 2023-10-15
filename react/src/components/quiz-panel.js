export { QuizPanel };

import React from 'react';

import { Statistic } from "./table.js";
import { Map } from "./map.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./quiz.css";
import { isMobile } from 'react-device-detect';
import { article_link } from '../navigation/links.js';

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
            return (
                <QuizResult
                    quiz={quiz}
                    whole_history={this.get_whole_history()}
                    history={history}
                    today={this.today}
                    today_name={this.today_name}
                    settings={this.state.settings}
                    parameters={this.props.parameters} />
            )
        }

        return (
            <QuizQuestion
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

    set_todays_quiz_history(history_today) {
        const history = this.get_whole_history();
        history[this.today] = history_today;
        this.setState({ history: history, waiting: true });
        // if today is a number and not a string
        if (typeof this.today == "number") {
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

function Header({ today }) {
    let text = "Juxtastat";
    if (typeof today != "number") {
        text += " " + today;
    }
    return (<div className={"centered_text " + (isMobile ? "headertext_mobile" : "headertext")}>{text}</div>);
}

// function Overlay({ correct }) {
//     let cn = "quiz_overlay_text serif";
//     const text = correct ? "Correct" : "Incorrect";
//     if (correct) {
//         cn += " quiz_overlay_correct";
//     } else {
//         cn += " quiz_overlay_incorrect";
//     }
//     return (<div className={cn}>
//         <div className="quiz_overlay_text_content">
//             {text}!
//         </div>
//     </div>)
// }

class QuizQuestion extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
        let button_a = "quiz_clickable";
        let button_b = "quiz_clickable";
        if (this.props.waiting) {
            const choices = this.props.history.choices;
            const pattern = this.props.history.correct_pattern;
            const choice = choices[choices.length - 1];
            const correct = pattern[pattern.length - 1];
            const css_class = correct ? " quiz_correct" : " quiz_incorrect";
            if (choice == "A") {
                button_a += css_class;
            } else {
                button_b += css_class;
            }
        }
        console.log(button_a);
        console.log(button_b);
        let question = `Which has a ${this.props.question}?`;
        // sometimes questions start with !FULL
        if (this.props.question.startsWith("!FULL ")) {
            question = this.props.question.slice(6);
        }

        return (
            <div>
                {/* {this.props.waiting ? <Overlay correct={pattern[pattern.length - 1]} /> : undefined} */}
                <Header today={this.props.today} />
                <div className={"centered_text " + (isMobile ? "subheadertext_mobile" : "subheadertext")}>
                    {question}
                </div>
                <div className="gap"></div>
                <table className="quiz_question_table">
                    <tbody>
                        <tr>
                            <td className="quiz_option">
                                <button className={button_a} onClick={() => this.props.on_select("A")}>
                                    <div className={"centered_text " + (isMobile ? "subheadertext_mobile" : "subheadertext")}>
                                        {this.props.longname_a}
                                    </div>
                                </button>
                            </td>
                            <td className="quiz_option">
                                <button className={button_b} onClick={() => this.props.on_select("B")}>
                                    <div className={"centered_text " + (isMobile ? "subheadertext_mobile" : "subheadertext")}>
                                        {this.props.longname_b}
                                    </div>
                                </button>
                            </td>
                        </tr>
                        <tr>
                            <td className="quiz_option">
                                <Map id="map_a"
                                    longname={this.props.longname_a}
                                    settings={this.state.settings}
                                    article_type={undefined} />
                            </td>
                            <td className="quiz_option">
                                <Map id="map_b"
                                    longname={this.props.longname_b}
                                    settings={this.state.settings}
                                    article_type={undefined} />
                            </td>
                        </tr>
                    </tbody>
                </table>
                <Footer history={this.props.history} length={this.props.length} />
                <Help />
            </div>
        )
    }
}

class Footer extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
        console.log(this.props.history);
        const choices = this.props.history.correct_pattern.map(
            (correct, _) => correct ? "quiz_green" : "quiz_red"
        );
        while (choices.length < this.props.length) {
            choices.push("quiz_blank");
        }
        return <table className="quiz_footer">
            <tbody>
                <tr>
                    {choices.map(x =>
                        <td className={x}></td>
                    )}
                </tr>
            </tbody>
        </table >
    }
}

class Help extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
        return <div className="centered_text serif">
            Select the geographical region answering the question. The questions
            get harder as you go on.
        </div>
    }
}

class QuizResult extends PageTemplate {
    constructor(props) {
        super(props);
        this.button = React.createRef();
    }

    render() {
        const today = this.props.today;
        const today_name = this.props.today_name;
        const correct_pattern = this.props.history.correct_pattern;
        const total_correct = correct_pattern.reduce((partialSum, a) => partialSum + a, 0);
        return (
            <div>
                <Header today={today} />
                <div className="gap"></div>
                <Summary correct_pattern={correct_pattern} total_correct={total_correct} total={correct_pattern.length} />
                <div className="gap_small"></div>
                <button class="serif quiz_copy_button" ref={this.button} onClick={async () => {
                    const text = await summary(today_name, correct_pattern, total_correct, this.props.parameters);
                    // if (isMobile) {
                    //     try {
                    //         shareOnMobile({
                    //             text: text,
                    //         })
                    //     } catch (err) {
                    //         console.log("caught");
                    //         navigator.clipboard.writeText(text);
                    //         this.button.current.textContent = "Copied!";
                    //     }
                    // }
                    navigator.clipboard.writeText(text)
                    this.button.current.textContent = "Copied!";
                }}>Copy to clipboard</button>
                <div className="gap" />
                <QuizStatistics whole_history={this.props.whole_history} today={this.props.today} />
                <div className="gap"></div>
                <div className="gap"></div>
                <span className="serif quiz_summary">Details (spoilers, don't share!)</span>
                <div className="gap_small"></div>
                {
                    this.props.quiz.map(
                        (quiz, index) => (
                            <QuizResultRow {...quiz}
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
}

class QuizStatistics extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
        const whole_history = this.props.whole_history;
        const historical_correct = new Array(this.props.today + 1).fill(-1);
        const frequencies = new Array(6).fill(0);
        for (var i = 0; i <= this.props.today; i++) {
            const hist_i = whole_history[i];
            if (hist_i === undefined) {
                continue;
            } else {
                const amount = whole_history[i + ""].correct_pattern.reduce((partialSum, a) => partialSum + a, 0);
                historical_correct[i] = amount;
                frequencies[amount] += 1;
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
        console.log(whole_history);
        console.log(historical_correct);
        console.log(frequencies);
        return <div>
            <div className="serif quiz_summary">Statistics</div>
            <table className="quiz_barchart">
                <tr>
                    <td className="quiz_bar_td serif">
                    </td>
                    <td className="quiz_bar_td serif quiz_bar_td_header">
                        Frequency
                    </td>
                    <td className="quiz_bar_td serif quiz_bar_td_header">
                        Max Streak
                    </td>
                </tr>
                {
                    frequencies.map((amt, i) =>
                        <tr>
                            <td className="quiz_bar_td serif">
                                {i}/5
                            </td>
                            <td className="quiz_bar_td serif">
                                <span className="quiz_bar" style={{ width: (amt / total_freq * 20) + "em" }}>
                                </span>
                                {amt > 0 ? (<span className="quiz_stat">{amt} ({(amt / total_freq * 100).toFixed(1)}%)</span>) : undefined}
                            </td>
                            <td className="quiz_bar_td serif quiz_bar_centered">
                                {streaks[i]}
                            </td>
                        </tr>
                    )
                }
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

async function summary(today, correct_pattern, total_correct, parameters) {
    // wordle-style summary
    let text = "Juxtastat " + today + " " + total_correct + "/" + correct_pattern.length;

    text += "\n";
    text += "\n";

    text += red_and_green_squares(correct_pattern);

    text += "\n";
    text += "\n";

    text += "juxtastat.org";
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
        text += "/#" + parameters;
    }
    return text;
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
            <div>
                <span className="serif quiz_results_question">
                    {this.props.stat_column}
                </span>
                <table className="stats_table quiz_results_table">
                    <tbody>
                        <tr key={this.props.index}>
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