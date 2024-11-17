import React, { ReactNode, useState } from 'react'

import { PageTemplate } from '../page_template/template'
import '../common.css'
import './quiz.css'
import { QuizDescriptor, QuizHistory, QuizQuestion, a_correct } from '../quiz/quiz'
import { QuizQuestionDispatch } from '../quiz/quiz-question'
import { QuizResult } from '../quiz/quiz-result'

export function loadQuizHistory(): QuizHistory {
    const history = JSON.parse(localStorage.getItem('quiz_history') ?? '{}') as QuizHistory

    // set 42's correct_pattern's 0th element to true
    if ('42' in history) {
        if ('correct_pattern' in history['42']) {
            if (history['42'].correct_pattern.length > 0) {
                history['42'].correct_pattern[0] = true
            }
        }
    }
    return history
}

export function QuizPanel(props: { quizDescriptor: QuizDescriptor, today_name: string, todays_quiz: QuizQuestion[], parameters: string }): ReactNode {
    const [quiz_history, set_quiz_history] = useState(loadQuizHistory())
    const [waiting, setWaiting] = useState(false)

    const todays_quiz_history = quiz_history[props.quizDescriptor.name] ?? { choices: [], correct_pattern: [] }

    const set_todays_quiz_history = (history_today: QuizHistory[string]): void => {
        const newHistory = { ...quiz_history, [props.quizDescriptor.name]: history_today }
        set_quiz_history(newHistory)
        setWaiting(true)
        switch (props.quizDescriptor.kind) {
            case 'juxtastat':
            case 'retrostat':
                localStorage.setItem('quiz_history', JSON.stringify(newHistory))
                break
            default:
        }
    }

    const on_select = (selected: 'A' | 'B'): void => {
        if (waiting) {
            return
        }
        const history = todays_quiz_history
        const idx = history.correct_pattern.length
        const question = (props.todays_quiz)[idx]
        history.choices.push(selected)
        history.correct_pattern.push((selected === 'A') === a_correct(question))
        set_todays_quiz_history(history)
        setTimeout(() => { setWaiting(false) }, 500)
    }

    return (
        <PageTemplate>
            {(() => {
                const quiz = props.todays_quiz
                const history = todays_quiz_history

                let index = history.choices.length
                if (waiting) {
                    index -= 1
                }

                if (index === quiz.length) {
                    return (
                        <QuizResult
                            quiz={quiz}
                            whole_history={quiz_history}
                            history={history}
                            today_name={props.today_name}
                            parameters={props.parameters}
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
                        on_select={on_select}
                        waiting={waiting}
                        nested={false}
                        no_header={false}
                        no_footer={false}
                    />
                )
            })()}
        </PageTemplate>
    )
}
