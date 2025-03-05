import React, { ReactNode } from 'react'
import '../style.css'
import '../common.css'

import { PageTemplate } from '../page_template/template'

const googleAuthUrl = 'https://accounts.google.com/'
const urbanstatsClientID = {
    development: '866758015458-r7t30bm7b492c1mevid587apej6cjte6.apps.googleusercontent.com',
    production: '',
}

export function LoginPanel(props: { callbackUrl?: string }): ReactNode {
    return (
        <PageTemplate>
            <div>
                <div onClick={() => login(props.callbackUrl)}>Login</div>
            </div>
        </PageTemplate>
    )
}

async function login(callbackUrl: string | undefined): Promise<void> {
    // Initiate a GET request to .well-known/openid-configuration
    // to get the OpenID Connect configuration
    const authUrl = await computeAuthUrl(googleAuthUrl)
    const state = Math.random().toString(36).substring(7)
    const nonce = Math.random().toString(36).substring(7)
    const scope = 'openid email profile'
    const responseType = 'code'
    const prompt = 'consent'
    localStorage.setItem(`login_callback_${state}`, callbackUrl ?? '/')
    const urlParams = new URLSearchParams({
        client_id: urbanstatsClientID.development,
        redirect_uri: `${window.location.origin}/login.html`,
        state,
        nonce,
        scope,
        response_type: responseType,
        prompt,
    })
    const url = `${authUrl}?${urlParams}`
    window.location.href = url
}

async function computeAuthUrl(baseUrl: string): Promise<string> {
    const response = await fetch(
        `${baseUrl}.well-known/openid-configuration`,
    )
    // eslint-disable-next-line no-restricted-syntax -- Not under our control, so we can't set the variable style
    const data = await response.json() as { authorization_endpoint: string }
    const authUrl = data.authorization_endpoint
    return authUrl
}
