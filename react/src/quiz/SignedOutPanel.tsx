import React, { ReactNode } from 'react'

import { ErrorBox } from '../ErrorBox'

import { AuthenticationStateMachine } from './AuthenticationStateMachine'

export function SignedOutPanel(): ReactNode {
    const startSignIn = AuthenticationStateMachine.shared.useStartSignIn()
    const authState = AuthenticationStateMachine.shared.useState()

    return (
        <ErrorBox>
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
        </ErrorBox>
    )
}
