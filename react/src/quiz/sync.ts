import stableStringify from 'json-stable-stringify'
import { z } from 'zod'

import { TestUtils } from '../utils/TestUtils'
import { gdriveClient } from '../utils/google-drive-client'

import { QuizFriends, QuizHistory, QuizPersistent, syncProfileSchema } from './quiz'

export class AuthenticationError extends Error {}

export async function syncWithGoogleDrive(token: string): Promise<void> {
    const { fileId, profile: remoteProfile } = await getProfileFile(token)
    const localProfile = getLocalProfile()
    if (stableStringify(remoteProfile) === stableStringify(localProfile)) {
        // Profiles same
        return
    }
    const mergedProfile = mergeProfiles(localProfile, remoteProfile)
    QuizPersistent.shared.history.value = mergedProfile.quiz_history
    QuizPersistent.shared.friends.value = mergedProfile.friends
    await uploadProfile(token, mergedProfile, fileId)
}

type Profile = z.infer<typeof syncProfileSchema>

function getLocalProfile(): Profile {
    return {
        quiz_history: QuizPersistent.shared.history.value,
        friends: QuizPersistent.shared.friends.value,
    }
}

function mergeProfiles(a: Profile, b: Profile): Profile {
    return {
        quiz_history: mergeHistories(a.quiz_history, b.quiz_history),
        friends: mergeFriends(a.friends, b.friends),
    }
}

export function historyConflicts(a: QuizHistory, b: QuizHistory): string[] {
    return Object.keys(a)
        .filter(key =>
            key in b
            && stableStringify(a[key]) !== stableStringify(b[key]))
}

// When a result ties, we must resolve it consistently, otherwise we get into a sync loop
export function mergeHistories(a: QuizHistory, b: QuizHistory): QuizHistory {
    const conflicts = historyConflicts(a, b)
    return {
        ...a, ...b, ...Object.fromEntries(conflicts.map((key) => {
            const aPattern = a[key].correct_pattern
            const bPattern = b[key].correct_pattern
            if (aPattern.length !== bPattern.length) {
                // If one is more complete, return that one, since the user is taking the quiz
                return [key, aPattern.length > bPattern.length ? a[key] : b[key]]
            }

            const aCorrect = aPattern.filter(value => value).length
            const bCorrect = bPattern.filter(value => value).length
            let quizRecord
            if (aCorrect !== bCorrect) {
                quizRecord = bCorrect > aCorrect ? a[key] : b[key]
            }
            else {
                quizRecord = stableStringify(bCorrect)! > stableStringify(aCorrect)! ? a[key] : b[key]
            }
            return [key, quizRecord]
        })),
    }
}

/*
 * Merge friends.
 * When two lists have overlapping ids, the entry that has the lowest index in its list wins
 * When both entries have the same index, the lowest name wins
 */
function mergeFriends(a: QuizFriends, b: QuizFriends): QuizFriends {
    let aIdx = 0
    let bIdx = 0
    const result: QuizFriends = []
    const usedIds = new Set<string>()
    while (aIdx < a.length && bIdx < b.length) {
        if (a[aIdx][1] === b[bIdx][1]) {
            // ids same
            if (!usedIds.has(a[aIdx][1])) {
                // prefer latest timestamp
                if ((a[aIdx][2] ?? 0) > (b[bIdx][2] ?? 0)) {
                    result.push(a[aIdx])
                }
                else {
                    result.push(b[bIdx])
                }
                usedIds.add(a[aIdx][1])
            }
            aIdx++
            bIdx++
        }
        // sort by timestamp
        else if ((a[aIdx][2] ?? 0) < (b[bIdx][2] ?? 0)) {
            if (!usedIds.has(a[aIdx][1])) {
                result.push(a[aIdx])
                usedIds.add(a[aIdx][1])
            }
            aIdx++
        }
        else {
            if (!usedIds.has(b[aIdx][1])) {
                result.push(b[aIdx])
                usedIds.add(b[aIdx][1])
            }
            bIdx++
        }
    }
    return result.concat(a.slice(aIdx)).concat(b.slice(bIdx))
}

async function getFileName(): Promise<string> {
    let testPortion = ''
    const testId = await TestUtils.shared.get('testIterationId')
    if (testId !== undefined) {
        testPortion = `.${testId}`
    }
    // eslint-disable-next-line no-restricted-syntax -- Storing remote file
    return `${window.location.host}${testPortion}.profile.json`
}

async function getProfileFile(token: string): Promise<{ fileId: string, profile: Profile }> {
    const { data, response } = await gdriveClient(token).GET('/files', { params: {
        query: { spaces: 'appDataFolder', fields: 'files(id, name)', q: `name = '${await getFileName()}'` },
    } })

    if (data === undefined) {
        const message = `Sync problem, could not get files. Ensure Urban Stats has access to Google Drive.`
        if (response.status === 401 || response.status === 403) {
            throw new AuthenticationError(message)
        }
        throw new Error(message)
    }

    const profileFile = data.files?.[0]
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
        name: await getFileName(),
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

    const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files${existingFileId ? `/${existingFileId}` : ''}?uploadType=multipart`, {
        method: existingFileId ? 'PATCH' : 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: multipart,
    })

    if (!response.ok) {
        throw new Error('Could not upload profile file')
    }

    return z.object({ id: z.string() }).parse(await response.json()).id
}
