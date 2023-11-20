import React from 'react';
import { isMobile, isFirefox } from 'react-device-detect';

import { Statistic } from "../components/table.js";
import { article_link } from "../navigation/links.js";


import { Header } from './quiz-components.js';
import { AudienceStatistics, QuizStatistics } from './quiz-statistics.js';
import { ENDPOINT } from '../components/quiz-panel.js';

export class QuizResult extends React.Component {
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
                            });
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
                {this.state.total > 30 ? <div>
                    <AudienceStatistics total={this.state.total} per_question={this.state.per_question} />
                    <div className="gap"></div>
                    <div className="gap"></div>
                </div> : undefined}
                <QuizStatistics whole_history={this.props.whole_history} today={this.props.today} />
                <div className="gap"></div>
                <span className="serif quiz_summary">Details (spoilers, don't share!)</span>
                <div className="gap_small"></div>
                {this.props.quiz.map(
                    (quiz, index) => (
                        <QuizResultRow {...quiz}
                            key={index}
                            index={index}
                            choice={this.props.history.choices[index]}
                            correct={correct_pattern[index]}
                            settings={this.props.settings} />
                    )
                )}
            </div>
        );
    }
    async componentDidMount() {
        if (this.props.get_per_question != null) {
            const response = await this.props.get_per_question.then((response) => response.json());
            console.log(response);
            this.setState({ total: response["total"], per_question: response["per_question"] });
        }
    }
}
export class Summary extends React.Component {
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
        </div>;
    }

}

export async function summary(today, correct_pattern, total_correct, parameters, no_url) {
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
export class QuizResultRow extends React.Component {
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

        );
    }

    create_value(stat) {
        return <div>
            <Statistic
                statname={this.props.stat_column}
                value={stat}
                is_unit={false}
                settings={this.props.settings} />
            <Statistic
                statname={this.props.stat_column}
                value={stat}
                is_unit={true}
                settings={this.props.settings} />
        </div>;
    }
}

export function Clickable({ longname }) {
    // return <a href={article_link(longname)}>{longname}</a>
    // same without any link formatting
    return <a
        href={article_link(longname)}
        style={{ textDecoration: "none", color: "inherit" }}
    >
        {longname}
    </a>;
}
export function red_and_green_squares(correct_pattern) {
    return correct_pattern.map(function (x) {
        // red square emoji for wrong, green for right
        return x ? "🟩" : "🟥";
    }).join("");
}

