export { QuizPanel };

import React from 'react';

import { StatisticRowRaw } from "./table.js";
import { Map } from "./map.js";
import { Related } from "./related-button.js";
import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "./quiz.css";
import { isMobile } from 'react-device-detect';

class QuizPanel extends PageTemplate {
    constructor(props) {
        super(props);
        this.state = {
            ...this.state,
            quiz_history: JSON.parse(localStorage.getItem("quiz_history")) || {}
        }
        this.todays_quiz = this.get_todays_quiz();
        this.today = this.get_today();
    }

    main_content() {

        const quiz = this.todays_quiz;
        const history = this.get_todays_quiz_history();

        const index = history["choices"].length;

        if (index == quiz.length) {
            return (
                <QuizResult quiz={quiz} history={history} today={this.today} />
            )
        }

        return (
            <QuizQuestion
                {...quiz[index]}
                on_select={x => this.on_select(x)}
            />
        );
    }


    get_todays_quiz() {
        // TODO
        const result = [{
            'question': 'higher % of people who are boomers',
            'stat_column': 'Boomer %',
            'longname_a': 'Canton [Urban Area], OH, USA',
            'longname_b': 'Ogden-Layton [Urban Area], UT, USA',
            'stat_a': 0.2568660249764331,
            'stat_b': 0.16268518260446413
        },
        {
            'question': 'higher % of people who are asian',
            'stat_column': 'Asian %',
            'longname_a': 'Durham city, North Carolina, USA',
            'longname_b': 'Anaheim city, California, USA',
            'stat_a': 0.05605239910321793,
            'stat_b': 0.17483509386964344
        },
        {
            'question': 'higher % of people who are black',
            'stat_column': 'Black %',
            'longname_a': 'Lynchburg MSA, VA, USA',
            'longname_b': 'San Juan-Carolina-Caguas MSA, PR, USA',
            'stat_a': 0.16084528255725497,
            'stat_b': 0.0015971823473871606
        },
        {
            'question': 'higher % of people who are hawaiian / pi',
            'stat_column': 'Hawaiian / PI %',
            'longname_a': 'Tucson city, Arizona, USA',
            'longname_b': 'Minneapolis city, Minnesota, USA',
            'stat_a': 0.002444803089258342,
            'stat_b': 0.000397716965070682
        },
        {
            'question': 'higher % of people who are on public insurance',
            'stat_column': 'Public Insurance %',
            'longname_a': 'Allentown-Bethlehem [Urban Area], PA-NJ, USA',
            'longname_b': 'Antioch [Urban Area], CA, USA',
            'stat_a': 0.1858512397095249,
            'stat_b': 0.2404909478581838
        }];

        return result;
    }

    get_today() {
        // TODO actually get the day
        return "D1";
    }

    get_todays_quiz_history() {
        return this.state.quiz_history[this.today] || { "choices": [], "correct_pattern": [] };
    }

    set_todays_quiz_history(history_today) {
        const history = this.state.quiz_history;
        history[this.today] = history_today;
        this.setState({ history: history });
        localStorage.setItem("quiz_history", JSON.stringify(history));
    }

    on_select(selected) {
        const history = this.get_todays_quiz_history();
        const idx = history.correct_pattern.length;
        const quiz = this.todays_quiz[idx];
        history.choices.push(selected);
        history.correct_pattern.push((selected == "A") == (quiz.stat_a > quiz.stat_b));
        this.set_todays_quiz_history(history);
    }
}

function Header() {
    return (<div className={"centered_text " + (isMobile ? "headertext_mobile" : "headertext")}>Juxtastat</div>);
}

class QuizQuestion extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
        return (
            <div>
                <Header />
                <div className={"centered_text " + (isMobile ? "subheadertext_mobile" : "subheadertext")}>
                    Which has a {this.props.question}?
                </div>
                <div className="gap"></div>
                <table>
                    <tbody>
                        <tr>
                            <td className="quiz_option">
                                <button className="quiz_clickable" onClick={() => this.props.on_select("A")}>
                                    <div className={"centered_text " + (isMobile ? "subheadertext_mobile" : "subheadertext")}>
                                        {this.props.longname_a}
                                    </div>
                                </button>
                            </td>
                            <td className="quiz_option">
                                <button className="quiz_clickable" onClick={() => this.props.on_select("B")}>
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
            </div>
        )
    }
}

class QuizResult extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
        const today = this.props.today;
        const correct_pattern = this.props.history.correct_pattern;
        const total_correct = correct_pattern.reduce((partialSum, a) => partialSum + a, 0);
        return (
            <div>
                <Header />
                <div className="gap"></div>
                <Summary total_correct={total_correct} total={correct_pattern.length} />
                <div className="gap_small"></div>
                <table className="stats_table quiz_results_table">
                    <tbody>
                        {
                            this.props.quiz.map(
                                (quiz, index) => (
                                    <QuizResultRow {...quiz}
                                        index={index}
                                        choice={this.props.history.choices[index]}
                                        correct={correct_pattern[index]}
                                    />
                                )
                            )
                        }
                    </tbody>
                </table>
                <div className="gap_small"></div>
                <button class="serif quiz_copy_button" onClick={() => {
                    navigator.clipboard.writeText(summary(today, correct_pattern, total_correct))
                }}>Copy to clipboard</button>
            </div>
        )
    }
}


function summary(today, correct_pattern, total_correct) {
    // wordle-style summary
    let text = "Juxtastat " + today + " " + total_correct + "/" + correct_pattern.length;

    text += "\n";
    text += "\n";

    text += correct_pattern.map(function (x) {
        // red square emoji for wrong, green for right
        return x ? "🟩" : "🟥";
    }).join("");

    text += "\n";
    text += "\n";

    text += "https://urbanstats.org/quiz.html";
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
        return <span className="serif quiz_summary">{show}</span>;
    }

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
            <tr key={this.props.index}>
                <td className={first}>
                    {this.props.longname_a}
                </td>
                <td className="serif quiz_result_symbol">
                    {comparison}
                </td>
                <td className={second}>
                    {this.props.longname_b}
                </td>
                <td className="serif quiz_result_symbol">
                    {result}
                </td>
            </tr>
        )
    }
}