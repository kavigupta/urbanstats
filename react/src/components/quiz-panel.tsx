import React, { ReactNode, useContext, useState } from 'react'

import { Navigator } from '../navigation/Navigator'
import { LongLoad } from '../navigation/loading'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import '../common.css'
import './quiz.css'
import { validQuizInfiniteVersions } from '../quiz/infinite'
import { QuizDescriptor, QuizHistory, QuizLocalStorage, QuizQuestion, QuizQuestionsModel, aCorrect } from '../quiz/quiz'
import { QuizQuestionDispatch } from '../quiz/quiz-question'
import { buttonStyle, QuizResult } from '../quiz/quiz-result'
import { useHeaderTextClass } from '../utils/responsive'

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
    const persistentQuizHistory = QuizLocalStorage.shared.history.use()
    const [transientQuizHistory, setTransientQuizHistory] = useState<QuizHistory>({})

    let quizHistory: QuizHistory
    let setQuizHistory: (newQuizHistory: QuizHistory) => void
    switch (props.quizDescriptor.kind) {
        case 'juxtastat':
        case 'retrostat':
            quizHistory = persistentQuizHistory
            setQuizHistory = newHistory => QuizLocalStorage.shared.history.value = newHistory
            break
        case 'custom':
        // TODO stats for infinite quiz
        case 'infinite':
            quizHistory = transientQuizHistory
            setQuizHistory = (newHistory) => { setTransientQuizHistory(newHistory) }
            break
    }

    const [waitingForTime, setWaitingForTime] = useState(false)
    const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false)
    const [questions, setQuestions] = useState<QuizQuestion[]>([])

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
                    <JuxtastatInfiniteButton />
                </div>
            </PageTemplate>
        )
    }

    const todaysQuizHistory = quizHistory[props.quizDescriptor.name] ?? { choices: [], correct_pattern: [] }

    const quizDone = props.todaysQuiz.isDone(todaysQuizHistory.correct_pattern.map(correct => correct ? true : false))
    const questionsExpected = quizDone ? todaysQuizHistory.choices.length : todaysQuizHistory.choices.length + 1
    const missing = questionsExpected - questions.length
    const waiting = waitingForTime || waitingForNextQuestion || missing > 0

    if (!waitingForNextQuestion && missing > 0) {
        setWaitingForNextQuestion(true)
        const promises = Array.from({ length: missing }, (_, i) => props.todaysQuiz.questionByIndex(questions.length + i))
        Promise.all(promises).then((newQuestions) => {
            setWaitingForNextQuestion(false)
            setQuestions([...questions, ...newQuestions.filter((question): question is QuizQuestion => question !== undefined)])
        }).catch((err: unknown) => {
            console.error('Error fetching questions', err)
            // setWaitingForNextQuestion(false)
        })
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
        setTimeout(() => { setWaitingForTime(false) }, 500)
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
                ...buttonStyle(colors.hueColors.blue),
                width: '30%',
                textDecoration: 'none',
            }}
            {...navContext.link({ kind: 'quiz', mode: 'infinite' }, { scroll: { kind: 'position', top: 0 } })}
        >
            Random Juxtastat Infinite
        </a>
    )
}
