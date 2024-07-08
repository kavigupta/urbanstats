import React from 'react';
import { isMobile, isFirefox } from 'react-device-detect';

import { Statistic } from "../components/table.js";
import { article_link } from "../navigation/links";


import { Header, nameOfQuizKind, user_id } from './quiz-components.js';
import { AudienceStatistics, QuizStatistics } from './quiz-statistics.js';
import { ENDPOINT, a_correct } from '../components/quiz-panel.js';
import { render_question } from './quiz-question.js';
import { render_time_remaining } from './dates.js';

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

        return (
            <div>
                <Header today={today} quiz_kind={this.props.quiz_kind} />
                <div className="gap"></div>
                <Summary correct_pattern={correct_pattern} total_correct={total_correct} total={correct_pattern.length} />
                <div className="gap_small"></div>
                <ShareButton
                    button_ref={this.button}
                    parameters={this.props.parameters}
                    today_name={today_name}
                    correct_pattern={correct_pattern}
                    total_correct={total_correct}
                    quiz_kind={this.props.quiz_kind}
                />
                <div className="gap" />
                <div className="gap"></div>
                {this.state.total > 30 ? <div>
                    <AudienceStatistics total={this.state.total} per_question={this.state.per_question} />
                    <div className="gap"></div>
                    <div className="gap"></div>
                </div> : undefined}
                <TimeToNextQuiz today={today} quiz_kind={this.props.quiz_kind} />
                <div className="gap"></div>
                <QuizStatistics whole_history={this.props.whole_history} today={this.props.today} quiz_kind={this.props.quiz_kind} />
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
                            settings={this.props.settings}
                            quiz_kind={this.props.quiz_kind}
                        />
                    )
                )}
                <div className="centered_text serif">
                    {user_id()}
                </div>
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

function ShareButton({ button_ref, parameters, today_name, correct_pattern, total_correct, quiz_kind }) {
    const is_share = isMobile && navigator.canShare && !isFirefox;

    return <button className="serif quiz_copy_button" ref={button_ref} onClick={async () => {
        const [text, url] = await summary(today_name, correct_pattern, total_correct, parameters, false, quiz_kind);

        async function copy_to_clipboard() {
            navigator.clipboard.writeText(text + "\n" + url);
            button_ref.current.textContent = "Copied!";
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
    </button>;
}

class Timer extends React.Component {
    constructor(props) {
        super(props);
        this.state = { time: 0 };
        this.interval = setInterval(() => this.setState({ time: this.state.time + 1 }), 1000);
    }
    render() {
        const w = this.props.quiz_kind == "juxtastat" ? "5em" : "6.5em";
        return <div className="serif quiz_next" style={{ width: w, margin: 0 }} id="quiz-timer">
            <span>{render_time_remaining(this.props.quiz_kind, this.props.today)}</span>
        </div>
    }
}

function TimeToNextQuiz({ today, quiz_kind }) {
    return (
        <div style={{ margin: "auto" }}>
            <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "flex-center",
                flexWrap: "wrap",
                gap: "1em",
            }}>
                <div className="serif quiz_summary" style={{ margin: "auto 0" }}>Next quiz in </div>
                <Timer today={today} quiz_kind={quiz_kind} />
            </div>
        </div>
    );
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

export async function summary(today, correct_pattern, total_correct, parameters, no_url, quiz_kind) {
    // wordle-style summary
    let text = nameOfQuizKind(quiz_kind) + " " + today + " " + total_correct + "/" + correct_pattern.length;

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

function QuizResultRow(props) {
    if (props.quiz_kind == "juxtastat") {
        return <JuxtastatQuizResultRow {...props} />;
    }
    if (props.quiz_kind == "retrostat") {
        return <RetrostatQuizResultRow {...props} />;
    }
    throw new Error("unknown quiz kind: " + props.quiz_kind);
}

export class GenericQuizResultRow extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const comparison = a_correct(this.props.quiz_kind, this.props) ?
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
                {this.get_label()}
                <table className="stats_table quiz_results_table">
                    <tbody>
                        <tr>
                            <td className={first}>
                                {this.get_option("a")}
                            </td>
                            <td style={{ fontWeight: 400 }} className="serif quiz_result_value_left">
                                {this.get_stat("a")}
                            </td>
                            <td className="serif quiz_result_symbol">
                                {comparison}
                            </td>
                            <td style={{ fontWeight: 400 }} className="serif quiz_result_value_right">
                                {this.get_stat("b")}
                            </td>
                            <td className={second}>
                                {this.get_option("b")}
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

    get_label() {
        return <></>
    }
    get_option(letter) {
        throw new Error("not implemented");
    }
    get_stat(stat) {
        throw new Error("not implemented");
    }

    create_value(stat, stat_column) {
        return <span>
            <Statistic
                statname={stat_column}
                value={stat}
                is_unit={false}
                settings={this.props.settings} />
            <Statistic
                statname={stat_column}
                value={stat}
                is_unit={true}
                settings={this.props.settings} />
        </span>;
    }
}

class JuxtastatQuizResultRow extends GenericQuizResultRow {
    constructor(props) {
        super(props);
    }

    get_label() {
        return <span className="serif quiz_results_question">
            {this.props.stat_column}
        </span>
    }

    get_option(letter) {
        return <Clickable longname={this.props["longname_" + letter]} />;
    }

    get_stat(stat) {
        return this.create_value(this.props["stat_" + stat], this.props.stat_column);
    }
}

class RetrostatQuizResultRow extends GenericQuizResultRow {
    constructor(props) {
        super(props);
    }

    get_label() {
        return <span className="serif quiz_results_question">
            Juxtastat Users Who Got This Question Right %
        </span>
    }

    get_option(letter) {
        const style = letter == "a" ? { marginLeft: "20%" } : { marginRight: "20%" };
        let q = this.props[letter];
        return <div style={{ zoom: 0.5 }}>
            <div>{render_question(q.question)}</div>
            <div style={style}>
                <div><Clickable longname={q.longname_a} /> ({this.create_value(q.stat_a, q.stat_column)})</div>
                <div><Clickable longname={q.longname_b} /> ({this.create_value(q.stat_b, q.stat_column)})</div>
            </div>
        </div>
    }

    get_stat(stat) {
        return this.create_value(this.props[stat + "_ease"], "%");
    }
}

export function Clickable({ longname }) {
    // return <a href={article_link(longname)}>{longname}</a>
    // same without any link formatting
    return <a
        href={article_link(undefined, longname)}
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

