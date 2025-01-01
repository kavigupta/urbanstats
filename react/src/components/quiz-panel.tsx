import React, { ReactNode, useState } from 'react'

import { PageTemplate } from '../page_template/template'
import '../common.css'
import './quiz.css'
import { QuizDescriptor, QuizHistory, QuizLocalStorage, QuizQuestion, aCorrect } from '../quiz/quiz'
import { QuizQuestionDispatch } from '../quiz/quiz-question'
import { QuizResult } from '../quiz/quiz-result'

// represents a quiz, which is a collection of questions. Designed so quizzes can be infinite
export interface QuizQuestionsModel {
    questionByIndex: (index: number) => QuizQuestion
    // undefined if the quiz is infinite
    length: number | undefined
    isDone: (choices: boolean[]) => boolean
}

export function wrapQuestionsModel(questions: QuizQuestion[]): QuizQuestionsModel {
    return {
        questionByIndex: (index: number) => questions[index],
        length: questions.length,
        isDone: (choices: boolean[]) => choices.length === questions.length,
    }
}

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

    const [waiting, setWaiting] = useState(false)

    const todaysQuizHistory = quizHistory[props.quizDescriptor.name] ?? { choices: [], correct_pattern: [] }

    const setTodaysQuizHistory = (historyToday: QuizHistory[string]): void => {
        const newHistory = { ...quizHistory, [props.quizDescriptor.name]: historyToday }
        setWaiting(true)
        setQuizHistory(newHistory)
    }

    const onSelect = (selected: 'A' | 'B'): void => {
        if (waiting) {
            return
        }
        const history = todaysQuizHistory
        const idx = history.correct_pattern.length
        const question = props.todaysQuiz.questionByIndex(idx)
        history.choices.push(selected)
        history.correct_pattern.push((selected === 'A') === aCorrect(question))
        setTodaysQuizHistory(history)
        setTimeout(() => { setWaiting(false) }, 500)
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

                if (index === quiz.length) {
                    return (
                        <QuizResult
                            // can only show results if the quiz is done
                            quiz={Array.from({ length: history.choices.length }, (_, i) => quiz.questionByIndex(i))}
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
                        question={quiz.questionByIndex(index)}
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
