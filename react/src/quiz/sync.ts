import stableStringify from 'json-stable-stringify'
import { z } from 'zod'

import { TestUtils } from '../utils/TestUtils'
import { gdriveClient } from '../utils/google-drive-client'
import { traced } from '../utils/traced'

import { mergeFriends, mergeHistories } from './merge'
import { quizFriends, quizHistorySchema, QuizModel } from './quiz'

export class AuthenticationError extends Error {}

export async function syncWithGoogleDrive(token: string): Promise<void> {
    const { fileId, profile: remoteProfile } = await getProfileFile(token)
    const localProfile = getLocalProfile()
    if (stableStringify(remoteProfile) === stableStringify(localProfile)) {
        // Profiles same
        console.warn('sync: profiles already match')
        return
    }
    const mergedProfile = mergeProfiles(localProfile, remoteProfile)
    QuizModel.shared.history.value = mergedProfile.quiz_history
    QuizModel.shared.friends.value = mergedProfile.friends
    await uploadProfile(token, mergedProfile, fileId)
}

const syncProfileSchema = z.object({
    quiz_history: quizHistorySchema,
    friends: quizFriends,
})

type Profile = z.infer<typeof syncProfileSchema>

function getLocalProfile(): Profile {
    return {
        quiz_history: QuizModel.shared.history.value,
        friends: QuizModel.shared.friends.value,
    }
}

function mergeProfiles(a: Profile, b: Profile): Profile {
    return {
        quiz_history: mergeHistories(a.quiz_history, b.quiz_history),
        friends: mergeFriends(a.friends, b.friends),
    }
}

function getFileName(): string {
    // eslint-disable-next-line no-restricted-syntax -- Storing remote file
    return `${window.location.host}${TestUtils.shared.testIterationId !== undefined ? `.${TestUtils.shared.testIterationId}` : ''}.profile.json`
}

async function getProfileFile(token: string): Promise<{ fileId: string, profile: Profile }> {
    const { data, response } = await gdriveClient(token).GET('/files', { params: {
        query: { spaces: 'appDataFolder', fields: 'files(id, name)', q: `name = '${getFileName()}'` },
    } })

    if (data === undefined) {
        const message = `Sync problem, could not get files. Ensure Urban Stats has access to Google Drive.`
        if (response.status === 401 || response.status === 403) {
            throw new AuthenticationError(message)
        }
        throw new Error(message)
    }

    const profileFile = data.files?.[0]
    console.warn(`sync: remote profile ${profileFile === undefined ? 'absent, creating' : 'found'}`)
    if (profileFile === undefined) {
        const profile = getLocalProfile()

        return {
            fileId: await uploadProfile(token, profile),
            profile,
        }
    }
    else {
        const fileId = z.string().parse(profileFile.id)
        const { data: fileData } = await gdriveClient(token).GET('/files/{fileId}', {
            params: {
                path: { fileId },
                query: { alt: 'media' },
            },
            parseAs: 'json',
        })

        const { data: profile } = syncProfileSchema.safeParse(fileData)
        if (profile === undefined) {
            console.warn('Parsing profile failed during sync... falling back to default profile')
        }
        const defaultProfile = {
            quiz_history: {},
            friends: [],
        }
        return { fileId, profile: profile ?? defaultProfile }
    }
}

async function uploadProfile(token: string, json: unknown, existingFileId?: string): Promise<string> {
    const fileMetadata = {
        name: getFileName(),
        parents: existingFileId ? undefined : ['appDataFolder'],
    }
    const media = {
        mimeType: 'application/json',
        body: stableStringify(json)!,
    }

    const multipart = new FormData()

    multipart.append(
        'metadata',
        new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }),
    )
    multipart.append(
        'media',
        new Blob([media.body], { type: media.mimeType }),
    )

    const url = `https://www.googleapis.com/upload/drive/v3/files${existingFileId ? `/${existingFileId}` : ''}?uploadType=multipart`
    const response = await traced(`drive upload ${url}`, () => fetch(url, {
        method: existingFileId ? 'PATCH' : 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: multipart,
    }))

    if (!response.ok) {
        throw new Error('Could not upload profile file')
    }

    return z.object({ id: z.string() }).parse(await response.json()).id
}
