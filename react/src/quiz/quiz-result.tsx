import React, { CSSProperties, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { isFirefox, isMobile } from 'react-device-detect'

import { Icon } from '../components/Icon'
import { JuxtastatInfiniteButton, OtherQuizzesButtons } from '../components/quiz-panel'
import { CheckboxSetting } from '../components/sidebar'
import { Statistic } from '../components/table'
import { Navigator } from '../navigation/Navigator'
import { JuxtastatColors } from '../page_template/color-themes'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { Settings, useSetting } from '../page_template/settings'
import { getVector, VectorSettingsDictionary } from '../page_template/settings-vector'
import { allGroups, allYears, statParents, StatPath, StatName } from '../page_template/statistic-tree'
import { persistentClient } from '../utils/urbanstats-persistent-client'

import { AuthenticationStateMachine } from './AuthenticationStateMachine'
import { msRemaining, renderTimeRemaining } from './dates'
import { JuxtaQuestion, QuizDescriptor, QuizHistory, QuizQuestion, RetroQuestion, aCorrect, QuizFriends, nameOfQuizKind, QuizKind, QuizModel, QuizDescriptorWithTime } from './quiz'
import { ExportImport, Header, QuizAuthStatus, UserId } from './quiz-components'
import { QuizFriendsPanel } from './quiz-friends'
import { renderQuestion } from './quiz-question'
import { AudienceStatistics, Medal, ordinalThis, ourResultToDisplayForFriends, QuizStatistics } from './quiz-statistics'
import { getCachedPerQuestionStats, getPerQuestionStats, PerQuestionStats, reportToServer } from './statistics'

export type CorrectPattern = (boolean | 0 | 1)[]

const maxPerLine = 10

const authNagEntries = 10

interface QuizResultProps {
    quizDescriptor: QuizDescriptor
    todayName?: string
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
    const [stats, setStats] = useState<PerQuestionStats>((
        props.quizDescriptor.kind === 'custom' || props.quizDescriptor.kind === 'infinite'
            ? undefined
            : getCachedPerQuestionStats(props.quizDescriptor)
    ) ?? { total: 0, per_question: [0, 0, 0, 0, 0] })
    const quizFriends = QuizModel.shared.friends.use()

    const setQuizFriends = (qf: QuizFriends): void => {
        QuizModel.shared.friends.value = qf
    }

    useEffect(() => {
        // TODO stats for infinite quiz
        if (props.quizDescriptor.kind === 'custom') {
            return
        }
        void reportToServer(props.wholeHistory, props.quizDescriptor.kind)
        if (props.quizDescriptor.kind === 'infinite') {
            return
        }
        void getPerQuestionStats(props.quizDescriptor).then(setStats)
    }, [props.wholeHistory, props.quizDescriptor])

    const correctPattern = props.history.correct_pattern

    const authError = QuizModel.shared.authenticationError.use()

    const dismiss = QuizModel.shared.dismissAuthNag.use() !== null

    const authState = AuthenticationStateMachine.shared.useState()

    const nagSignIn = !dismiss && authState.state === 'signedOut' && Object.keys(props.wholeHistory).length >= authNagEntries

    const colors = useColors()

    return (
        <div>
            <Header quiz={props.quizDescriptor} />
            <div className="gap"></div>
            {authError
                ? (
                        <NotificationBanner>
                            <b>
                                Warning! Someone is possibly attempting to hijack your account.
                                Please contact us at security@urbanstats.org, and send your persistent ID.
                            </b>
                        </NotificationBanner>
                    )
                : undefined}
            {nagSignIn && !authError
                ? (
                        <NotificationBanner>
                            <div>
                                <QuizAuthStatus />
                            </div>
                            <div role="button" title="Dismiss" onClick={() => QuizModel.shared.dismissAuthNag.value = Date.now()}>
                                <Icon size="1em" color={colors.textMain} src="/close.png" style={{ display: 'inline-block' }} />
                            </div>
                        </NotificationBanner>
                    )
                : undefined}
            <Summary correctPattern={correctPattern} quizKind={props.quizDescriptor.kind} />
            <div className="gap_small"></div>
            <ShareButton
                buttonRef={button}
                todayName={props.todayName}
                correctPattern={correctPattern}
                quizKind={props.quizDescriptor.kind}
                medal={props.quizDescriptor.kind === 'infinite' ? ordinalThis(props.quizDescriptor, props.wholeHistory) : undefined}
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
            {
                props.quizDescriptor.kind === 'custom' || props.quizDescriptor.kind === 'infinite'
                    ? undefined
                    : <TimeToNextQuiz quiz={props.quizDescriptor} />
            }
            {
                props.quizDescriptor.kind === 'infinite'
                    ? <JuxtastatInfiniteButton />
                    : undefined
            }
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
            {
                // TODO stats for infinite quiz
                props.quizDescriptor.kind === 'custom'
                    ? undefined
                    : (
                            <div style={{ margin: 'auto', width: '100%', maxWidth: '500px' }}>
                                <QuizFriendsPanel
                                    quizFriends={quizFriends}
                                    quizDescriptor={props.quizDescriptor}
                                    setQuizFriends={setQuizFriends}
                                    myResult={
                                        props.quizDescriptor.kind === 'infinite'
                                            ? ourResultToDisplayForFriends(props.quizDescriptor, props.wholeHistory)
                                            : { corrects: correctPattern }
                                    }
                                />
                            </div>
                        )
            }
            <div className="gap_small"></div>
            <div className="centered_text serif">
                <UserId />
                <ExportImport />
            </div>
            <OtherQuizzesButtons />
        </div>
    )
}

function NotificationBanner(props: { children: ReactNode }): ReactNode {
    const colors = useColors()
    return (
        <>
            <div
                className="serif"
                style={{
                    backgroundColor: colors.slightlyDifferentBackgroundFocused, width: '75%', margin: 'auto',
                    fontSize: '1.5em',
                    padding: '0.5em',
                    textAlign: 'center',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-evenly',
                }}
            >
                {props.children}
            </div>
            <div className="gap" />
        </>
    )
}

export function buttonStyle(color: string, textColor: string): CSSProperties {
    return {
        textAlign: 'center',
        fontSize: '2em',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        margin: '0 auto',
        padding: '0.25em 1em',
        backgroundColor: color,
        borderRadius: '0.25em',
        border: 'none',
        color: textColor,
    }
}

interface ShareButtonProps {
    buttonRef: React.RefObject<HTMLButtonElement>
    todayName: string | undefined
    correctPattern: CorrectPattern
    quizKind: QuizKind
    medal?: Medal
}

function ShareButton(props: ShareButtonProps): ReactNode {
    const [compactRepr] = useSetting('juxtastatCompactEmoji')
    const asb = <ActualShareButton {...props} compactRepr={compactRepr} />
    if (props.correctPattern.length <= maxPerLine) {
        return asb
    }
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CheckboxSetting
                    name="Compact emoji representation"
                    settingKey="juxtastatCompactEmoji"
                    testId="juxtastatCompactEmoji"
                />
            </div>
            <div className="gap_small"></div>
            {asb}
        </div>
    )
}

function ActualShareButton({ buttonRef, todayName, correctPattern, quizKind, medal, compactRepr }: (ShareButtonProps & { compactRepr: boolean })): ReactNode {
    const juxtaColors = useJuxtastatColors()
    const produceSummary = (): Promise<[string, string]> => summary(juxtaColors, todayName, correctPattern, quizKind, medal, compactRepr)
    return <GenericShareButton buttonRef={buttonRef} produceSummary={produceSummary} />
}

export function GenericShareButton(props: {
    buttonRef: React.RefObject<HTMLButtonElement>
    produceSummary: () => Promise<[string, string]>
}): ReactNode {
    const colors = useColors()
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- We need to check the condition for browser compatibility.
    const canShare = navigator.canShare?.({ url: 'https://juxtastat.org', text: 'test' }) ?? false
    const isShare = isMobile && canShare && !isFirefox

    return (
        <button
            className="serif"
            style={buttonStyle(colors.hueColors.green, colors.buttonTextWhite)}
            ref={props.buttonRef}
            onClick={async () => {
                const [text, url] = await props.produceSummary()

                async function copyToClipboard(): Promise<void> {
                    await navigator.clipboard.writeText(`${text}\n${url}`)
                    props.buttonRef.current!.textContent = 'Copied!'
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

function TimeToNextQuiz({ quiz }: { quiz: QuizDescriptorWithTime }): ReactNode {
    const colors = useColors()
    const [, setTime] = useState(0)
    useEffect(() => {
        const interval = setInterval(() => { setTime(time => time + 1) }, 1000)
        return () => { clearInterval(interval) }
    })

    const w = quiz.kind === 'juxtastat' ? '5em' : '6.5em'

    const timerStyle: CSSProperties = {
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
        color: colors.buttonTextWhite,
    }

    const navigator = useContext(Navigator.Context)

    let contents: ReactNode

    if (msRemaining(quiz) < 0 && navigator.currentDescriptor.kind === 'quiz') {
        contents = (
            <a
                {...navigator.link({
                    kind: 'quiz',
                    mode: quiz.kind === 'retrostat' ? 'retro' : undefined,
                    date: navigator.currentDescriptor.date !== undefined ? navigator.currentDescriptor.date + 1 : undefined,
                }, { scroll: { kind: 'position', top: 0 } })}
                style={{ textDecoration: 'none' }}
            >
                <div
                    className="serif"
                    style={{
                        ...timerStyle,
                        width: undefined,
                        padding: '0.25em 1em',
                    }}
                >
                    Next Quiz
                </div>
            </a>
        )
    }
    else {
        contents = (
            <>
                <div className="serif quiz_summary" style={{ margin: 'auto 0' }}>Next quiz in </div>
                <div
                    className="serif"
                    style={timerStyle}
                >
                    <span>{renderTimeRemaining(quiz)}</span>
                </div>
            </>
        )
    }

    return (
        <div
            style={{ margin: 'auto' }}
            id="quiz-timer"
        >
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'flex-center',
                flexWrap: 'wrap',
                gap: '1em',
            }}
            >
                {contents}
            </div>
        </div>
    )
}

function juxtaSummary(correctPattern: CorrectPattern): [string, string] {
    let show = 'error'
    const total = correctPattern.length
    const correct = correctPattern.reduce((partialSum: number, a) => partialSum + (a ? 1 : 0), 0)
    const incorrect = total - correct

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
    return [show, `${correct}/${total}`]
}

function infiniteSummary(correctPattern: CorrectPattern): [string, string] {
    const correct = correctPattern.reduce((partialSum: number, a) => partialSum + (a ? 1 : 0), 0)
    const pattern = `${correct}/∞`
    if (correct < 10) {
        return ['You can do better! 🤷', pattern]
    }
    if (correct < 20) {
        return ['Not bad! 🫤', pattern]
    }
    if (correct < 30) {
        return ['Good job! 🙃', pattern]
    }
    if (correct < 40) {
        return ['Great! 😊', pattern]
    }
    return ['Amazing! 🔥', pattern]
}

function summaryTexts(correctPattern: CorrectPattern, quizKind: QuizKind): [string, string] {
    switch (quizKind) {
        case 'juxtastat':
        case 'retrostat':
        case 'custom':
            return juxtaSummary(correctPattern)
        case 'infinite':
            return infiniteSummary(correctPattern)
    }
}

export function Summary(props: { correctPattern: CorrectPattern, quizKind: QuizKind }): ReactNode {
    const [compactRepr] = useSetting('juxtastatCompactEmoji')
    const juxtaColors = useJuxtastatColors()
    const [prefix, summaryText] = summaryTexts(props.correctPattern, props.quizKind)
    const show = `${prefix} ${summaryText}`
    return (
        <div>
            <span className="serif quiz_summary" id="quiz-result-summary-words">{show}</span>
            <div id="quiz-result-summary-emoji">
                {
                    redAndGreenSquares(juxtaColors, props.correctPattern, compactRepr).map((line, index) => (
                        <div className="serif quiz_summary" key={index}>{line}</div>
                    ))
                }
            </div>
        </div>
    )
}

function renderMedalAsString(medal: Medal): string {
    return ['🥇 Personal Best!', '🥈 Personal 2nd Best!', '🥉 Personal 3rd Best!'][medal - 1]
}

export async function summary(juxtaColors: JuxtastatColors, todayName: string | undefined, correctPattern: CorrectPattern, quizKind: QuizKind, medal: Medal | undefined, compactRepr: boolean): Promise<[string, string]> {
    // wordle-style summary
    const [, summaryText] = summaryTexts(correctPattern, quizKind)
    let text = nameOfQuizKind(quizKind)
    if (todayName !== undefined) {
        text += ` ${todayName}`
    }
    text += ` ${summaryText}`

    text += '\n'
    text += '\n'

    text += redAndGreenSquares(juxtaColors, correctPattern, compactRepr).join('\n')

    if (medal !== undefined) {
        text += '\n'
        text += '\n'
        text += renderMedalAsString(medal)
    }

    text += '\n'

    // eslint-disable-next-line no-restricted-syntax -- Sharing
    const hash = window.location.hash
    let url = `https://juxtastat.org${hash === '' ? '' : `/${hash}`}`
    if (hash.length > 40) {
        // current url is too long, shorten it. get the current url without the origin or slash
        // eslint-disable-next-line no-restricted-syntax -- Sharing
        const thisURL = window.location.href.substring(window.location.origin.length + 1)
        const { data } = await persistentClient.POST('/shorten', {
            body: { full_text: thisURL },
        })
        if (data === undefined) {
            throw new Error('Error while shortening')
        }
        url = `https://s.urbanstats.org/s?c=${data.shortened}`
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
                        <td className="serif quiz_result_symbol quiz_result_comparison_symbol">
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

function Value({ stat, statColumn }: { stat: number, statColumn: StatName | '%' }): ReactNode {
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
            }, { scroll: { kind: 'position', top: 0 } })}
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

function emojiForCount(count: number): string[] {
    if (count >= 10) {
        return [...emojiForCount(Math.floor(count / 10)), ...emojiForCount(count % 10)]
    }
    switch (count) {
        case 0:
            return ['0️⃣']
        case 1:
            return ['1️⃣']
        case 2:
            return ['2️⃣']
        case 3:
            return ['3️⃣']
        case 4:
            return ['4️⃣']
        case 5:
            return ['5️⃣']
        case 6:
            return ['6️⃣']
        case 7:
            return ['7️⃣']
        case 8:
            return ['8️⃣']
        case 9:
            return ['9️⃣']
    }
    throw new Error(`unexpected count ${count}`)
}

function toCompactRepresentation(correctPattern: CorrectPattern, correct: string, incorrect: string): string[] {
    // RRGGG -> R<emoji 2>G<emoji 3>
    const result: string[][] = [[]]
    let currentSymbol: boolean | undefined = undefined
    let currentCount = 0

    const add = (symbol: boolean | undefined, count: number): void => {
        if (symbol === undefined) {
            return
        }
        const last = result[result.length - 1]
        last.push(symbol ? correct : incorrect)
        if (count > 1) {
            last.push(...emojiForCount(count))
        }
        if (last.length >= maxPerLine) {
            result.push([])
        }
    }

    for (const x of correctPattern.map(t => t ? true : false)) {
        if (x === currentSymbol) {
            currentCount += 1
        }
        else {
            add(currentSymbol, currentCount)
            currentSymbol = x
            currentCount = 1
        }
    }
    add(currentSymbol, currentCount)
    return result.map(line => line.join(''))
}

export function redAndGreenSquares(juxtaColors: JuxtastatColors, correctPattern: CorrectPattern, compactRepr: boolean): string[] {
    if (compactRepr && correctPattern.length > maxPerLine) {
        return toCompactRepresentation(correctPattern, juxtaColors.correctEmoji, juxtaColors.incorrectEmoji)
    }
    if (correctPattern.length > maxPerLine) {
        const lines = []
        for (let i = 0; i < correctPattern.length; i += maxPerLine) {
            lines.push(redAndGreenSquares(juxtaColors, correctPattern.slice(i, i + maxPerLine), compactRepr)[0])
        }
        return lines
    }
    return [
        correctPattern.map(function (x) {
            // red square emoji for wrong, green for right
            return x ? juxtaColors.correctEmoji : juxtaColors.incorrectEmoji
        }).join(''),
    ]
}
