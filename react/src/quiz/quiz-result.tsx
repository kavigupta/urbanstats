import React, { ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { isFirefox, isMobile } from 'react-device-detect'

import { Statistic } from '../components/table'
import { Navigator } from '../navigation/navigator'
import { JuxtastatColors } from '../page_template/color-themes'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { Settings } from '../page_template/settings'
import { getVector, VectorSettingsDictionary } from '../page_template/settings-vector'
import { allGroups, allYears, statParents, StatPath } from '../page_template/statistic-tree'

import { renderTimeRemaining } from './dates'
import { JuxtaQuestion, QuizDescriptor, QuizHistory, QuizQuestion, RetroQuestion, aCorrect, QuizFriends, loadQuizFriends, nameOfQuizKind } from './quiz'
import { ExportImport, Header, UserId } from './quiz-components'
import { QuizFriendsPanel } from './quiz-friends'
import { renderQuestion } from './quiz-question'
import { AudienceStatistics, QuizStatistics } from './quiz-statistics'
import { getCachedPerQuestionStats, getPerQuestionStats, PerQuestionStats, parseTimeIdentifier, reportToServer } from './statistics'

export type CorrectPattern = (boolean | 0 | 1)[]

interface QuizResultProps {
    quizDescriptor: QuizDescriptor
    todayName: string
    history: {
        // eslint-disable-next-line no-restricted-syntax -- Persistent data
        correct_pattern: CorrectPattern
        choices: ('A' | 'B')[]
    }
    wholeHistory: QuizHistory
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

    useEffect(() => {
        void reportToServer(props.wholeHistory, props.quizDescriptor.kind).then(setAuthError)
        void getPerQuestionStats(props.quizDescriptor).then(setStats)
    }, [props.wholeHistory, props.quizDescriptor])

    const colors = useColors()
    const correctPattern = props.history.correct_pattern
    const totalCorrect = correctPattern.reduce((partialSum: number, a) => partialSum + (a ? 1 : 0), 0)

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
            <Summary correctPattern={correctPattern} totalCorrect={totalCorrect} total={correctPattern.length} />
            <div className="gap_small"></div>
            <ShareButton
                buttonRef={button}
                todayName={props.todayName}
                correctPattern={correctPattern}
                totalCorrect={totalCorrect}
                quizKind={props.quizDescriptor.kind}
            />
            <div className="gap" />
            <div className="gap"></div>
            {stats.total > 30
                ? (
                        <div>
                            <AudienceStatistics total={stats.total} perQuestion={stats.per_question} />
                            <div className="gap"></div>
                            <div className="gap"></div>
                        </div>
                    )
                : undefined}
            <TimeToNextQuiz quiz={props.quizDescriptor} />
            <div className="gap"></div>
            <QuizStatistics wholeHistory={props.wholeHistory} quiz={props.quizDescriptor} />
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
                        correct={correctPattern[index]}
                    />
                ),
            )}
            <div className="gap_small"></div>
            <div style={{ margin: 'auto', width: '50%' }}>
                <QuizFriendsPanel
                    quizFriends={quizFriends}
                    date={parseTimeIdentifier(props.quizDescriptor.kind, props.quizDescriptor.name.toString())}
                    quizKind={props.quizDescriptor.kind}
                    setQuizFriends={setQuizFriends}
                    myCorrects={correctPattern}
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
    buttonRef: React.RefObject<HTMLButtonElement>
    todayName: string
    correctPattern: CorrectPattern
    totalCorrect: number
    quizKind: 'juxtastat' | 'retrostat'
}

function ShareButton({ buttonRef, todayName, correctPattern, totalCorrect, quizKind }: ShareButtonProps): ReactNode {
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- We need to check the condition for browser compatibility.
    const canShare = navigator.canShare?.({ url: 'https://juxtastat.org', text: 'test' }) ?? false
    const isShare = isMobile && canShare && !isFirefox

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
            ref={buttonRef}
            onClick={async () => {
                const [text, url] = summary(juxtaColors, todayName, correctPattern, totalCorrect, quizKind)

                async function copyToClipboard(): Promise<void> {
                    await navigator.clipboard.writeText(`${text}\n${url}`)
                    buttonRef.current!.textContent = 'Copied!'
                }

                if (isShare) {
                    try {
                        await navigator.share({
                            url,
                            text: `${text}\n`,
                        })
                    }
                    catch {
                        await copyToClipboard()
                    }
                }
                else {
                    await copyToClipboard()
                }
            }}
        >
            <div>{isShare ? 'Share' : 'Copy'}</div>
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
            <span>{renderTimeRemaining(quiz)}</span>
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

export function Summary(props: { totalCorrect: number, total: number, correctPattern: CorrectPattern }): ReactNode {
    const juxtaColors = useJuxtastatColors()
    let show = 'error'
    // let frac = this.props.total_correct / this.props.total_correct;
    const correct = props.totalCorrect
    const incorrect = props.total - props.totalCorrect

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
            <span className="serif quiz_summary" id="quiz-result-summary-emoji">{redAndGreenSquares(juxtaColors, props.correctPattern)}</span>
        </div>
    )
}

export function summary(juxtaColors: JuxtastatColors, todayName: string, correctPattern: CorrectPattern, totalCorrect: number, quizKind: 'juxtastat' | 'retrostat'): [string, string] {
    // wordle-style summary
    let text = `${nameOfQuizKind(quizKind)} ${todayName} ${totalCorrect}/${correctPattern.length}`

    text += '\n'
    text += '\n'

    text += redAndGreenSquares(juxtaColors, correctPattern)

    text += '\n'

    // eslint-disable-next-line no-restricted-syntax -- Sharing
    const hash = window.location.hash
    return [text, `https://juxtastat.org${hash === '' ? '' : `/${hash}`}`]
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
    correct: boolean | 0 | 1
    index: number
}

interface GenericQuizResultRowProps extends QuizResultRowProps {
    getLabel: () => ReactNode
    getOption: (letter: 'a' | 'b') => ReactNode
    getStat: (letter: 'a' | 'b') => ReactNode
}

export function GenericQuizResultRow(props: GenericQuizResultRowProps): ReactNode {
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()
    const comparison = aCorrect(props.question)
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
            {props.getLabel()}
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
                            {props.getOption('a')}
                        </td>
                        <td style={{ fontWeight: 400 }} className="serif quiz_result_value_left">
                            {props.getStat('a')}
                        </td>
                        <td className="serif quiz_result_symbol">
                            {comparison}
                        </td>
                        <td style={{ fontWeight: 400 }} className="serif quiz_result_value_right">
                            {props.getStat('b')}
                        </td>
                        <td className="serif quiz_result_name_right" style={secondStyle}>
                            {props.getOption('b')}
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

function Value({ stat, statColumn }: { stat: number, statColumn: string }): ReactNode {
    return (
        <span>
            <Statistic
                statname={statColumn}
                value={stat}
                isUnit={false}
            />
            <Statistic
                statname={statColumn}
                value={stat}
                isUnit={true}
            />
        </span>
    )
}

function JuxtastatQuizResultRow(props: QuizResultRowProps & { question: JuxtaQuestion }): ReactNode {
    return (
        <ComparisonLink question={props.question}>
            <GenericQuizResultRow
                {...props}
                getLabel={() => (
                    <span className="serif quiz_results_question">
                        {props.question.stat_column}
                    </span>
                )}
                getOption={letter => props.question[`longname_${letter}`]}
                getStat={stat => <Value stat={props.question[`stat_${stat}`]} statColumn={props.question.stat_column} />}
            />
        </ComparisonLink>
    )
}

function RetrostatQuizResultRow(props: QuizResultRowProps & { question: RetroQuestion }): ReactNode {
    return (
        <GenericQuizResultRow
            {...props}
            getLabel={() => (
                <span className="serif quiz_results_question">
                    Juxtastat Users Who Got This Question Right %
                </span>
            )}
            getOption={(letter) => {
                const style = letter === 'a' ? { marginLeft: '20%' } : { marginRight: '20%' }
                const q = props.question[letter]
                return (
                    <ComparisonLink question={q}>
                        <div style={{ zoom: 0.5 }}>
                            <div>{renderQuestion(q.question)}</div>
                            <div style={style}>
                                <div>
                                    {q.longname_a}
                                    {' '}
                                    <Value stat={q.stat_a} statColumn={q.stat_column} />
                                </div>
                                <div>
                                    {q.longname_b}
                                    {' '}
                                    <Value stat={q.stat_b} statColumn={q.stat_column} />
                                </div>
                            </div>
                        </div>
                    </ComparisonLink>
                )
            }}
            getStat={stat => <Value stat={props.question[`${stat}_ease`]} statColumn="%" />}
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
            }, { scroll: 0 })}
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

export function redAndGreenSquares(juxtaColors: JuxtastatColors, correctPattern: CorrectPattern): string {
    return correctPattern.map(function (x) {
        // red square emoji for wrong, green for right
        return x ? juxtaColors.correctEmoji : juxtaColors.incorrectEmoji
    }).join('')
}
