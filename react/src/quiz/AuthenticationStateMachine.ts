import { generateCodeVerifier, OAuth2Client } from '@badgateway/oauth2-client'
import { z } from 'zod'

import { PageDescriptor, urlFromPageDescriptor } from '../navigation/PageDescriptor'

const stateSchema = z.discriminatedUnion('state', [
    z.object({ state: z.literal('signedOut'), previouslySignedIn: z.boolean() }),
    z.object({
        state: z.literal('signedIn'), token: z.object({
            accessToken: z.string(),
            refreshToken: z.string(),
            expiresAt: z.number(),
        }),
    }),
])

type State = z.TypeOf<typeof stateSchema>

const localStorageKey = 'quizAuthenticationState'

const authCodeStateKey = 'authCodeState'

const googleClient = new OAuth2Client({
    server: 'https://accounts.google.com',
    clientId: '866758015458-r7t30bm7b492c1mevid587apej6cjte6.apps.googleusercontent.com',
    discoveryEndpoint: '/.well-known/openid-configuration',
})

const codeVerifier = await generateCodeVerifier()

const redirectUri = urlFromPageDescriptor({ kind: 'oauthCallback', params: {} }).toString()

class AuthenticationStateMachine {
    // TODO.. use storage events to keep state in sync
    private _state: State

    private setState(newState: State): void {
        this._state = newState
        localStorage.setItem(localStorageKey, JSON.stringify(newState))
    }

    constructor() {
        this._state = { state: 'signedOut', previouslySignedIn: false }
        const item = localStorage.getItem(localStorageKey)
        if (item !== null) {
            const parseResult = stateSchema.safeParse(JSON.parse(item))
            if (parseResult.success) {
                this._state = parseResult.data
            }
            else {
                console.error(`Failed to parse ${localStorageKey}, using default state`, parseResult.error)
            }
        }
    }

    // Returns a URL for the user to visit
    async startSignIn(): Promise<string> {
        const authCodeState = crypto.randomUUID()
        localStorage.setItem(authCodeStateKey, authCodeState)
        return await googleClient.authorizationCode.getAuthorizeUri({
            redirectUri,
            state: authCodeState,
            codeVerifier,
            scope: ['openid', 'email', 'profile'],
        })
    }

    async completeSignIn(descriptor: Extract<PageDescriptor, { kind: 'oauthCallback' }>): Promise<void> {
        const url = urlFromPageDescriptor(descriptor)
        const state = localStorage.getItem(authCodeStateKey)
        if (state === null) {
            throw new Error('No sign in atttempt was started')
        }
        const token = await googleClient.authorizationCode.getTokenFromCodeRedirect(url, {
            redirectUri,
            state,
            codeVerifier,
        })

        if (token.refreshToken === null) {
            throw new Error('No refresh token provided')
        }

        if (token.expiresAt === null) {
            throw new Error('Token has no expiration date')
        }

        // TODO: Associate with persistent server (failable)

        this.setState({ state: 'signedIn', token: { refreshToken: token.refreshToken, accessToken: token.accessToken, expiresAt: token.expiresAt } })
    }
}

export const sharedAuthenticationStateMachine = new AuthenticationStateMachine()
