import React from 'react';

import { PageTemplate } from "../page_template/template";
import "../common.css";
import "../components/quiz.css";
import { History } from "./statistics";
import { nameOfQuizKind } from "./quiz";
import { headerTextClass } from "../utils/responsive";

export function Header({ quiz }: { quiz: { kind: "juxtastat" | "retrostat", name: string | number } }) {
    let text = nameOfQuizKind(quiz.kind);
    if (typeof quiz.name != "number") {
        text += " " + quiz.name;
    }
    return (<div className={headerTextClass()}>{text}</div>);
}

export function Footer(props: { length: number, history: History[string] }) {
    const choices: `quiz_${'green' | 'red' | 'blank'}`[] = props.history.correct_pattern.map(
        (correct) => correct ? "quiz_green" : "quiz_red"
    );
    while (choices.length < props.length) {
        choices.push("quiz_blank");
    }
    return <PageTemplate>{() =>
        <table className="quiz_footer">
            <tbody>
                <tr>
                    {choices.map((x, i) =>
                        <td key={i} className={x}></td>
                    )}
                </tr>
            </tbody>
        </table >
    }</PageTemplate>
}

export function Help(props: {quiz_kind: "juxtastat" | "retrostat"}) {

    const text = () => {
        if (props.quiz_kind == "juxtastat") {
            return "Select the geographical region answering the question. The questions get harder as you go on."
        } else if (props.quiz_kind == "retrostat") {
            return "Select the easier question. A question is considered easier if more people got it right."
        }
        throw new Error("Unknown quiz kind " + props.quiz_kind);
    }

    return <PageTemplate>{() =>
        <div className="centered_text serif">
            {text()} {UserId()}
        </div>
    }</PageTemplate>
}

export function UserId() {
    const user_id = localStorage.getItem("persistent_id");
    if (user_id === null) {
        return "";
    } else {
        return <div>Your user id is <span className="juxtastat-user-id">{user_id}</span></div>;
    }
}