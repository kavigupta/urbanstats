
export { Header, Footer, Help, nameOfQuizKind, user_id };

import React from 'react';

import "../common.css";
import "../components/quiz.css";
import { headerTextClass } from '../utils/responsive';


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

class Footer extends React.Component {
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

class Help extends React.Component {
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

function user_id() {
    const user_id = localStorage.getItem("persistent_id");
    if (user_id === null) {
        return "";
    } else {
        return <div>Your user id is <span class="juxtastat-user-id">{user_id}</span></div>;
    }
}
