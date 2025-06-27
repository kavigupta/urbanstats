import React, { CSSProperties, ReactNode } from 'react'

import { PageData } from '../navigation/PageDescriptor'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { mixWithBackground } from '../utils/color'

export function OauthCallbackPanel(props: Extract<PageData, { kind: 'oauthCallback' }>): ReactNode {
    const colors = useColors()
    const errorBoxStyle: CSSProperties = {
        backgroundColor: mixWithBackground(props.result.success ? colors.hueColors.green : colors.hueColors.red, 0.5, colors.background),
        borderRadius: '5px',
        textAlign: 'center',
        padding: '10px',
    }

    return (
        <PageTemplate showFooter={false}>
            <div style={errorBoxStyle}>
                {props.result.success
                    ? (
                            <>
                                <h1>Signed In!</h1>
                                <p>
                                    Sign in to your other devices with
                                    {' '}
                                    <b>{props.result.email}</b>
                                    {' '}
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
            </div>
            <div style={{ textAlign: 'center', margin: '1em' }}>
                <button onClick={() => { window.close() }}>
                    Close Window
                </button>
            </div>
        </PageTemplate>
    )
}
