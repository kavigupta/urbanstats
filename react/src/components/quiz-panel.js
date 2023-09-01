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
            'question': 'higher % of people who are hawaiian / pi',
            'stat_column': 'Hawaiian / PI %',
            'longname_a': 'Lexington-Fayette MSA, KY, USA',
            'longname_b': 'Reno MSA, NV, USA',
            'stat_a': 0.00040823117880138684,
            'stat_b': 0.006640902086441797
        },
        {
            'question': 'higher % of people who only speak english at home',
            'stat_column': 'Only English at Home %',
            'longname_a': 'Beaumont-Port Arthur MSA, TX, USA',
            'longname_b': 'Bakersfield MSA, CA, USA',
            'stat_a': 0.8399036567131073,
            'stat_b': 0.5564976632710499
        },
        {
            'question': 'higher area-weighted density',
            'stat_column': 'AW Density',
            'longname_a': 'Durham city, North Carolina, USA',
            'longname_b': 'San Juan zona urbana, Puerto Rico, USA',
            'stat_a': 943.706320123608,
            'stat_b': 3018.1410081438416
        },
        {
            'question': 'higher % of people who are non-citizens',
            'stat_column': 'Non-citizen %',
            'longname_a': 'Essex County, Massachusetts, USA',
            'longname_b': 'Hamilton County, Ohio, USA',
            'stat_a': 0.07936114432335212,
            'stat_b': 0.032050460213597164
        },
        {
            'question': 'higher % of people who have a high school diploma',
            'stat_column': 'High School %',
            'longname_a': 'Cumberland County, Maine, USA',
            'longname_b': 'Pierce County, Washington, USA',
            'stat_a': 0.957963954841063,
            'stat_b': 0.9241018363910174
        }];

        return result;
    }

    get_today() {
        // TODO actually get the day
        return 0;
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