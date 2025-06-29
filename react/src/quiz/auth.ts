import { generateCodeVerifier, OAuth2Client } from '@badgateway/oauth2-client'
import { z } from 'zod'

import { PageDescriptor, urlFromPageDescriptor } from '../navigation/PageDescriptor'

import { QuizPersistent } from './quiz'

const tokenSchema = z.object({
    accessToken: z.string(),
})

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

// Returns a URL for the user to visit
export async function startSignIn(): Promise<string> {
    const codeVerifier = await generateCodeVerifier()
    localStorage.setItem(codeVerifierKey, codeVerifier)
    return await googleClient.authorizationCode.getAuthorizeUri({
        redirectUri,
        codeVerifier,
        scope: ['email'],
        extraParams: {
            access_type: 'offline',
            prompt: 'consent',
        },
    })
}

export async function completeSignIn(descriptor: Extract<PageDescriptor, { kind: 'oauthCallback' }>): Promise<void> {
    const url = urlFromPageDescriptor(descriptor)
    const codeVerifier = localStorage.getItem(codeVerifierKey)
    if (codeVerifier === null) {
        throw new Error('No code verifier was stored')
    }
    localStorage.removeItem(codeVerifierKey)

    const rawToken = await googleClient.authorizationCode.getTokenFromCodeRedirect(url, {
        redirectUri,
        codeVerifier,
    })

    const token = tokenSchema.parse(rawToken)

    await QuizPersistent.shared.associateEmail(token.accessToken)
}
