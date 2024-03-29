
export { Header, Footer, Help, nameOfQuizKind };

import React from 'react';

import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "../components/quiz.css";
import { headerTextClass } from '../utils/responsive.js';


function nameOfQuizKind(quiz_kind) {
    return quiz_kind.replace(
        /\w\S*/g,
        function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}


function Header({ today, quiz_kind }) {
    let text = nameOfQuizKind(quiz_kind);
    if (typeof today != "number") {
        text += " " + today;
    }
    return (<div className={headerTextClass()}>{text}</div>);
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
                    {choices.map((x, i) =>
                        <td key={i} className={x}></td>
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

    text() {
        if (this.props.quiz_kind == "juxtastat") {
            return "Select the geographical region answering the question. The questions get harder as you go on."
        } else if (this.props.quiz_kind == "retrostat") {
            return "Select the easier question. A question is considered easier if more people got it right."
        }
        throw new Error("Unknown quiz kind " + this.props.quiz_kind);
    }

    render() {
        return <div className="centered_text serif">
            {this.text()}
        </div>
    }
}
