import { infiniteQuizIsDone, validQuizInfiniteVersions } from './infinite'
import { endpoint, QuizDescriptorWithTime, QuizHistory, QuizKindWithStats, QuizKindWithTime, QuizLocalStorage } from './quiz'

async function registerUser(userId: string, secureID: string): Promise<boolean> {
    // Idempotent
    const response = await fetch(`${endpoint}/juxtastat/register_user`, {
        method: 'POST',
        // eslint-disable-next-line no-restricted-syntax -- Using the window hostname
        body: JSON.stringify({ user: userId, secureID, domain: localStorage.getItem('testHostname') ?? window.location.hostname }),
        headers: {
            'Content-Type': 'application/json',
        },
    })
    const json = await response.json() as { error?: string, code?: string }
    return json.code === 'bad_secureid'
}

async function reportToServerGeneric(wholeHistory: QuizHistory, endpointLatest: string, endpointStore: string, parseDay: (day: string) => number): Promise<boolean> {
    const user = QuizLocalStorage.shared.uniquePersistentId.value
    const secureID = QuizLocalStorage.shared.uniqueSecureId.value
    const isError = await registerUser(user, secureID)
    if (isError) {
        return true
    }
    // fetch from latest_day endpoint
    const latestDayResponse = await fetch(endpoint + endpointLatest, {
        method: 'POST',
        body: JSON.stringify({ user, secureID }),
        headers: {
            'Content-Type': 'application/json',
        },
    })
    // eslint-disable-next-line no-restricted-syntax -- Data from server
    const latestDayJson = await latestDayResponse.json() as { latest_day: number }
    const latestDay = latestDayJson.latest_day
    const filteredDays = Object.keys(wholeHistory).filter(day => parseDay(day) > latestDay)
    const update = filteredDays.map((day) => {
        return [
            parseDay(day),
            wholeHistory[day].correct_pattern,
        ]
    })
    // store user stats
    await fetch(endpoint + endpointStore, {
        method: 'POST',
        body: JSON.stringify({ user, secureID, day_stats: JSON.stringify(update) }),
        headers: {
            'Content-Type': 'application/json',
        },
    })
    return false
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
    const isError = await registerUser(user, secureID)
    if (isError) {
        return undefined
    }
    const response = await fetch(`${endpoint}/juxtastat_infinite/has_infinite_stats`, {
        method: 'POST',
        body: JSON.stringify({ user, secureID, seedVersions }),
        headers: {
            'Content-Type': 'application/json',
        },
    })
    const json = await response.json() as { has: boolean[] }
    const has = json.has
    return [seedVersions.filter((_, index) => !has[index]), keys.filter((_, index) => !has[index])]
}

async function reportToServerInfinite(wholeHistory: QuizHistory): Promise<boolean> {
    const user = QuizLocalStorage.shared.uniquePersistentId.value
    const secureID = QuizLocalStorage.shared.uniqueSecureId.value
    const res = await getUnreportedSeedVersions(user, secureID, wholeHistory)
    if (res === undefined) {
        return true
    }
    const [seedVersions, keys] = res
    for (let i = 0; i < seedVersions.length; i++) {
        const [seed, version] = seedVersions[i]
        const key = keys[i]
        const dayStats = wholeHistory[key]
        await fetch(`${endpoint}/juxtastat_infinite/store_user_stats`, {
            method: 'POST',
            body: JSON.stringify({ user, secureID, seed, version, corrects: dayStats.correct_pattern }),
            headers: {
                'Content-Type': 'application/json',
            },
        })
    }
    return false
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

export async function reportToServer(wholeHistory: QuizHistory, kind: QuizKindWithStats): Promise<boolean> {
    switch (kind) {
        case 'juxtastat':
            return await reportToServerGeneric(wholeHistory, '/juxtastat/latest_day', '/juxtastat/store_user_stats', parseJuxtastatDay)
        case 'retrostat':
            return await reportToServerGeneric(wholeHistory, '/retrostat/latest_week', '/retrostat/store_user_stats', parseRetrostatWeek)
        case 'infinite':
            return await reportToServerInfinite(wholeHistory)
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
    let response: Response
    switch (descriptor.kind) {
        case 'juxtastat':
            response = await fetch(`${endpoint}/juxtastat/get_per_question_stats`, {
                method: 'POST',
                body: JSON.stringify({ day: descriptor.name }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            break
        case 'retrostat':
            response = await fetch(`${endpoint}/retrostat/get_per_question_stats`, {
                method: 'POST',
                body: JSON.stringify({ week: parseInt(descriptor.name.substring(1)) }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            break
    }
    const result = await response.json() as PerQuestionStats
    questionStatsCache.set(JSON.stringify(descriptor), result)
    return result
}
