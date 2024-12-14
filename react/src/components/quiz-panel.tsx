import React, { ReactNode, useEffect, useState } from 'react'

import { PageTemplate } from '../page_template/template'
import '../common.css'
import './quiz.css'
import { QuizDescriptor, QuizHistory, QuizQuestion, aCorrect, loadQuizHistory } from '../quiz/quiz'
import { QuizQuestionDispatch } from '../quiz/quiz-question'
import { QuizResult } from '../quiz/quiz-result'

export function QuizPanel(props: { quizDescriptor: QuizDescriptor, todayName: string, todaysQuiz: QuizQuestion[] }): ReactNode {
    const [quizHistory, setQuizHistory] = useState(loadQuizHistory())
    const [waiting, setWaiting] = useState(false)

    const todaysQuizHistory = quizHistory[props.quizDescriptor.name] ?? { choices: [], correct_pattern: [] }

    const setTodaysQuizHistory = (history_today: QuizHistory[string]): void => {
        const newHistory = { ...quizHistory, [props.quizDescriptor.name]: history_today }
        setQuizHistory(newHistory)
        setWaiting(true)
        switch (props.quizDescriptor.kind) {
            case 'juxtastat':
            case 'retrostat':
                localStorage.setItem('quiz_history', JSON.stringify(newHistory))
                break
            default:
        }
    }

    const onSelect = (selected: 'A' | 'B'): void => {
        if (waiting) {
            return
        }
        const history = todaysQuizHistory
        const idx = history.correct_pattern.length
        const question = (props.todaysQuiz)[idx]
        history.choices.push(selected)
        history.correct_pattern.push((selected === 'A') === aCorrect(question))
        setTodaysQuizHistory(history)
        setTimeout(() => { setWaiting(false) }, 500)
    }

    useEffect(() => {
        switch (props.quizDescriptor.kind) {
            case 'juxtastat':
                document.title = 'Juxtastat'
                break
            case 'retrostat':
                document.title = 'Retrostat'
                break
        }
    })

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
                            quiz={quiz}
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
                        question={quiz[index]}
                        history={history}
                        length={quiz.length}
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
