import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { isFirefox, isMobile } from 'react-device-detect'

import { Statistic } from '../components/table'
import { article_link } from '../navigation/links'

import { render_time_remaining } from './dates'
import { ENDPOINT, JuxtaQuestion, QuizDescriptor, QuizQuestion, RetroQuestion, a_correct, nameOfQuizKind } from './quiz'
import { Header, UserId } from './quiz-components'
import { render_question } from './quiz-question'
import { AudienceStatistics, QuizStatistics } from './quiz-statistics'
import { History, reportToServer, reportToServerRetro } from './statistics'

interface QuizResultProps {
    quizDescriptor: QuizDescriptor
    today_name: string
    history: {
        correct_pattern: boolean[]
        choices: ('A' | 'B')[]
    }
    parameters: string
    whole_history: History
    quiz: QuizQuestion[]
}

export function QuizResult(props: QuizResultProps): ReactNode {
    const button = useRef<HTMLButtonElement>(null)
    const [total, setTotal] = useState(0)
    const [per_question, set_per_question] = useState([0, 0, 0, 0, 0])

    useEffect(() => {
        void (async () => {
            let response: Response | undefined
            if (props.quizDescriptor.kind === 'juxtastat') {
                void reportToServer(props.whole_history)
                // POST to endpoint /juxtastat/get_per_question_stats with the current day
                response = await fetch(`${ENDPOINT}/juxtastat/get_per_question_stats`, {
                    method: 'POST',
                    body: JSON.stringify({ day: props.quizDescriptor.name }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            }
            if (props.quizDescriptor.kind === 'retrostat') {
                void reportToServerRetro(props.whole_history)
                response = await fetch(`${ENDPOINT}/retrostat/get_per_question_stats`, {
                    method: 'POST',
                    body: JSON.stringify({ week: parseInt(props.quizDescriptor.name.substring(1)) }),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            }
            if (response !== undefined) {
                const responseJson = await response.json() as { total: number, per_question: number[] }
                setTotal(responseJson.total)
                set_per_question(responseJson.per_question)
            }
        })()
    }, [props.whole_history, props.quizDescriptor.kind, props.quizDescriptor.name])

    const today_name = props.today_name
    const correct_pattern = props.history.correct_pattern
    const total_correct = correct_pattern.reduce((partialSum, a) => partialSum + (a ? 1 : 0), 0)

    return (
        <div>
            <Header quiz={props.quizDescriptor} />
            <div className="gap"></div>
            <Summary correct_pattern={correct_pattern} total_correct={total_correct} total={correct_pattern.length} />
            <div className="gap_small"></div>
            <ShareButton
                button_ref={button}
                parameters={props.parameters}
                today_name={today_name}
                correct_pattern={correct_pattern}
                total_correct={total_correct}
                quiz_kind={props.quizDescriptor.kind}
            />
            <div className="gap" />
            <div className="gap"></div>
            {total > 30
                ? (
                        <div>
                            <AudienceStatistics total={total} per_question={per_question} />
                            <div className="gap"></div>
                            <div className="gap"></div>
                        </div>
                    )
                : undefined}
            <TimeToNextQuiz quiz={props.quizDescriptor} />
            <div className="gap"></div>
            <QuizStatistics whole_history={props.whole_history} quiz={props.quizDescriptor} />
            <div className="gap"></div>
            <span className="serif quiz_summary">Details (spoilers, don&apos;t share!)</span>
            <div className="gap_small"></div>
            {props.quiz.map(
                (quiz, index) => (
                    <QuizResultRow
                        question={quiz}
                        key={index}
                        index={index}
                        choice={props.history.choices[index]}
                        correct={correct_pattern[index]}
                    />
                ),
            )}
            <div className="centered_text serif">
                <UserId />
            </div>
        </div>
    )
}

interface ShareButtonProps {
    button_ref: React.RefObject<HTMLButtonElement>
    parameters: string
    today_name: string
    correct_pattern: boolean[]
    total_correct: number
    quiz_kind: 'juxtastat' | 'retrostat'
}

function ShareButton({ button_ref, parameters, today_name, correct_pattern, total_correct, quiz_kind }: ShareButtonProps): ReactNode {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- We need to check the condition for browser compatibility.
    const can_share = navigator.canShare?.({ url: 'https://juxtastat.org', text: 'test' }) ?? false
    const is_share = isMobile && can_share && !isFirefox

    return (
        <button
            className="serif quiz_copy_button"
            ref={button_ref}
            onClick={async () => {
                const [text, url] = await summary(today_name, correct_pattern, total_correct, parameters, quiz_kind)

                async function copy_to_clipboard(): Promise<void> {
                    await navigator.clipboard.writeText(`${text}\n${url}`)
                    button_ref.current!.textContent = 'Copied!'
                }

                if (is_share) {
                    try {
                        await navigator.share({
                            url,
                            text: `${text}\n`,
                        })
                    }
                    catch {
                        await copy_to_clipboard()
                    }
                }
                else {
                    await copy_to_clipboard()
                }
            }}
        >
            <div>{is_share ? 'Share' : 'Copy'}</div>
            <div style={{ marginInline: '0.25em' }}></div>
            <img src="/share.png" className="icon" style={{ width: '1em', height: '1em' }} />
        </button>
    )
}

function Timer({ quiz }: { quiz: QuizDescriptor }): ReactNode {
    const [, setTime] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => { setTime(time => time + 1) }, 1000)
        return () => { clearInterval(interval) }
    })

    const w = quiz.kind === 'juxtastat' ? '5em' : '6.5em'
    return (
        <div className="serif quiz_next" style={{ width: w, margin: 0 }} id="quiz-timer">
            <span>{render_time_remaining(quiz)}</span>
        </div>
    )
}

function TimeToNextQuiz({ quiz }: { quiz: QuizDescriptor }): ReactNode {
    return (
        <div style={{ margin: 'auto' }}>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'flex-center',
                flexWrap: 'wrap',
                gap: '1em',
            }}
            >
                <div className="serif quiz_summary" style={{ margin: 'auto 0' }}>Next quiz in </div>
                <Timer quiz={quiz} />
            </div>
        </div>
    )
}

export function Summary(props: { total_correct: number, total: number, correct_pattern: boolean[] }): ReactNode {
    let show = 'error'
    // let frac = this.props.total_correct / this.props.total_correct;
    const correct = props.total_correct
    const incorrect = props.total - props.total_correct

    if (correct === 0) {
        show = 'Impressively Bad Job! 🤷'
    }
    else if (incorrect === 0) {
        show = 'Perfect! 🔥'
    }
    else if (correct === 1) {
        show = 'No! No!! 😠'
    }
    else if (incorrect === 1) {
        show = 'Excellent! 😊'
    }
    else if (incorrect === 2) {
        show = 'Good! 🙃'
    }
    else {
        show = 'Better luck next time! 🫤'
    }
    show = `${show} ${correct}/${props.total}`
    return (
        <div>
            <span className="serif quiz_summary" id="quiz-result-summary-words">{show}</span>
            <span className="serif quiz_summary" id="quiz-result-summary-emoji">{red_and_green_squares(props.correct_pattern)}</span>
        </div>
    )
}

export async function summary(today_name: string, correct_pattern: boolean[], total_correct: number, parameters: string, quiz_kind: 'juxtastat' | 'retrostat'): Promise<[string, string]> {
    // wordle-style summary
    let text = `${nameOfQuizKind(quiz_kind)} ${today_name} ${total_correct}/${correct_pattern.length}`

    text += '\n'
    text += '\n'

    text += red_and_green_squares(correct_pattern)

    text += '\n'

    let url = 'https://juxtastat.org'
    if (parameters !== '') {
        if (parameters.length > 100) {
            // POST to endpoint
            const responseJson = await fetch(`${ENDPOINT}/shorten`, {
                method: 'POST',
                body: JSON.stringify({ full_text: parameters }),
                headers: {
                    'Content-Type': 'application/json',
                },
            }).then(response => response.json() as Promise<{ shortened: string }>)

            // get short url
            const short = responseJson.shortened
            parameters = `short=${short}`
        }
        url += `/#${parameters}`
    }
    return [text, url]
}

function QuizResultRow(props: QuizResultRowProps & { question: QuizQuestion }): ReactNode {
    switch (props.question.kind) {
        case 'juxtastat':
            return <JuxtastatQuizResultRow {...props} question={props.question} />
        case 'retrostat':
            return <RetrostatQuizResultRow {...props} question={props.question} />
    }
}

interface QuizResultRowProps {
    question: QuizQuestion
    choice: 'A' | 'B'
    correct: boolean
    index: number
}

interface GenericQuizResultRowProps extends QuizResultRowProps {
    get_label: () => ReactNode
    get_option: (letter: 'a' | 'b') => ReactNode
    get_stat: (letter: 'a' | 'b') => ReactNode
}

export function GenericQuizResultRow(props: GenericQuizResultRowProps): ReactNode {
    const comparison = a_correct(props.question)
        ? (<span>&gt;</span>)
        : (<span>&lt;</span>)
    let first = 'serif quiz_result_name_left'
    let second = 'serif quiz_result_name_right'

    if (props.choice === 'A') {
        first += ' quiz_selected'
    }
    else {
        second += ' quiz_selected'
    }
    const result = props.correct ? '🟩' : '🟥'

    return (
        <div key={props.index}>
            {props.get_label()}
            <table className="stats_table quiz_results_table">
                <tbody>
                    <tr>
                        <td className={first}>
                            {props.get_option('a')}
                        </td>
                        <td style={{ fontWeight: 400 }} className="serif quiz_result_value_left">
                            {props.get_stat('a')}
                        </td>
                        <td className="serif quiz_result_symbol">
                            {comparison}
                        </td>
                        <td style={{ fontWeight: 400 }} className="serif quiz_result_value_right">
                            {props.get_stat('b')}
                        </td>
                        <td className={second}>
                            {props.get_option('b')}
                        </td>
                        <td className="serif quiz_result_symbol">
                            {result}
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className="gap_small" />
        </div>

    )
}

function Value({ stat, stat_column }: { stat: number, stat_column: string }): ReactNode {
    return (
        <span>
            <Statistic
                statname={stat_column}
                value={stat}
                is_unit={false}
            />
            <Statistic
                statname={stat_column}
                value={stat}
                is_unit={true}
            />
        </span>
    )
}

function JuxtastatQuizResultRow(props: QuizResultRowProps & { question: JuxtaQuestion }): ReactNode {
    return (
        <GenericQuizResultRow
            {...props}
            get_label={() => (
                <span className="serif quiz_results_question">
                    {props.question.stat_column}
                </span>
            )}
            get_option={letter => <Clickable longname={props.question[`longname_${letter}`]} />}
            get_stat={stat => <Value stat={props.question[`stat_${stat}`]} stat_column={props.question.stat_column} />}
        />
    )
}

function RetrostatQuizResultRow(props: QuizResultRowProps & { question: RetroQuestion }): ReactNode {
    return (
        <GenericQuizResultRow
            {...props}
            get_label={() => (
                <span className="serif quiz_results_question">
                    Juxtastat Users Who Got This Question Right %
                </span>
            )}
            get_option={(letter) => {
                const style = letter === 'a' ? { marginLeft: '20%' } : { marginRight: '20%' }
                const q = props.question[letter]
                return (
                    <div style={{ zoom: 0.5 }}>
                        <div>{render_question(q.question)}</div>
                        <div style={style}>
                            <div>
                                <Clickable longname={q.longname_a} />
                                {' '}
                                <Value stat={q.stat_a} stat_column={q.stat_column} />
                            </div>
                            <div>
                                <Clickable longname={q.longname_b} />
                                {' '}
                                <Value stat={q.stat_b} stat_column={q.stat_column} />
                            </div>
                        </div>
                    </div>
                )
            }}
            get_stat={stat => <Value stat={props.question[`${stat}_ease`]} stat_column="%" />}
        />
    )
}

export function Clickable({ longname }: { longname: string }): ReactNode {
    // return <a href={article_link(longname)}>{longname}</a>
    // same without any link formatting
    return (
        <a
            href={article_link(undefined, longname)}
            style={{ textDecoration: 'none', color: 'inherit' }}
        >
            {longname}
        </a>
    )
}
export function red_and_green_squares(correct_pattern: boolean[]): string {
    return correct_pattern.map(function (x) {
    // red square emoji for wrong, green for right
        return x ? '🟩' : '🟥'
    }).join('')
}
