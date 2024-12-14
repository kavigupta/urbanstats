import React, { ReactNode } from 'react'

import '../common.css'
import '../components/quiz.css'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { useHeaderTextClass } from '../utils/responsive'

import { exportQuizPersona, importQuizPersona, nameOfQuizKind, QuizHistory } from './quiz'
import { uniquePersistentId } from './statistics'

export function Header({ quiz }: { quiz: { kind: 'juxtastat' | 'retrostat', name: string | number } }): ReactNode {
    let text = nameOfQuizKind(quiz.kind)
    if (typeof quiz.name !== 'number') {
        text += ` ${quiz.name}`
    }
    return (<div className={useHeaderTextClass()}>{text}</div>)
}

export function Footer(props: { length: number, history: QuizHistory[string] }): ReactNode {
    const colors = useColors()
    const juxtaColors = useJuxtastatColors()
    const footerColors: string[] = props.history.correct_pattern.map(
        correct => correct ? juxtaColors.correct : juxtaColors.incorrect,
    )
    while (footerColors.length < props.length) {
        footerColors.push(colors.unselectedButton)
    }
    return (
        <table className="quiz_footer">
            <tbody>
                <tr>
                    {footerColors.map((x, i) =>
                        <td key={i} style={{ backgroundColor: x }}></td>,
                    )}
                </tr>
            </tbody>
        </table>
    )
}

export function Help(props: { quizKind: 'juxtastat' | 'retrostat' }): ReactNode {
    const text = (): string => {
        if (props.quizKind === 'juxtastat') {
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
            {ExportImport()}
        </div>
    )
}

export function UserId(): ReactNode {
    return (
        <div>
            {'Your user id is '}
            <span className="juxtastat-user-id">{uniquePersistentId()}</span>
        </div>
    )
}

export function ExportImport(): ReactNode {
    return (
        <div style={{ marginTop: '5px' }}>
            <button onClick={() => { exportQuizPersona() }}>
                Export Quiz History
            </button>
            {' '}
            <button onClick={() => { void importQuizPersona() }}>
                Import Quiz History
            </button>
        </div>
    )
}
