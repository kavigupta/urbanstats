import React, { CSSProperties, ReactNode, useContext, useEffect, useMemo, useState } from 'react'

import { Navigator } from '../navigation/Navigator'
import { loadPageDescriptor, PageData, PageDescriptor } from '../navigation/PageDescriptor'
import { LongLoad } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { Settings } from '../page_template/settings'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import './quiz.css'
import { AuthenticationStateMachine } from '../quiz/AuthenticationStateMachine'
import { SignedOutPanel } from '../quiz/SignedOutPanel'
import { validQuizInfiniteVersions } from '../quiz/infinite'
import { QuizDescriptor, QuizHistory, QuizModel, QuizQuestion, QuizQuestionsModel, aCorrect, getCorrectPattern, nameOfQuizKind } from '../quiz/quiz'
import { QuizQuestionDispatch } from '../quiz/quiz-question'
import { QuizResult } from '../quiz/quiz-result'
import { TestUtils } from '../utils/TestUtils'
import { useHeaderTextClass } from '../utils/responsive'

import { buttonStyle } from './GenericShareButton'

export function QuizPanel(props: { quizDescriptor: QuizDescriptor, todayName?: string, todaysQuiz: QuizQuestionsModel }): ReactNode {
    // set a unique key for the quiz panel so that it will re-render when the quiz changes
    // this is necessary because the quiz panel is a stateful component with all the questions cached.
    return (
        <QuizPanelNoResets
            key={props.todaysQuiz.uniqueKey}
            quizDescriptor={props.quizDescriptor}
            todayName={props.todayName}
            todaysQuiz={props.todaysQuiz}
        />
    )
}

function QuizPanelNoResets(props: { quizDescriptor: QuizDescriptor, todayName?: string, todaysQuiz: QuizQuestionsModel }): ReactNode {
    // We don't want to save certain quiz types, so bypass the persistent store for those
    const headerClass = useHeaderTextClass()
    const colors = useColors()
    const persistentQuizHistory = QuizModel.shared.history.use()
    const [transientQuizHistory, setTransientQuizHistory] = useState<QuizHistory>({})

    let quizHistory: QuizHistory
    let setQuizHistory: (newQuizHistory: QuizHistory) => void
    switch (props.quizDescriptor.kind) {
        case 'juxtastat':
        case 'retrostat':
        case 'infinite':
            quizHistory = persistentQuizHistory
            setQuizHistory = newHistory => QuizModel.shared.history.value = newHistory
            break
        case 'custom':
            quizHistory = transientQuizHistory
            setQuizHistory = (newHistory) => { setTransientQuizHistory(newHistory) }
            break
    }

    const [waitingForTime, setWaitingForTime] = useState(false)
    const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false)
    const [questions, setQuestions] = useState<QuizQuestion[]>([])

    const authState = AuthenticationStateMachine.shared.useState()

    if (authState.state === 'signedOut' && authState.email !== null) {
        return <SignedOutPanel />
    }

    if (props.quizDescriptor.kind === 'infinite' && !(validQuizInfiniteVersions satisfies number[] as number[]).includes(props.quizDescriptor.version)) {
        // TODO this should not come up if you've already done the quiz (only relevant once we add the stats)
        return (
            <PageTemplate>
                <div>
                    <div className={headerClass}>Quiz version mismatch</div>
                    <div style={{
                        width: '50%',
                        margin: 'auto',
                        backgroundColor: colors.slightlyDifferentBackgroundFocused,
                        padding: '1em',
                        fontWeight: 'bold',
                    }}
                    >
                        Juxtastat generation has been updated, so infinite Juxtastat you are trying to access is no longer available.
                    </div>
                    <div style={{ height: '1.5em' }} />
                    <OtherQuizzesButtons />
                </div>
            </PageTemplate>
        )
    }

    const todaysQuizHistory = quizHistory[props.quizDescriptor.name] ?? { choices: [], correct_pattern: [] }

    const quizDone = props.todaysQuiz.isDone(getCorrectPattern(quizHistory, props.quizDescriptor.name))
    const questionsExpected = quizDone ? todaysQuizHistory.choices.length : todaysQuizHistory.choices.length + 1
    const missing = questionsExpected - questions.length
    const waiting = waitingForTime || waitingForNextQuestion || missing > 0

    if (!waitingForNextQuestion && missing > 0) {
        setWaitingForNextQuestion(true)
        const promises = Array.from({ length: missing }, (_, i) => props.todaysQuiz.questionByIndex(questions.length + i))
        TestUtils.shared.startLoading('QuizPanelNoResets')
        Promise.all(promises).then((newQuestions) => {
            setWaitingForNextQuestion(false)
            setQuestions([...questions, ...newQuestions.filter((question): question is QuizQuestion => question !== undefined)])
        }).catch((err: unknown) => {
            console.error('Error fetching questions', err)
            // setWaitingForNextQuestion(false)
        }).finally(() => TestUtils.shared.finishLoading('QuizPanelNoResets'))
    }

    const setTodaysQuizHistory = (historyToday: QuizHistory[string]): void => {
        const newHistory = { ...quizHistory, [props.quizDescriptor.name]: historyToday }
        setWaitingForTime(true)
        setQuizHistory(newHistory)
    }

    const onSelect = (selected: 'A' | 'B'): void => {
        if (waiting) {
            return
        }
        const history = todaysQuizHistory
        const idx = history.correct_pattern.length
        const question = questions[idx]
        history.choices.push(selected)
        history.correct_pattern.push((selected === 'A') === aCorrect(question))
        setTodaysQuizHistory(history)
        setTimeout(() => { setWaitingForTime(false) }, TestUtils.shared.isTesting ? 0 : 500)
    }

    return (
        <PageTemplate>
            {(() => {
                const quiz = props.todaysQuiz
                const history = todaysQuizHistory

                let index = history.choices.length
                if (waiting) {
                    index -= 1
                }

                if (!waiting && quizDone) {
                    return (
                        <QuizResult
                            // can only show results if the quiz is done
                            quiz={questions}
                            wholeHistory={quizHistory}
                            history={history}
                            todayName={props.todayName}
                            quizDescriptor={props.quizDescriptor}
                        />
                    )
                }

                if (index < 0 || index >= questions.length) {
                    const message = index < 0 ? 'Loading quiz...' : 'Loading results...'
                    return (
                        <div>
                            <input type="hidden" data-test-loading-quiz={true} />
                            <div className={headerClass}>{message}</div>
                            <LongLoad />
                        </div>
                    )
                }

                return (
                    <QuizQuestionDispatch
                        quiz={props.quizDescriptor}
                        question={questions[index]}
                        history={history}
                        length={quiz.length ?? history.choices.length}
                        onSelect={onSelect}
                        waiting={waiting}
                        nested={false}
                        noHeader={false}
                        noFooter={false}
                    />
                )
            })()}
        </PageTemplate>
    )
}

export function JuxtastatInfiniteButton(): ReactNode {
    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    return (
        <a
            style={{
                ...buttonStyle(colors.hueColors.blue, colors.buttonTextWhite),
                width: '30%',
                textDecoration: 'none',
            }}
            {...navContext.link({ kind: 'quiz', mode: 'infinite' }, { scroll: { kind: 'position', top: 0 } })}
        >
            Random Juxtastat Infinite
        </a>
    )
}
type QuizPageDescriptor = Extract<PageDescriptor, { kind: 'quiz' }>
interface TodoQuiz {
    pageData: Extract<PageData, {
        kind: 'quiz'
    }>
    newPageDescriptor: QuizPageDescriptor
}

export function OtherQuizzesButtons(): ReactNode {
    /**
     * Show users other quizzes they haven't completed yet (and Juxtastat Infinite)
     */

    const colors = useColors()
    const navContext = useContext(Navigator.Context)

    const { current } = navContext.usePageState()
    const currentQuizMode = current.descriptor.kind === 'quiz' ? current.descriptor.mode : 'notAQuiz'

    const otherQuizPages: QuizPageDescriptor[] = useMemo(() => ([
        { kind: 'quiz', mode: undefined },
        { kind: 'quiz', mode: 'retro' },
        { kind: 'quiz', mode: 'infinite' },
    ] as const).filter(({ mode }) => mode !== currentQuizMode), [currentQuizMode])

    const [todoQuizzes, setTodoQuizzes] = useState<TodoQuiz[]>([])

    useEffect(() => {
        let cancel = false

        TestUtils.shared.startLoading('OtherQuizzesButtons')
        void (async () => {
            const quizDatas = await Promise.all(otherQuizPages.map(pageDescriptor => loadPageDescriptor(pageDescriptor, Settings.shared)))
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Prevents races
            if (!cancel) {
                setTodoQuizzes(
                    quizDatas.filter(q =>
                        q.newPageDescriptor.mode === 'infinite'
                        || !q.pageData.quiz.isDone(
                            getCorrectPattern(QuizModel.shared.history.value, q.pageData.quizDescriptor.name))))
            }
        })().finally(() => TestUtils.shared.finishLoading('OtherQuizzesButtons'))

        return () => { cancel = true }
    }, [otherQuizPages])

    const otherQuizButtonStyle: CSSProperties = {
        ...buttonStyle(colors.hueColors.blue, colors.buttonTextWhite),
        width: '30%',
        textDecoration: 'none',
    }

    if (todoQuizzes.length === 0) {
        return null
    }

    return (
        <>
            <div className="gap"></div>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'flex-center',
                flexWrap: 'wrap',
                gap: '1em',
            }}
            >
                {todoQuizzes.map(quiz => (
                    <a
                        key={quiz.pageData.quizDescriptor.kind}
                        style={otherQuizButtonStyle}
                        {...navContext.link(quiz.newPageDescriptor, { scroll: { kind: 'position', top: 0 } })}
                    >
                        Play
                        {' '}
                        { nameOfQuizKind(quiz.pageData.quizDescriptor.kind) }
                    </a>
                ))}
            </div>
        </>
    )
}
