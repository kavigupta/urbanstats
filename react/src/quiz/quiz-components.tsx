import React, { ReactNode } from 'react'

import '../common.css'
import '../components/quiz.css'
import { headerTextClass } from '../utils/responsive'

import { nameOfQuizKind } from './quiz'
import { History } from './statistics'

export function Header({ quiz }: { quiz: { kind: 'juxtastat' | 'retrostat', name: string | number } }): ReactNode {
    let text = nameOfQuizKind(quiz.kind)
    if (typeof quiz.name !== 'number') {
        text += ` ${quiz.name}`
    }
    return (<div className={headerTextClass()}>{text}</div>)
}

export function Footer(props: { length: number, history: History[string] }): ReactNode {
    const choices: `quiz_${'green' | 'red' | 'blank'}`[] = props.history.correct_pattern.map(
        correct => correct ? 'quiz_green' : 'quiz_red',
    )
    while (choices.length < props.length) {
        choices.push('quiz_blank')
    }
    return (
        <table className="quiz_footer">
            <tbody>
                <tr>
                    {choices.map((x, i) =>
                        <td key={i} className={x}></td>,
                    )}
                </tr>
            </tbody>
        </table>
    )
}

export function Help(props: { quiz_kind: 'juxtastat' | 'retrostat' }): ReactNode {
    const text = (): string => {
        if (props.quiz_kind === 'juxtastat') {
            return 'Select the geographical region answering the question. The questions get harder as you go on.'
        }
        else {
            return 'Select the easier question. A question is considered easier if more people got it right.'
        }
    }

    return (
        <div className="centered_text serif">
            {text()}
            {' '}
            {UserId()}
        </div>
    )
}

export function UserId(): ReactNode {
    const user_id = localStorage.getItem('persistent_id')
    if (user_id === null) {
        return ''
    }
    else {
        return (
            <div>
                Your user id is
                <span className="juxtastat-user-id">{user_id}</span>
            </div>
        )
    }
}
