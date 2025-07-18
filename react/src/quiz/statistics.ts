import { persistentClient } from '../utils/urbanstats-persistent-client'

import { infiniteQuizIsDone, validQuizInfiniteVersions } from './infinite'
import { QuizDescriptorWithTime, QuizHistory, QuizKindWithStats, QuizKindWithTime, QuizModel } from './quiz'

async function registerUser(): Promise<void> {
    // Idempotent
    await persistentClient.POST('/juxtastat/register_user', {
        params: {
            header: QuizModel.shared.userHeaders(),
        },
        body: {
            // eslint-disable-next-line no-restricted-syntax -- Using the window hostname
            domain: localStorage.getItem('testHostname') ?? window.location.hostname,
        },
    })
}

async function reportToServerGeneric(wholeHistory: QuizHistory, endpointLatest: '/juxtastat/latest_day' | '/retrostat/latest_week', endpointStore: '/juxtastat/store_user_stats' | '/retrostat/store_user_stats', parseDay: (day: string) => number): Promise<void> {
    await registerUser()

    // fetch from latest_day endpoint
    const { data } = await persistentClient.GET(endpointLatest, {
        params: {
            header: QuizModel.shared.userHeaders(),
        },
    })

    if (data === undefined) {
        return
    }
    const latestDay = data.latest_day
    const filteredDays = Object.keys(wholeHistory).filter(day => parseDay(day) > latestDay)
    const update = filteredDays.map<[number, boolean[]]>((day) => {
        return [
            parseDay(day),
            wholeHistory[day].correct_pattern.map(b => b === 1 || b === true),
        ]
    })

    await persistentClient.POST(endpointStore, {
        params: {
            header: QuizModel.shared.userHeaders(),
        },
        body: {
            day_stats: update,
        },
    })
}

export function getInfiniteQuizzes(wholeHistory: QuizHistory, isDone: boolean): [[string, number][], string[]] {
    const seedVersions: [string, number][] = []
    const keys: string[] = []
    for (const day of Object.keys(wholeHistory)) {
        const parsed = parseInfiniteSeedVersion(day)
        if (parsed === undefined) {
            continue
        }
        if (infiniteQuizIsDone(wholeHistory[day].correct_pattern) !== isDone) {
            continue
        }
        if (!(validQuizInfiniteVersions as number[]).includes(parsed[1])) {
            continue
        }
        seedVersions.push(parsed)
        keys.push(day)
    }
    return [seedVersions, keys]
}

async function getUnreportedSeedVersions(user: string, secureID: string, wholeHistory: QuizHistory): Promise<[[string, number][], string[]] | undefined> {
    const [seedVersions, keys] = getInfiniteQuizzes(wholeHistory, true)
    // post seedVersions to /juxtastat_infinite/has_infinite_stats
    await registerUser()

    const { data } = await persistentClient.POST('/juxtastat_infinite/has_infinite_stats', {
        params: {
            header: QuizModel.shared.userHeaders(),
        },
        body: { seedVersions },
    })

    if (data === undefined) {
        return undefined
    }

    const has = data.has
    return [seedVersions.filter((_, index) => !has[index]), keys.filter((_, index) => !has[index])]
}

async function reportToServerInfinite(wholeHistory: QuizHistory): Promise<void> {
    const user = QuizModel.shared.uniquePersistentId.value
    const secureID = QuizModel.shared.uniqueSecureId.value
    const res = await getUnreportedSeedVersions(user, secureID, wholeHistory)
    if (res === undefined) {
        return
    }
    const [seedVersions, keys] = res
    for (let i = 0; i < seedVersions.length; i++) {
        const [seed, version] = seedVersions[i]
        const key = keys[i]
        const dayStats = wholeHistory[key]
        await persistentClient.POST('/juxtastat_infinite/store_user_stats', {
            params: {
                header: QuizModel.shared.userHeaders(),
            },
            body: {
                seed, version, corrects: dayStats.correct_pattern.map(b => b === 1 || b === true),
            },
        })
    }
}

export function parseTimeIdentifier(quizKind: QuizKindWithTime, today: string): number {
    switch (quizKind) {
        case 'juxtastat':
            return parseJuxtastatDay(today)
        case 'retrostat':
            return parseRetrostatWeek(today)
    }
}

function parseJuxtastatDay(day: string): number {
    // return -10000 if day doesn't match -?[0-9]+
    if (!/^-?[0-9]+$/.test(day)) {
        return -10000
    }
    return parseInt(day)
}

function parseRetrostatWeek(day: string): number {
    // return -10000 if day doesn't match W-?[0-9]+
    if (!/^W-?[0-9]+$/.test(day)) {
        return -10000
    }
    return parseInt(day.substring(1))
}

function parseInfiniteSeedVersion(day: string): [string, number] | undefined {
    const pattern = /^I_([0-9a-zA-Z]+)_([0-9]+)$/
    const match = pattern.exec(day)
    if (match === null) {
        return undefined
    }
    return [match[1], parseInt(match[2])]
}

export async function reportToServer(wholeHistory: QuizHistory, kind: QuizKindWithStats): Promise<void> {
    switch (kind) {
        case 'juxtastat':
        { await reportToServerGeneric(wholeHistory, '/juxtastat/latest_day', '/juxtastat/store_user_stats', parseJuxtastatDay); return }
        case 'retrostat':
        { await reportToServerGeneric(wholeHistory, '/retrostat/latest_week', '/retrostat/store_user_stats', parseRetrostatWeek); return }
        case 'infinite':
        { await reportToServerInfinite(wholeHistory); return }
    }
}

// eslint-disable-next-line no-restricted-syntax -- Data from server
export interface PerQuestionStats { total: number, per_question: number[] }

const questionStatsCache = new Map<string, PerQuestionStats>()

// These are separate sync and async functions to eliminate flashing in the UI
export function getCachedPerQuestionStats(descriptor: QuizDescriptorWithTime): PerQuestionStats | undefined {
    return questionStatsCache.get(JSON.stringify(descriptor))
}

export async function getPerQuestionStats(descriptor: QuizDescriptorWithTime): Promise<PerQuestionStats> {
    return getCachedPerQuestionStats(descriptor) ?? await fetchPerQuestionStats(descriptor)
}

async function fetchPerQuestionStats(descriptor: QuizDescriptorWithTime): Promise<PerQuestionStats> {
    let response: { data?: PerQuestionStats }
    switch (descriptor.kind) {
        case 'juxtastat':
            response = await persistentClient.GET('/juxtastat/get_per_question_stats', {
                params: {
                    query: { day: descriptor.name },
                },
            })
            break
        case 'retrostat':
            response = await persistentClient.GET('/retrostat/get_per_question_stats', {
                params: {
                    query: { week: parseInt(descriptor.name.substring(1)) },
                },
            })
            break
    }
    if (response.data === undefined) {
        throw new Error('Failed to get per question stats')
    }
    return response.data
}
