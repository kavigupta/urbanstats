import React, { ReactNode, useState } from 'react'

import { PageTemplate } from '../page_template/template'
import '../common.css'
import './quiz.css'
import { QuizDescriptor, QuizHistory, QuizLocalStorage, QuizQuestion, QuizQuestionsModel, aCorrect } from '../quiz/quiz'
import { QuizQuestionDispatch } from '../quiz/quiz-question'
import { QuizResult } from '../quiz/quiz-result'

export function QuizPanel(props: { quizDescriptor: QuizDescriptor, todayName: string, todaysQuiz: QuizQuestionsModel }): ReactNode {
    // We don't want to save certain quiz types, so bypass the persistent store for those
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
            quizHistory = transientQuizHistory
            setQuizHistory = (newHistory) => { setTransientQuizHistory(newHistory) }
            break
    }

    const [waitingForTime, setWaitingForTime] = useState(false)
    const [waitingForNextQuestion, setWaitingForNextQuestion] = useState(false)
    const [questions, setQuestions] = useState<QuizQuestion[]>([])

    const todaysQuizHistory = quizHistory[props.quizDescriptor.name] ?? { choices: [], correct_pattern: [] }

    const waiting = waitingForTime || waitingForNextQuestion || questions.length < todaysQuizHistory.choices.length

    function newQuestion(count: number): void {
        if (count <= 0) {
            return
        }
        if (waitingForNextQuestion) {
            throw new Error('newQuestion called while waiting for next question')
        }
        setWaitingForNextQuestion(true)
        props.todaysQuiz.questionByIndex(questions.length).then((question) => {
            setWaitingForNextQuestion(false)
            if (question !== undefined) {
                setQuestions([...questions, question])
                newQuestion(count - 1)
            }
        }).catch(() => {
            setWaitingForNextQuestion(false)
        })
    }

    if (!waitingForNextQuestion) {
        newQuestion(todaysQuizHistory.choices.length - questions.length)
    }

    const setTodaysQuizHistory = (historyToday: QuizHistory[string]): void => {
        const newHistory = { ...quizHistory, [props.quizDescriptor.name]: historyToday }
        setWaitingForTime(true)
        newQuestion(1)
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

                if (waiting && index >= questions.length) {
                    return (
                        <div>
                        </div>
                    )
                }

                if (!waiting && props.todaysQuiz.isDone(history.correct_pattern.map(correct => correct ? true : false))) {
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
