import React from 'react';

import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "../components/quiz.css";

export class Footer extends PageTemplate {
    constructor(props) {
        super(props);
    }

    render() {
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

export class Help extends PageTemplate {
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
            {this.text()} {user_id()}
        </div>
    }
}