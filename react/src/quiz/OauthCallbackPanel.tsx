import React, { ReactNode } from 'react'

import { ErrorBox } from '../ErrorBox'
import { PageData } from '../navigation/PageDescriptor'
import { useColors } from '../page_template/colors'
import { mixWithBackground } from '../utils/color'

import { AuthenticationStateMachine } from './AuthenticationStateMachine'

export function OauthCallbackPanel(props: Extract<PageData, { kind: 'oauthCallback' }>): ReactNode {
    const colors = useColors()
    const backgroundColor = mixWithBackground(props.result.success ? colors.hueColors.green : colors.hueColors.red, 0.5, colors.background)

    const state = AuthenticationStateMachine.shared.useState()

    return (
        <ErrorBox color={backgroundColor}>
            {props.result.success
                ? (
                        <>
                            <h1>Signed In!</h1>
                            <p>
                                Sign in to your other devices
                                { state.state === 'signedIn'
                                    ? (
                                            <>
                                                {' with '}
                                                <b>{state.email}</b>
                                                {' '}
                                            </>
                                        )
                                    : ' '}
                                to sync your quiz progress.
                            </p>
                        </>
                    )
                : (
                        <>
                            <h1>Sign In Failed</h1>
                            <p>
                                Urban Stats encountered a problem when signing in.
                                <br />
                                <code>{props.result.error}</code>
                            </p>
                        </>
                    )}
            <button style={{ margin: '1em', padding: '0.5em 1em' }} onClick={() => { window.close() }}>
                Close Window
            </button>
        </ErrorBox>
    )
}
