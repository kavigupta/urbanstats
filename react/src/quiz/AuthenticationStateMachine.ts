import { generateCodeVerifier, OAuth2Client } from '@badgateway/oauth2-client'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { PageDescriptor, urlFromPageDescriptor } from '../navigation/PageDescriptor'

const tokenSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
})

const stateSchema = z.discriminatedUnion('state', [
    z.object({ state: z.literal('signedOut'), previouslySignedIn: z.boolean() }),
    z.object({
        state: z.literal('signedIn'), token: tokenSchema, email: z.string(),
    }),
])

type State = z.TypeOf<typeof stateSchema>

const localStorageKey = 'quizAuthenticationState'

const codeVerifierKey = 'codeVerifier'

const googleClient = new OAuth2Client({
    server: 'https://accounts.google.com',
    clientId: '866758015458-r7t30bm7b492c1mevid587apej6cjte6.apps.googleusercontent.com',
    /*
    NOTE! A client secret does not necessarily need to be kept secret in a browser application.
    It is used to authenticate the client to the authorization server, and is not used to authenticate the user.
    For an example of a client secret in plaintext in a github repository, see:
    https://github.com/google/clasp/blob/aa375c5f589b6065828be22f917b8a9934a748db/src/auth/file_credential_store.ts#L108
    */
    clientSecret: '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',
    discoveryEndpoint: '/.well-known/openid-configuration',
})

const redirectUri = urlFromPageDescriptor({ kind: 'oauthCallback', params: {} }).toString()

function loadState(): State {
    const item = localStorage.getItem(localStorageKey)
    if (item !== null) {
        const parseResult = stateSchema.safeParse(JSON.parse(item))
        if (parseResult.success) {
            return parseResult.data
        }
        else {
            console.error(`Failed to parse ${localStorageKey}, using default state`, parseResult.error)
        }
    }
    return { state: 'signedOut', previouslySignedIn: false }
}

class AuthenticationStateMachine {
    private _state: State

    private setState(newState: State): void {
        this._state = newState
        localStorage.setItem(localStorageKey, JSON.stringify(newState))
        this.stateObservers.forEach((observer) => { observer() })
    }

    private stateObservers = new Set<() => void>()

    /* eslint-disable react-hooks/rules-of-hooks -- Custom hook method */
    useState(): State {
        const [, setCounter] = useState(0)
        useEffect(() => {
            const observer = (): void => {
                setCounter(counter => counter + 1)
            }
            this.stateObservers.add(observer)
            return () => {
                this.stateObservers.delete(observer)
            }
        }, [])
        return this._state
    }
    /* eslint-enable react-hooks/rules-of-hooks */

    constructor() {
        this._state = loadSt    ate()
        const weakThis = new WeakRef(this)
        const listener = (event: StorageEvent): void => {
            const self = weakThis.deref()
            if (self === undefined) {
                removeEventListener('storage', listener)
            }
            else if (event.key === localStorageKey) {
                this._state = loadState()
                this.stateObservers.forEach((observer) => { observer() })
            }
        }
        addEventListener('storage', listener)
    }

    // Returns a URL for the user to visit
    async startSignIn(): Promise<string> {
        const codeVerifier = await generateCodeVerifier()
        localStorage.setItem(codeVerifierKey, codeVerifier)
        return await googleClient.authorizationCode.getAuthorizeUri({
            redirectUri,
            codeVerifier,
            scope: ['openid', 'email', 'profile'],
            extraParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        })
    }

    async completeSignIn(descriptor: Extract<PageDescriptor, { kind: 'oauthCallback' }>): Promise<void> {
        if (this._state.state !== 'signedOut') {
            throw new Error('Already signed in')
        }
        const url = urlFromPageDescriptor(descriptor)
        const codeVerifier = localStorage.getItem(codeVerifierKey)
        if (codeVerifier === null) {
            throw new Error('No code verifier was stored')
        }

        const rawToken = await googleClient.authorizationCode.getTokenFromCodeRedirect(url, {
            redirectUri,
            codeVerifier,
        })

        const token = tokenSchema.parse(rawToken)

        const info = await googleClient.introspect(token)

        console.log('Token info', info)

        if (info.username === undefined) {
            throw new Error('token does not have username')
        }

        // TODO: Associate with persistent server (failable)

        this.setState({
            state: 'signedIn',
            token: { refreshToken: token.refreshToken, accessToken: token.accessToken, expiresAt: token.expiresAt },
            email: info.username,
        })
        localStorage.removeItem(codeVerifierKey)
    }

    authenticationError(): void {
        this.setState({ state: 'signedOut', previouslySignedIn: true })
    }

    userSignOut(): void {
        this.setState({ state: 'signedOut', previouslySignedIn: false })
    }

    async getAccessToken(): Promise<string | undefined> {
        if (this._state.state === 'signedOut') {
            return undefined
        }

        if (Date.now() + 10_000 < this._state.token.expiresAt) {
            return this._state.token.accessToken
        }

        try {
            const newToken = tokenSchema.parse(await googleClient.refreshToken(this._state.token))
            this.setState({ state: 'signedIn', token: newToken, email: this._state.email })
            return newToken.accessToken
        }
        catch (error) {
            console.error('Error while refreshing access token', error)
            this.authenticationError()
            return undefined
        }
    }
}

export const sharedAuthenticationStateMachine = new AuthenticationStateMachine()
