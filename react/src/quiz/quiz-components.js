
export { Header, Footer, Help };

import React from 'react';

import { PageTemplate } from "../page_template/template.js";
import "../common.css";
import "../components/quiz.css";
import { isMobile } from 'react-device-detect';


function Header({ today }) {
    let text = "Juxtastat";
    if (typeof today != "number") {
        text += " " + today;
    }
    return (<div className={"centered_text " + (isMobile ? "headertext_mobile" : "headertext")}>{text}</div>);
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

    render() {
        return <div className="centered_text serif">
            Select the geographical region answering the question. The questions
            get harder as you go on.
        </div>
    }
}
