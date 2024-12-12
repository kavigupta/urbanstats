import React, { ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { isFirefox, isMobile } from 'react-device-detect'

import { Statistic } from '../components/table'
import { Navigator } from '../navigation/navigator'
import { JuxtastatColors } from '../page_template/color-themes'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { Settings } from '../page_template/settings'
import { getVector, VectorSettingsDictionary } from '../page_template/settings-vector'
import { allGroups, allYears, statParents, StatPath } from '../page_template/statistic-tree'

import { render_time_remaining } from './dates'
import { JuxtaQuestion, QuizDescriptor, QuizHistory, QuizQuestion, RetroQuestion, a_correct, QuizFriends, loadQuizFriends, nameOfQuizKind } from './quiz'
import { ExportImport, Header, UserId } from './quiz-components'
import { QuizFriendsPanel } from './quiz-friends'
import { render_question } from './quiz-question'
import { AudienceStatistics, QuizStatistics } from './quiz-statistics'
import { getCachedPerQuestionStats, getPerQuestionStats, PerQuestionStats, parse_time_identifier, reportToServer, reportToServerRetro } from './statistics'

interface QuizResultProps {
    quizDescriptor: QuizDescriptor
    today_name: string
    history: {
        correct_pattern: boolean[]
        choices: ('A' | 'B')[]
    }
    whole_history: QuizHistory
    quiz: QuizQuestion[]
}

export function QuizResult(props: QuizResultProps): ReactNode {
    const button = useRef<HTMLButtonElement>(null)
    const [stats, setStats] = useState<PerQuestionStats>(getCachedPerQuestionStats(props.quizDescriptor) ?? { total: 0, per_question: [0, 0, 0, 0, 0] })
    const [authError, setAuthError] = useState(false)
    const [quizFriends, setQuizFriendsDirect] = useState(loadQuizFriends())

    const setQuizFriends = (qf: QuizFriends): void => {
        setQuizFriendsDirect(qf)
        localStorage.setItem('quiz_friends', JSON.stringify(qf))
    }

    console.log(quizFriends)

    useEffect(() => {
        void reportToServer(props.whole_history, props.quizDescriptor.kind).then(setAuthError)
        void getPerQuestionStats(props.quizDescriptor).then(setStats)
    }, [props.whole_history, props.quizDescriptor])

    const colors = useColors()
    const today_name = props.today_name
    const correct_pattern = props.history.correct_pattern
    const total_correct = correct_pattern.reduce((partialSum, a) => partialSum + (a ? 1 : 0), 0)

    return (
        <div>
            <Header quiz={props.quizDescriptor} />
            <div className="gap"></div>
            {authError
                ? (
                        <div
                            className="serif"
                            style={{
                                backgroundColor: colors.slightlyDifferentBackgroundFocused, width: '75%', margin: 'auto',
                                fontSize: '1.5em',
                                padding: '0.5em',
                                textAlign: 'center',
                            }}
                        >
                            <b>
                                Warning! Someone is possibly attempting to hijack your account.
                                Please contact us at security@urbanstats.org, and send your persistent ID.
                            </b>
                        </div>
                    )
                : undefined}
            <Summary correct_pattern={correct_pattern} total_correct={total_correct} total={correct_pattern.length} />
            <div className="gap_small"></div>
            <ShareButton
                button_ref={button}
                today_name={today_name}
                correct_pattern={correct_pattern}
                total_correct={total_correct}
                quiz_kind={props.quizDescriptor.kind}
            />
            <div className="gap" />
            <div className="gap"></div>
            {stats.total > 30
                ? (
                        <div>
                            <AudienceStatistics {...stats} />
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
            <div className="gap_small"></div>
            <div style={{ margin: 'auto', width: '50%' }}>
                <QuizFriendsPanel
                    quizFriends={quizFriends}
                    date={parse_time_identifier(props.quizDescriptor.kind, props.quizDescriptor.name.toString())}
                    quizKind={props.quizDescriptor.kind}
                    setQuizFriends={setQuizFriends}
                    myCorrects={correct_pattern}
                />
            </div>
            <div className="gap_small"></div>
            <div className="centered_text serif">
                <UserId />
                <ExportImport />
            </div>
        </div>
    )
}

interface ShareButtonProps {
    button_ref: React.RefObject<HTMLButtonElement>
    today_name: string
    correct_pattern: boolean[]
    total_correct: number
    quiz_kind: 'juxtastat' | 'retrostat'
}

function ShareButton({ button_ref, today_name, correct_pattern, total_correct, quiz_kind }: ShareButtonProps): ReactNode {
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- We need to check the condition for browser compatibility.
    const can_share = navigator.canShare?.({ url: 'https://juxtastat.org', text: 'test' }) ?? false
    const is_share = isMobile && can_share && !isFirefox

    return (
        <button
            className="serif"
            style={{
                textAlign: 'center',
                fontSize: '2em',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                margin: '0 auto',
                padding: '0.25em 1em',
                backgroundColor: colors.hueColors.green,
                borderRadius: '0.25em',
                border: 'none',
                color: '#fff',
            }}
            ref={button_ref}
            onClick={async () => {
                const [text, url] = summary(juxtaColors, today_name, correct_pattern, total_correct, quiz_kind)

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
    const colors = useColors()
    const [, setTime] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => { setTime(time => time + 1) }, 1000)
        return () => { clearInterval(interval) }
    })

    const w = quiz.kind === 'juxtastat' ? '5em' : '6.5em'
    return (
        <div
            className="serif"
            style={{
                width: w,
                margin: 0,
                backgroundColor: colors.hueColors.blue,
                textAlign: 'center',
                fontSize: '2em',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                padding: '0.25em 0.25em',
                borderRadius: '0.25em',
                border: 'none',
                color: '#fff',
            }}
            id="quiz-timer"
        >
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
    const juxtaColors = useJuxtastatColors()
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
            <span className="serif quiz_summary" id="quiz-result-summary-emoji">{red_and_green_squares(juxtaColors, props.correct_pattern)}</span>
        </div>
    )
}

export function summary(juxtaColors: JuxtastatColors, today_name: string, correct_pattern: boolean[], total_correct: number, quiz_kind: 'juxtastat' | 'retrostat'): [string, string] {
    // wordle-style summary
    let text = `${nameOfQuizKind(quiz_kind)} ${today_name} ${total_correct}/${correct_pattern.length}`

    text += '\n'
    text += '\n'

    text += red_and_green_squares(juxtaColors, correct_pattern)

    text += '\n'

    // eslint-disable-next-line no-restricted-syntax -- Sharing
    const url = new URL(window.location.href)
    url.host = 'juxtastat.org'
    return [text, url.toString()]
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
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()
    const comparison = a_correct(props.question)
        ? (<span>&gt;</span>)
        : (<span>&lt;</span>)
    let firstStyle: React.CSSProperties = {}
    let secondStyle: React.CSSProperties = {}

    if (props.choice === 'A') {
        firstStyle = { backgroundColor: colors.selectedButton, color: colors.selectedButtonText }
    }
    else {
        secondStyle = { backgroundColor: colors.selectedButton, color: colors.selectedButtonText }
    }
    const result = props.correct ? juxtaColors.correctEmoji : juxtaColors.incorrectEmoji

    return (
        <div key={props.index}>
            {props.get_label()}
            <table
                className="stats_table"
                style={{
                    width: '80%',
                    marginLeft: '10%',
                    marginRight: '10%',
                    borderCollapse: 'separate',
                    borderSpacing: '0.1em',
                    fontSize: '1.25em',
                    backgroundColor: colors.unselectedButton,
                }}
            >
                <tbody style={{ color: colors.textMain }}>
                    <tr>
                        <td className="serif quiz_result_name_left" style={firstStyle}>
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
                        <td className="serif quiz_result_name_right" style={secondStyle}>
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
        <ComparisonLink question={props.question}>
            <GenericQuizResultRow
                {...props}
                get_label={() => (
                    <span className="serif quiz_results_question">
                        {props.question.stat_column}
                    </span>
                )}
                get_option={letter => props.question[`longname_${letter}`]}
                get_stat={stat => <Value stat={props.question[`stat_${stat}`]} stat_column={props.question.stat_column} />}
            />
        </ComparisonLink>
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
                    <ComparisonLink question={q}>
                        <div style={{ zoom: 0.5 }}>
                            <div>{render_question(q.question)}</div>
                            <div style={style}>
                                <div>
                                    {q.longname_a}
                                    {' '}
                                    <Value stat={q.stat_a} stat_column={q.stat_column} />
                                </div>
                                <div>
                                    {q.longname_b}
                                    {' '}
                                    <Value stat={q.stat_b} stat_column={q.stat_column} />
                                </div>
                            </div>
                        </div>
                    </ComparisonLink>
                )
            }}
            get_stat={stat => <Value stat={props.question[`${stat}_ease`]} stat_column="%" />}
        />
    )
}

function ComparisonLink({ question, children }: { question: JuxtaQuestion, children: ReactNode }): ReactNode {
    const navContext = useContext(Navigator.Context)
    const settings = useContext(Settings.Context)
    const colors = useColors()
    return (
        <a
            {...navContext.link({
                kind: 'comparison',
                longnames: [question.longname_a, question.longname_b],
                s: getVector(settings, settingsOverrides(question.stat_path)),
            })}
            style={{ textDecoration: 'none', color: colors.textMain }}
        >
            {children}

        </a>
    )
}

function settingsOverrides(questionStatPath?: StatPath): Partial<VectorSettingsDictionary> | undefined {
    if (questionStatPath === undefined) {
        // Old question, doesnt' have stat path
        return undefined
    }
    const parents = statParents.get(questionStatPath)
    if (parents === undefined) {
        // Unknown stat path, possible one that has been removed
        return undefined
    }
    const categoryId = parents.group.parent.id
    const year = parents.year

    return Object.fromEntries([
        ...allGroups.map(group => [`show_stat_group_${group.id}`, group.parent.id === categoryId] as const),
        ...(year !== null ? allYears.map(y => [`show_stat_year_${y}`, y === year] as const) : []),
    ])
}

export function red_and_green_squares(juxtaColors: JuxtastatColors, correct_pattern: boolean[]): string {
    return correct_pattern.map(function (x) {
        // red square emoji for wrong, green for right
        return x ? juxtaColors.correctEmoji : juxtaColors.incorrectEmoji
    }).join('')
}
