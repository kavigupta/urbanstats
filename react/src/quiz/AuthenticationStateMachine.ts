import { generateCodeVerifier, OAuth2Client } from '@badgateway/oauth2-client'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { PageDescriptor, urlFromPageDescriptor } from '../navigation/PageDescriptor'
import { TestUtils } from '../utils/TestUtils'
import { retry } from '../utils/retry'
import { persistentClient } from '../utils/urbanstats-persistent-client'
import { useObserverSets } from '../utils/useObserverSets'

import { QuizModel } from './quiz'
import { AuthenticationError, syncWithGoogleDrive } from './sync'

const tokenSchema = z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
})

const stateSchema = z.discriminatedUnion('state', [
    z.object({ state: z.literal('signedOut'), email: z.nullable(z.string()) }),
    z.object({
        state: z.literal('signedIn'), token: tokenSchema, email: z.string(), persistentId: z.string(),
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
    return { state: 'signedOut', email: null }
}

export class AuthenticationStateMachine {
    static shared = new AuthenticationStateMachine()

    private _state: State

    get state(): State {
        return this._state
    }

    private setState(newState: State): void {
        this._state = newState
        localStorage.setItem(localStorageKey, JSON.stringify(newState))
        this.stateObservers.forEach((observer) => { observer() })
    }

    private stateObservers = new Set<() => void>()

    /* eslint-disable react-hooks/rules-of-hooks -- Custom hook method */
    useState(): State {
        useObserverSets([this.stateObservers])
        return this._state
    }
    /* eslint-enable react-hooks/rules-of-hooks */

    private isSyncing = false

    private constructor() {
        this._state = loadState()
        addEventListener('storage', (event) => {
            if (event.key === localStorageKey) {
                this._state = loadState()
                this.stateObservers.forEach((observer) => { observer() })
            }
        })

        QuizModel.shared.uniquePersistentId.observers.add(() => this.syncEmailAssociation())

        void this.syncEmailAssociation()

        let syncTimeout: ReturnType<typeof setTimeout> | undefined
        const syncDelay = 1000

        const obeserver = (): void => {
            if (!this.isSyncing) {
                clearTimeout(syncTimeout)
                syncTimeout = setTimeout(() => this.syncProfile(), syncDelay)
            }
        }

        QuizModel.shared.history.observers.add(obeserver)
        QuizModel.shared.friends.observers.add(obeserver)

        window.addEventListener('focus', obeserver)

        void this.syncProfile().catch((e: unknown) => {
            console.error('Error syncing profile', e)
        })
    }

    private async syncProfile(token?: string): Promise<void> {
        TestUtils.shared.testSyncing = true
        if (token === undefined) {
            token = await this.getAccessToken()
        }
        if (token === undefined) {
            return
        }
        try {
            this.isSyncing = true
            await syncWithGoogleDrive(token)
        }
        catch (e) {
            if (e instanceof AuthenticationError) {
                this.authenticationError()
            }
            throw e
        }
        finally {
            this.isSyncing = false
            TestUtils.shared.testSyncing = false
        }
    }

    private async syncEmailAssociation(): Promise<void> {
        if (this._state.state === 'signedIn' && QuizModel.shared.uniquePersistentId.value !== this._state.persistentId) {
            await this.userSignOut()
            return
        }

        const { data } = await persistentClient.GET('/juxtastat/email', { params: { header: QuizModel.shared.userHeaders() } })
        if (data) {
            if (data.email !== null && this._state.state === 'signedOut') {
                await this.userSignOut() // dissociates email
                return
            }
            const accessToken = await this.getAccessToken()
            if (data.email === null && accessToken !== undefined) {
                await this.associateEmail(accessToken)
            }
        }
    }

    // Returns a URL for the user to visit
    async startSignIn(): Promise<{ start: () => void }> {
        const codeVerifier = await generateCodeVerifier()
        const signInUrl = await googleClient.authorizationCode.getAuthorizeUri({
            redirectUri,
            codeVerifier,
            scope: ['email', 'https://www.googleapis.com/auth/drive.appdata'],
            extraParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        })
        return { start: () => {
            window.open(signInUrl, '_blank', 'popup,width=500,height=600')
            localStorage.setItem(codeVerifierKey, codeVerifier)
        } }
    }

    // Need this fancy hook because you'll trigger the pop up blocker if open the window after `await`ing
    /* eslint-disable react-hooks/rules-of-hooks -- Custom hook method */
    useStartSignIn(): undefined | (() => void) {
        const [startSignIn, setStartSignIn] = useState<Awaited<ReturnType<typeof this.startSignIn>> | undefined>(undefined)

        useEffect(() => {
            void this.startSignIn().then(setStartSignIn)
        }, [])

        return startSignIn?.start
    }
    /* eslint-enable react-hooks/rules-of-hooks */

    async completeSignIn(descriptor: Extract<PageDescriptor, { kind: 'oauthCallback' }>): Promise<void> {
        if (this._state.state !== 'signedOut') {
            throw new Error('Already signed in')
        }
        const url = urlFromPageDescriptor(descriptor)
        const codeVerifier = localStorage.getItem(codeVerifierKey)
        if (codeVerifier === null) {
            throw new Error('No code verifier was stored')
        }
        localStorage.removeItem(codeVerifierKey)

        const rawToken = await retry(2, () => googleClient.authorizationCode.getTokenFromCodeRedirect(url, {
            redirectUri,
            codeVerifier,
        }))

        const token = tokenSchema.parse(rawToken)

        const email = await this.associateEmail(token.accessToken)

        await this.syncProfile(token.accessToken)

        this.setState({
            state: 'signedIn',
            token: { refreshToken: token.refreshToken, accessToken: token.accessToken, expiresAt: token.expiresAt },
            email,
            persistentId: QuizModel.shared.uniquePersistentId.value,
        })
    }

    private async associateEmail(accessToken: string): Promise<string> {
        const { response, data } = await persistentClient.POST('/juxtastat/associate_email', {
            params: {
                header: {
                    ...QuizModel.shared.userHeaders(),
                },
            },
            body: { token: accessToken },
        })
        if (data) {
            return data.email
        }
        switch (response.status) {
            case 409:
                throw new Error('This device is already associated with a different email.')
            default:
                throw new Error(`Unknown error from server: ${response.status}`)
        }
    }

    authenticationError(): void {
        this.setState({ state: 'signedOut', email: this._state.email })
    }

    async userSignOut(): Promise<void> {
        const { error } = await persistentClient.POST('/juxtastat/dissociate_email', {
            params: { header: QuizModel.shared.userHeaders() },
        })
        if (!error) {
            this.setState({ state: 'signedOut', email: null })
        }
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
            this.setState({ ...this._state, token: newToken })
            return newToken.accessToken
        }
        catch (error) {
            console.error('Error while refreshing access token', error)
            this.authenticationError()
            return undefined
        }
    }
}
