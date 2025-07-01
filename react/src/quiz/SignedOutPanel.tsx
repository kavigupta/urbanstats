import React, { ReactNode } from 'react'

import { useColors } from '../page_template/colors'

import { AuthenticationStateMachine } from './AuthenticationStateMachine'
import { QuizAuthAlertTemplate } from './QuizAuthAlertTemplate'

export function SignedOutPanel(): ReactNode {
    const colors = useColors()

    const startSignIn = AuthenticationStateMachine.shared.useStartSignIn()
    const authState = AuthenticationStateMachine.shared.useState()

    return (
        <QuizAuthAlertTemplate color={colors.slightlyDifferentBackgroundFocused}>
            <h1>You were signed out</h1>
            <p>
                Sign back in to
                {' '}
                <b>{authState.email}</b>
                {' '}
                ensure your quiz progress continues syncing.
            </p>
            <button style={{ margin: '1em', padding: '0.5em 1em' }} onClick={() => { startSignIn?.() }}>
                Sign In
            </button>
            <button style={{ margin: '1em', padding: '0.5em 1em' }} onClick={() => { void AuthenticationStateMachine.shared.userSignOut() }}>
                Sign Out
            </button>
        </QuizAuthAlertTemplate>
    )
}
