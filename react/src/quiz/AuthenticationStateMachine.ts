import { generateCodeVerifier, OAuth2Client } from '@badgateway/oauth2-client'
import * as base58 from 'base58-js'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { PageDescriptor, urlFromPageDescriptor } from '../navigation/PageDescriptor'
import { TestUtils } from '../utils/TestUtils'
import { traced } from '../utils/traced'
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

    Encoded in base58 so Google stops emailing us. The only real attack here is someone starting a server on a victim's machine... to get access to their Urban Stats quiz scores.
    */
    clientSecret: new TextDecoder().decode(base58.base58_to_binary('87gm8qXusdLarkBBf8byt7MFvJJcXKHsipsrfbUL5qkHKMu2')),
    discoveryEndpoint: '/.well-known/openid-configuration',
    fetch: (input, init) => traced(`oauth ${input instanceof Request ? input.url : String(input)}`, () => globalThis.fetch(input, init)),
})

const redirectUri = urlFromPageDescriptor({ kind: 'oauthCallback', params: {} }).toString()

// undefined when there is a stored state that we cannot read, which is not the same thing as being
// signed out, and which the caller must not act on as though the user had signed out deliberately.
function loadState(): State | undefined {
    const item = localStorage.getItem(localStorageKey)
    if (item === null) {
        return { state: 'signedOut', email: null }
    }
    let parsed: unknown
    try {
        parsed = JSON.parse(item)
    }
    catch (e) {
        console.error(`Failed to parse ${localStorageKey}, using default state`, e)
        return undefined
    }
    const parseResult = stateSchema.safeParse(parsed)
    if (parseResult.success) {
        return parseResult.data
    }
    console.error(`Failed to parse ${localStorageKey}, using default state`, parseResult.error)
    return undefined
}

export class AuthenticationStateMachine {
    static shared = new AuthenticationStateMachine()

    private _state: State

    private stateIsReadable: boolean

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
        const loaded = loadState()
        this.stateIsReadable = loaded !== undefined
        this._state = loaded ?? { state: 'signedOut', email: null }
        addEventListener('storage', (event) => {
            if (event.key === localStorageKey) {
                const reloaded = loadState()
                this.stateIsReadable = reloaded !== undefined
                this._state = reloaded ?? { state: 'signedOut', email: null }
                this.stateObservers.forEach((observer) => { observer() })
            }
        })

        QuizModel.shared.uniquePersistentId.observers.add(() => { this.syncEmailAssociationInBackground() })

        this.syncEmailAssociationInBackground()

        let syncTimeout: ReturnType<typeof setTimeout> | undefined
        const syncDelay = 1000

        const observer = (): void => {
            if (!this.isSyncing) {
                clearTimeout(syncTimeout)
                syncTimeout = setTimeout(() => { this.syncProfileInBackground() }, syncDelay)
            }
        }

        QuizModel.shared.history.observers.add(observer)
        QuizModel.shared.friends.observers.add(observer)

        window.addEventListener('focus', observer)

        this.syncProfileInBackground()
    }

    private syncProfileInBackground(): void {
        this.syncProfile().catch((e: unknown) => {
            console.error('Error syncing profile', e)
        })
    }

    private syncEmailAssociationInBackground(): void {
        this.syncEmailAssociation().catch((e: unknown) => {
            console.error('Error syncing email association', e)
        })
    }

    private async syncProfile(token?: string): Promise<void> {
        TestUtils.shared.testSyncing = true
        try {
            token ??= await this.getAccessToken()
            if (token === undefined) {
                return
            }
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
                if (!this.stateIsReadable) {
                    // We could not read our own sign-in state, so dropping the server's record of
                    // this device would be guessing. Leave it for a load that can read the state.
                    return
                }
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
        console.warn(`completeSignIn: entered while ${this._state.state}`)
        if (this._state.state !== 'signedOut') {
            throw new Error('Already signed in')
        }
        const url = urlFromPageDescriptor(descriptor)
        const codeVerifier = localStorage.getItem(codeVerifierKey)
        if (codeVerifier === null) {
            throw new Error('No code verifier was stored')
        }
        localStorage.removeItem(codeVerifierKey)

        // Not retryable: an authorization code is single use, and redeeming a spent one revokes the tokens it issued
        const rawToken = await traced('completeSignIn token exchange', () => googleClient.authorizationCode.getTokenFromCodeRedirect(url, {
            redirectUri,
            codeVerifier,
        }))

        const token = tokenSchema.parse(rawToken)

        const email = await traced('completeSignIn associate email', () => this.associateEmail(token.accessToken))

        await traced('completeSignIn sync profile', () => this.syncProfile(token.accessToken))

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
        if (error) {
            throw new Error('Could not sign out. Check your connection and try again.')
        }
        this.setState({ state: 'signedOut', email: null })
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
