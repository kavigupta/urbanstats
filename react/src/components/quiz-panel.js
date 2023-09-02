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
            quiz_history: JSON.parse(localStorage.getItem("quiz_history")) || {},
            waiting: false
        }
        this.todays_quiz = this.get_todays_quiz();
        this.today = this.get_today();
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
                <QuizResult quiz={quiz} history={history} today={this.today} />
            )
        }

        return (
            <QuizQuestion
                {...quiz[index]}
                history={history}
                length={quiz.length}
                on_select={x => this.on_select(x)}
                waiting={this.state.waiting}
            />
        );
    }


    get_todays_quiz() {
        // TODO
        const result = [{
            'question': 'higher % of people who have a graduate degree',
            'stat_column': 'Grad %',
            'longname_a': 'New Jersey, USA',
            'longname_b': 'Oklahoma, USA',
            'stat_a': 0.15965999170325224,
            'stat_b': 0.08869466243023064
        },
        {
            'question': 'higher % of people who are born outside the us',
            'stat_column': 'Born outside US %',
            'longname_a': 'Honolulu [Urban Area], HI, USA',
            'longname_b': 'Knoxville [Urban Area], TN, USA',
            'stat_a': 0.2138420706524398,
            'stat_b': 0.054303262244923545
        },
        {
            'question': 'higher % of units with 2br rent < $750',
            'stat_column': '2BR Rent < $750 %',
            'longname_a': 'Rhode Island, USA',
            'longname_b': 'South Carolina, USA',
            'stat_a': 0.14491238740041276,
            'stat_b': 0.2860413033584326
        },
        {
            'question': 'higher % units built in 2010s+',
            'stat_column': '% units built in 2010s+',
            'longname_a': 'Louisville/Jefferson County [Urban Area], KY-IN, USA',
            'longname_b': 'Lincoln [Urban Area], NE, USA',
            'stat_a': 0.06178147244298866,
            'stat_b': 0.10145396738223135
        },
        {
            'question': 'higher % of people who are asian',
            'stat_column': 'Asian %',
            'longname_a': 'Atlanta city, Georgia, USA',
            'longname_b': 'Henderson city, Nevada, USA',
            'stat_a': 0.04455592448229954,
            'stat_b': 0.09109140307961604
        }];

        return result;
    }

    get_today() {
        // TODO actually get the day
        return "D2";
    }

    get_todays_quiz_history() {
        return this.state.quiz_history[this.today] || { "choices": [], "correct_pattern": [] };
    }

    set_todays_quiz_history(history_today) {
        const history = this.state.quiz_history;
        history[this.today] = history_today;
        this.setState({ history: history, waiting: true });
        localStorage.setItem("quiz_history", JSON.stringify(history));
    }

    on_select(selected) {
        if (this.state.waiting) {
            return;
        }
        const history = this.get_todays_quiz_history();
        const idx = history.correct_pattern.length;
        const quiz = this.todays_quiz[idx];
        history.choices.push(selected);
        history.correct_pattern.push((selected == "A") == (quiz.stat_a > quiz.stat_b));
        this.set_todays_quiz_history(history);
        setTimeout(function () { //Start the timer
            this.setState({ waiting: false }) //After 1 second, set render to true
        }.bind(this), 500)
    }
}

function Header() {
    return (<div className={"centered_text " + (isMobile ? "headertext_mobile" : "headertext")}>Juxtastat</div>);
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
        return (
            <div>
                {/* {this.props.waiting ? <Overlay correct={pattern[pattern.length - 1]} /> : undefined} */}
                <Header />
                <div className={"centered_text " + (isMobile ? "subheadertext_mobile" : "subheadertext")}>
                    Which has a {this.props.question}?
                </div>
                <div className="gap"></div>
                <table>
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