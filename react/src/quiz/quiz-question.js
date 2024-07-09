
export { QuizQuestionDispatch };

import React from "react";
import "../common.css";
import "../components/quiz.css";

import { isFirefox } from 'react-device-detect';
import { Header, Footer, Help } from './quiz-components.js';
import { MapGeneric } from '../components/map.js';
import { a_correct } from "../components/quiz-panel.js";
import { mobileLayout } from "../utils/responsive";

class Map extends MapGeneric {
    constructor(props) {
        super(props);
    }

    async compute_polygons() {
        const style = { "interactive": false, "fillOpacity": 0.5, "weight": 1, "color": "#5a7dc3", "fillColor": "#5a7dc3" };
        return [[this.props.longname], [style], [{}], 0];
    }

    async mapDidRender() {
    }
}

function QuizQuestionDispatch(props) {
    if (props.quiz_kind == "retrostat") {
        return <RetroQuizQuestion {...props} />;
    }
    if (props.quiz_kind == "juxtastat") {
        return <JuxtastatQuizQuestion {...props} />;
    }
    throw new Error("Unknown quiz kind: " + props.quiz_kind);
}

class QuizQuestion extends React.Component {
    constructor(props) {
        super(props);
    }

    get_question() {
        throw new Error("get_question not implemented");
    }

    get_option_a() {
        throw new Error("get_option_a not implemented");
    }

    get_option_b() {
        throw new Error("get_option_b not implemented");
    }

    get_demo_a() {
        throw new Error("get_demo_a not implemented");
    }

    get_demo_b() {
        throw new Error("get_demo_b not implemented");
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
        const question = this.get_question();

        const button_style = {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column",
            padding: "0.5em",
        }

        const row_style = { display: "flex", justifyContent: "center", width: "90%", margin: "auto" };

        var quiztext_css = mobileLayout() ? "quiztext_mobile" : "quiztext";
        if (this.props.nested) {
            quiztext_css += "_nested";
        }

        return (
            <div>
                {/* {this.props.waiting ? <Overlay correct={pattern[pattern.length - 1]} /> : undefined} */}
                {this.props.no_header ? undefined : <Header today={this.props.today} quiz_kind={this.props.quiz_kind} />}
                <div className={"centered_text " + quiztext_css}>
                    {question}
                </div>
                <div className="gap"></div>
                <div style={row_style}>
                    <div style={{ width: "50%", padding: "0.5em" }}>
                        <div role='button' className={button_a} onClick={() => this.props.on_select("A")} style={button_style}>
                            <span style={{ margin: "auto" }}>
                                <div className={"centered_text " + quiztext_css}>
                                    {this.get_option_a()}
                                </div>
                            </span>
                        </div>
                    </div>
                    <div style={{ width: "50%", padding: "0.5em" }}>
                        <div role='button' className={button_b} onClick={() => this.props.on_select("B")} style={button_style}>
                            <span style={{ margin: "auto" }}>
                                <div className={"centered_text " + quiztext_css}>
                                    {this.get_option_b()}
                                </div>
                            </span>
                        </div>
                    </div>
                </div>
                <div style={row_style}>
                    <div style={{ width: "50%", padding: "0.5em" }}>
                        {this.get_demo_a()}
                    </div>
                    <div style={{ width: "50%", padding: "0.5em" }}>
                        {this.get_demo_b()}
                    </div>
                </div>
                {this.props.no_footer ? undefined : <>
                    <Footer history={this.props.history} length={this.props.length} />
                    <Help quiz_kind={this.props.quiz_kind} />
                </>}
            </div>
        )
    }
}


class RetroQuizQuestion extends QuizQuestion {
    get_question() {
        return "Which question was easier?";
    }

    get_option_a() {
        return "Question A";
    }

    get_option_b() {
        return "Question B";
    }

    get_demo(key) {
        const key_upper = a_correct("juxtastat", this.props[key]) ? "A" : "B";
        console.log(key_upper);
        return <div style={{ zoom: 0.5 }}>
            <JuxtastatQuizQuestion
                {...this.props[key]}
                history={{ choices: [key_upper], correct_pattern: [true] }}
                length={5}
                on_select={x => null}
                waiting={true}
                today={"demo"}
                ident={key}
                no_header={true}
                no_footer={true}
                nested={isFirefox} // Firefox doesn't support zoom so we use special CSS for nested questions
            />
        </div>
    }

    get_demo_a() {
        return this.get_demo("a");
    }

    get_demo_b() {
        return this.get_demo("b");
    }
}

class JuxtastatQuizQuestion extends QuizQuestion {

    get_question() {
        return render_question(this.props.question);
    }

    get_option_a() {
        return this.props.longname_a;
    }

    get_option_b() {
        return this.props.longname_b;
    }

    get_demo_a() {
        return <Map id={"map_a" + this.props.ident}
            longname={this.props.longname_a}
            article_type={undefined}
            basemap={{ type: "osm" }}
            universe={undefined}
        />
    }

    get_demo_b() {
        return <Map id={"map_b" + this.props.ident}
            longname={this.props.longname_b}
            article_type={undefined}
            basemap={{ type: "osm" }}
            universe={undefined}
        />
    }
}

export function render_question(question) {
    if (question.startsWith("!FULL ")) {
        return question.slice(6);
    }
    return `Which has a ${question}?`
}