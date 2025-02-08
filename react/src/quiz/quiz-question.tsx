import '../common.css'
import '../components/quiz.css'

import React, { ReactNode } from 'react'
import { isFirefox } from 'react-device-detect'

import { MapGeneric, MapGenericProps, Polygons } from '../components/map'
import { useColors } from '../page_template/colors'
import { useMobileLayout } from '../utils/responsive'

import { JuxtastatLivesDisplay } from './infinite'
import { JuxtaQuestion, QuizHistory, QuizKind, RetroQuestion, aCorrect } from './quiz'
import { Footer, Header, Help } from './quiz-components'

interface MapProps extends MapGenericProps {
    longname: string
    color: string
}

class Map extends MapGeneric<MapProps> {
    override computePolygons(): Promise<Polygons> {
        return Promise.resolve({
            polygons: [
                {
                    name: this.props.longname,
                    style: { interactive: false, fillOpacity: 0.5, weight: 1, color: this.props.color, fillColor: this.props.color },
                    meta: {},
                },
            ],
            zoomIndex: 0,
        })
    }
}

export function QuizQuestionDispatch(props: QuizQuestionProps & (
    { question: JuxtaQuestion | RetroQuestion }
)): ReactNode {
    switch (props.question.kind) {
        case 'retrostat':
            return <RetroQuizQuestion {...props} question={props.question} />
        case 'juxtastat':
            return <JuxtastatQuizQuestion {...props} question={props.question} />
        default:
            throw new Error('Invalid question kind')
    }
}

interface QuizQuestionProps {
    waiting: boolean
    history: QuizHistory[string]
    nested: boolean
    noHeader: boolean
    noFooter: boolean
    quiz: { kind: QuizKind, name: number | string }
    onSelect: (letter: 'A' | 'B') => void
    length: number
}

function QuizQuestion(props: QuizQuestionProps & {
    getQuestion: () => ReactNode
    getOption: (letter: 'a' | 'b') => ReactNode
    getDemo: (letter: 'a' | 'b') => ReactNode
}): ReactNode {
    let buttonA = 'quiz_clickable'
    let buttonB = 'quiz_clickable'
    if (props.waiting) {
        const choices = props.history.choices
        const pattern = props.history.correct_pattern
        const choice = choices[choices.length - 1]
        const correct = pattern[pattern.length - 1]
        const cssClass = correct ? ' quiz_correct' : ' quiz_incorrect'
        if (choice === 'A') {
            buttonA += cssClass
        }
        else {
            buttonB += cssClass
        }
    }

    const question = props.getQuestion()

    const buttonStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        padding: '0.5em',
    }

    const rowStyle = { display: 'flex', justifyContent: 'center', width: '90%', margin: 'auto' }

    let quizTextCSS = useMobileLayout() ? 'quiztext_mobile' : 'quiztext'
    if (props.nested) {
        quizTextCSS += '_nested'
    }

    return (
        <div>
            {props.noHeader ? undefined : <Header quiz={props.quiz} />}
            <div className={`centered_text ${quizTextCSS}`}>
                {question}
            </div>
            <div className="gap"></div>
            <div style={rowStyle}>
                <div style={{ width: '50%', padding: '0.5em' }}>
                    <div role="button" id="quiz-answer-button-a" className={buttonA} onClick={() => { props.onSelect('A') }} style={buttonStyle}>
                        <span style={{ margin: 'auto' }}>
                            <div className={`centered_text ${quizTextCSS}`}>
                                {props.getOption('a')}
                            </div>
                        </span>
                    </div>
                </div>
                <div style={{ width: '50%', padding: '0.5em' }}>
                    <div role="button" id="quiz-answer-button-b" className={buttonB} onClick={() => { props.onSelect('B') }} style={buttonStyle}>
                        <span style={{ margin: 'auto' }}>
                            <div className={`centered_text ${quizTextCSS}`}>
                                {props.getOption('b')}
                            </div>
                        </span>
                    </div>
                </div>
            </div>
            <div style={rowStyle}>
                <div style={{ width: '50%', padding: '0.5em' }}>
                    {props.getDemo('a')}
                </div>
                <div style={{ width: '50%', padding: '0.5em' }}>
                    {props.getDemo('b')}
                </div>
            </div>
            {props.noFooter
                ? undefined
                : (
                        <>
                            {props.quiz.kind === 'infinite'
                                ? <JuxtastatLivesDisplay correctPattern={props.history.correct_pattern.map(x => x ? true : false)} />
                                : undefined}
                            <Footer history={props.history} length={props.length} />
                            <Help quizKind={props.quiz.kind} />
                        </>
                    )}
        </div>
    )
}

function RetroQuizQuestion(props: QuizQuestionProps & { question: RetroQuestion }): ReactNode {
    const getDemo = (key: 'a' | 'b'): ReactNode => {
        const keyUpper = aCorrect(props.question[key]) ? 'A' : 'B'
        return (
            <div style={{ zoom: 0.5 }}>
                <JuxtastatQuizQuestion
                    question={props.question[key]}
                    history={{ choices: [keyUpper], correct_pattern: [true] }}
                    length={5}
                    onSelect={() => undefined}
                    waiting={true}
                    quiz={{ kind: 'juxtastat', name: 'demo' }}
                    noHeader={true}
                    noFooter={true}
                    nested={isFirefox} // Firefox doesn't support zoom so we use special CSS for nested questions
                />
            </div>
        )
    }

    return (
        <QuizQuestion
            {...props}
            getQuestion={() => 'Which question was easier?'}
            getOption={letter => `Question ${letter.toUpperCase()}`}
            getDemo={getDemo}
        />
    )
}

function JuxtastatQuizQuestion(props: QuizQuestionProps & {
    question: JuxtaQuestion
}): ReactNode {
    const colors = useColors()
    return (
        <QuizQuestion
            {...props}
            getQuestion={() => renderQuestion(props.question.question)}
            getOption={letter => props.question[`longname_${letter}`]}
            getDemo={letter => (
                <Map
                    longname={props.question[`longname_${letter}`]}
                    basemap={{ type: 'osm' }}
                    color={colors.hueColors.blue}
                />
            )}
        />
    )
}

export function questionString(question: string): string {
    if (question.startsWith('!FULL ')) {
        return question.slice(6)
    }
    return `Which has a ${question}?`
}

export function renderQuestion(questionText: string): ReactNode {
    if (questionText.includes('!TOOLTIP')) {
        const [question, tooltip] = questionText.split('!TOOLTIP ')
        return (
            <span>
                {questionString(question)}
                <Tooltip content={tooltip} />
            </span>
        )
    }
    const q = questionString(questionText)
    return q
}

export function Tooltip(props: { content: ReactNode }): ReactNode {
    // create an image that looks like a little [?] text superscript that when you click on it
    // shows the tooltip
    const [show, setShow] = React.useState(false)
    return (
        <span>
            <sup>
                <div
                    style={{
                        cursor: 'pointer',
                        fontSize: 'smaller',
                        margin: '5px',
                        fontWeight: 'bold',
                        border: 'none',
                        display: 'unset',
                        height: 'unset',
                        padding: '0px 5px',
                    }}
                    onClick={() => { setShow(!show) }}
                    className="quiz_clickable"
                    role="button"
                >
                    {'ⓘ\ufe0e'}
                </div>
            </sup>
            {show
                ? (
                        <div style={{ fontSize: '20px' }}>
                            (
                            {props.content}
                            )
                        </div>
                    )
                : undefined}
        </span>
    )
}
