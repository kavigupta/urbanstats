import React, { ReactNode } from 'react'

import '../common.css'
import '../components/quiz.css'
import { useColors, useJuxtastatColors } from '../page_template/colors'
import { useHeaderTextClass } from '../utils/responsive'

import { AuthenticationStateMachine } from './AuthenticationStateMachine'
import { juxtaInfiniteCorrectForBonus } from './infinite'
import { nameOfQuizKind, QuizHistory, QuizKind, QuizPersistent } from './quiz'

export function Header({ quiz }: { quiz: { kind: QuizKind, name: string | number } }): ReactNode {
    let text = nameOfQuizKind(quiz.kind)
    if (typeof quiz.name !== 'number' && quiz.kind !== 'infinite') {
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

export function Help(props: { quizKind: QuizKind }): ReactNode {
    const text = (): string => {
        switch (props.quizKind) {
            case 'juxtastat':
                return 'Select the geographical region answering the question. The questions get harder as you go on.'
            case 'retrostat':
                return 'Select the easier question. A question is considered easier if more people got it right.'
            case 'custom':
                return 'Select the geographical region answering the question.'
            case 'infinite':
                return `Select the geographical region answering the question. You lose when you run out of lives.`
                    + ` You gain lives by getting ${juxtaInfiniteCorrectForBonus} questions right in a row.`
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
    const user = QuizPersistent.shared.uniquePersistentId.use()
    return (
        <div>
            {'Your user id is '}
            <span className="juxtastat-user-id">{user}</span>
            <QuizAuthStatus />
        </div>
    )
}

function QuizAuthStatus(): ReactNode {
    const state = AuthenticationStateMachine.shared.useState()

    const startSignIn = AuthenticationStateMachine.shared.useStartSignIn()

    if (state.state === 'signedOut') {
        const signIn = (e: React.MouseEvent): void => {
            e.preventDefault()
            startSignIn?.()
        }
        return (
            <>
                {' '}
                <a href="" onClick={signIn}>Sign In with Google</a>
                {' to sync your quiz history across devices.'}
            </>
        )
    }
    else {
        const signOut = (e: React.MouseEvent): void => {
            e.preventDefault()
            void AuthenticationStateMachine.shared.userSignOut()
        }

        return (
            <>
                {` Signed in with ${state.email}. `}
                <a href="" onClick={signOut}>Sign Out</a>
            </>
        )
    }
}

export function ExportImport(): ReactNode {
    return (
        <div style={{ marginTop: '5px' }}>
            <button onClick={() => { QuizPersistent.shared.exportQuizPersona() }}>
                Export Quiz History
            </button>
            {' '}
            <button onClick={() => { void QuizPersistent.shared.importQuizPersona() }}>
                Import Quiz History
            </button>
        </div>
    )
}
