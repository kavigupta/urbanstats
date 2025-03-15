import React, { ReactNode } from 'react'
import '../style.css'
import '../common.css'

import { PageTemplate } from '../page_template/template'

import { log } from 'console'

const authUrls = {
    google: 'https://accounts.google.com/',
}
const urbanstatsClientID = {
    development: '866758015458-r7t30bm7b492c1mevid587apej6cjte6.apps.googleusercontent.com',
    production: '',
}

/*
NOTE! A client secret does not necessarily need to be kept secret in a browser application.
It is used to authenticate the client to the authorization server, and is not used to authenticate the user.

For an example of a client secret in plaintext in a github repository, see:
https://github.com/google/clasp/blob/aa375c5f589b6065828be22f917b8a9934a748db/src/auth/file_credential_store.ts#L108
*/
const urbanstatsClientSecret = {
    development: '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',
    production: '',
}

interface TokenInfo {
    idToken: string
    expiresAtSeconds: number
    refreshToken: string
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

function getRedirectURI(): string {
    return `${window.location.origin}/login.html`
}

async function login(callbackUrl: string | undefined): Promise<void> {
    // Initiate a GET request to .well-known/openid-configuration
    // to get the OpenID Connect configuration
    const [authURL] = await computeAuthUrl(authUrls.google)
    const state = Math.random().toString(36).substring(7)
    const nonce = Math.random().toString(36).substring(7)
    const scope = 'openid email profile'
    const responseType = 'code'
    const prompt = 'consent'
    localStorage.setItem(`login_callback_${state}`, callbackUrl ?? '/')
    const urlParams = new URLSearchParams({
        client_id: urbanstatsClientID.development,
        redirect_uri: getRedirectURI(),
        state,
        nonce,
        scope,
        response_type: responseType,
        prompt,
        access_type: 'offline',
    })
    const url = `${authURL}?${urlParams}`
    window.location.href = url
}

async function computeAuthUrl(baseUrl: string): Promise<[string, string]> {
    const response = await fetch(
        `${baseUrl}.well-known/openid-configuration`,
    )
    // eslint-disable-next-line no-restricted-syntax -- Not under our control, so we can't set the variable style
    const data = await response.json() as { authorization_endpoint: string, token_endpoint: string }
    return [data.authorization_endpoint, data.token_endpoint]
}

export async function handleLoginCallback(code: string, state: string): Promise<void> {
    const key = `login_callback_${state}`
    if (localStorage.getItem(key) === null) {
        throw new Error('Invalid state')
    }
    const callbackUrl = localStorage.getItem(key)
    localStorage.removeItem(key)

    await attemptFetchToken({
        code,
        grant_type: 'authorization_code',

    }, () => {
        throw new Error('Failed to fetch token from code')
    })

    window.location.href = callbackUrl
}

async function attemptFetchToken(params: Record<string, string>, errorCallback: () => Promise<void>): Promise<void> {
    console.log('attempnig to fetch token', params)
    const [, tokenEndpoint] = await computeAuthUrl(authUrls.google)
    const result = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            ...params,
            client_id: urbanstatsClientID.development,
            client_secret: urbanstatsClientSecret.development,
            redirect_uri: getRedirectURI(),
        }),
    })
    if (!result.ok) {
        console.error('Failed to fetch token', result)
        await errorCallback()
        return
    }
    // eslint-disable-next-line no-restricted-syntax -- Not under our control, so we can't set the variable style
    const data = await result.json() as { id_token: string, expires_in: number, refresh_token: string }
    const tokenInfo = {
        idToken: data.id_token,
        expiresAtSeconds: parseJWTPayload(data.id_token).exp,
        refreshToken: data.refresh_token,
    } satisfies TokenInfo
    console.log('RECVd tokenInfo', tokenInfo)
    localStorage.setItem('tokenInfo', JSON.stringify(tokenInfo))
}

function parseJWTPayload(jwt: string): { exp: number, email: string } {
    const payload = jwt.split('.')[1]
    const decodedPayload = atob(payload)
    const payloadObj = JSON.parse(decodedPayload) as { exp: number, email: string }

    return payloadObj
}

function giveOptionToLogIn(callbackUrl: string): Promise<void> {
    // TODO TODO TODO give the option to log out
    return login(callbackUrl)
}

export async function getTokenInfo(requiredMinutesOfTokenValidity: number): Promise<TokenInfo | null> {
    // ensures that the token is still valid
    const tokenInfoJSON = localStorage.getItem('tokenInfo')
    if (tokenInfoJSON === null) {
        return null
    }
    const tokenInfo = JSON.parse(tokenInfoJSON) as TokenInfo
    if (new Date().getTime() / 1000 < tokenInfo.expiresAtSeconds - 60 * requiredMinutesOfTokenValidity) {
        return tokenInfo
    }
    await attemptFetchToken(
        { refresh_token: tokenInfo.refreshToken, grant_type: 'refresh_token' },
        async () => { await giveOptionToLogIn(window.location.href) },
    )
    return getTokenInfo(requiredMinutesOfTokenValidity)
}
