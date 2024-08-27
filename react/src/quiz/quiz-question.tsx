
export { QuizQuestionDispatch };

import React, { ReactNode } from "react";
import "../common.css";
import "../components/quiz.css";

import { isFirefox } from 'react-device-detect';
import { Header, Footer, Help } from './quiz-components';
import { MapGeneric, MapGenericProps } from '../components/map';
import { mobileLayout } from "../utils/responsive";
import { History } from "./statistics";
import { a_correct, JuxtaQuestion, RetroQuestion } from "./quiz";

interface MapProps extends MapGenericProps {
    longname: string
}

class Map extends MapGeneric<MapProps> {
    async compute_polygons(): Promise<Readonly<[string[], Record<string, unknown>[], Record<string, unknown>[], number]>> {
        const style = { "interactive": false, "fillOpacity": 0.5, "weight": 1, "color": "#5a7dc3", "fillColor": "#5a7dc3" };
        return [[this.props.longname], [style], [{}], 0];
    }
}

function QuizQuestionDispatch(props: QuizQuestionProps & (
    { question: JuxtaQuestion } |
    { question: RetroQuestion }
)) {
    switch (props.question.kind) {
        case "retrostat":
            return  <RetroQuizQuestion {...props} question={props.question} />;
        case "juxtastat":
            return <JuxtastatQuizQuestion {...props} question={props.question} />;
    }
}

interface QuizQuestionProps {
    waiting: boolean
    history: History[string]
    nested: boolean
    no_header: boolean
    no_footer: boolean
    quiz: { kind: "juxtastat" | "retrostat", name: string}
    on_select: (letter: "A" | "B") => void
    length: number
}

function QuizQuestion(props: QuizQuestionProps & {
    get_question: () => ReactNode
    get_option: (letter: "a" | "b") => ReactNode
    get_demo: (letter: "a" | "b") => ReactNode
}) {

    let button_a = "quiz_clickable";
    let button_b = "quiz_clickable";
    if (props.waiting) {
        const choices = props.history.choices;
        const pattern = props.history.correct_pattern;
        const choice = choices[choices.length - 1];
        const correct = pattern[pattern.length - 1];
        const css_class = correct ? " quiz_correct" : " quiz_incorrect";
        if (choice == "A") {
            button_a += css_class;
        } else {
            button_b += css_class;
        }
    }

    const question = props.get_question();

    const button_style: React.CSSProperties = {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        padding: "0.5em",
    }

    const row_style = { display: "flex", justifyContent: "center", width: "90%", margin: "auto" };

    let quiztext_css = mobileLayout() ? "quiztext_mobile" : "quiztext";
    if (props.nested) {
        quiztext_css += "_nested";
    }

    return (
        <div>
            {props.no_header ? undefined : <Header today={props.quiz.name} quiz_kind={props.quiz.kind} />}
            <div className={"centered_text " + quiztext_css}>
                {question}
            </div>
            <div className="gap"></div>
            <div style={row_style}>
                <div style={{ width: "50%", padding: "0.5em" }}>
                    <div role='button' id="quiz-answer-button-a" className={button_a} onClick={() => props.on_select("A")} style={button_style}>
                        <span style={{ margin: "auto" }}>
                            <div className={"centered_text " + quiztext_css}>
                                {props.get_option('a')}
                            </div>
                        </span>
                    </div>
                </div>
                <div style={{ width: "50%", padding: "0.5em" }}>
                    <div role='button' id="quiz-answer-button-b" className={button_b} onClick={() => props.on_select("B")} style={button_style}>
                        <span style={{ margin: "auto" }}>
                            <div className={"centered_text " + quiztext_css}>
                                {props.get_option('b')}
                            </div>
                        </span>
                    </div>
                </div>
            </div>
            <div style={row_style}>
                <div style={{ width: "50%", padding: "0.5em" }}>
                    {props.get_demo('a')}
                </div>
                <div style={{ width: "50%", padding: "0.5em" }}>
                    {props.get_demo('b')}
                </div>
            </div>
            {props.no_footer ? undefined : <>
                <Footer history={props.history} length={props.length} />
                <Help quiz_kind={props.quiz.kind} />
            </>}
        </div>
    )
}

function RetroQuizQuestion(props: QuizQuestionProps & { question: RetroQuestion }) {

    const get_demo = (key: 'a' | 'b') => {
        const key_upper = a_correct(props.question[key]) ? "A" : "B";
        console.log(key_upper);
        return <div style={{ zoom: 0.5 }}>
            <JuxtastatQuizQuestion
                question={props.question[key]}
                history={{ choices: [key_upper], correct_pattern: [true] }}
                length={5}
                on_select={() => undefined}
                waiting={true}
                quiz={{ kind: 'juxtastat', name: "demo" }}
                no_header={true}
                no_footer={true}
                nested={isFirefox} // Firefox doesn't support zoom so we use special CSS for nested questions
            />
        </div>
    }

    return <QuizQuestion
        {...props}
        get_question={() => "Which question was easier?"}
        get_option={(letter) => `Question ${letter.toUpperCase()}`}
        get_demo={get_demo}
    />

    
}

function JuxtastatQuizQuestion(props: QuizQuestionProps & {
    question: JuxtaQuestion
}) {

    return <QuizQuestion
        {...props}
        get_question={() => render_question(props.question.question)}
        get_option={(letter) => props.question[`longname_${letter}`]}
        get_demo={(letter) => <Map id={`map_${letter}this.props.ident`}
            longname={props.question[`longname_${letter}`]}
            basemap={{ type: "osm" }}
        />}
    />
}

export function question_string(question: string) {
    if (question.startsWith("!FULL ")) {
        return question.slice(6);
    }
    return `Which has a ${question}?`
}

export function render_question(question_text: string) {
    if (question_text.includes("!TOOLTIP")) {
        const [question, tooltip] = question_text.split("!TOOLTIP ");
        return <span>{question_string(question)}<Tooltip content={tooltip} /></span>;
    }
    const q = question_string(question_text);
    return q;
}

export function Tooltip(props: { content: ReactNode }) {
    // create an image that looks like a little [?] text superscript that when you click on it
    // shows the tooltip
    const [show, setShow] = React.useState(false);
    return <span>
        <span style={{ cursor: "pointer" }} onClick={() => setShow(!show)}><sup>ℹ️</sup></span>
        {show ? <div style={{ fontSize: "smaller" }}>({props.content})</div> : undefined
        }
    </span >
}