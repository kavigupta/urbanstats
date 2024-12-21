import { endpoint, QuizDescriptor, QuizHistory } from './quiz'

function createAndStoreId(key: string): string {
    // (domain name, id stored in local storage)
    // random 60 bit hex number
    // (15 hex digits)
    if (localStorage.getItem(key) === null) {
        let randomHex = ''
        for (let i = 0; i < 15; i++) {
            randomHex += Math.floor(Math.random() * 16).toString(16)[0]
        }
        // register
        localStorage.setItem(key, randomHex)
    }
    return localStorage.getItem(key)!
}

export function uniquePersistentId(): string {
    return createAndStoreId('persistent_id')
}

export function uniqueSecureId(): string {
    return createAndStoreId('secure_id')
}

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
    const user = uniquePersistentId()
    const secureID = uniqueSecureId()
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

export function parseTimeIdentifier(quizKind: 'juxtastat' | 'retrostat', today: string): number {
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

export async function reportToServer(wholeHistory: QuizHistory, kind: 'juxtastat' | 'retrostat'): Promise<boolean> {
    switch (kind) {
        case 'juxtastat':
            return await reportToServerGeneric(wholeHistory, '/juxtastat/latest_day', '/juxtastat/store_user_stats', parseJuxtastatDay)
        case 'retrostat':
            return await reportToServerGeneric(wholeHistory, '/retrostat/latest_week', '/retrostat/store_user_stats', parseRetrostatWeek)
    }
}

// eslint-disable-next-line no-restricted-syntax -- Data from server
export interface PerQuestionStats { total: number, per_question: number[] }

const questionStatsCache = new Map<string, PerQuestionStats>()

// These are separate sync and async functions to eliminate flashing in the UI
export function getCachedPerQuestionStats(descriptor: QuizDescriptor): PerQuestionStats | undefined {
    return questionStatsCache.get(JSON.stringify(descriptor))
}

export async function getPerQuestionStats(descriptor: QuizDescriptor): Promise<PerQuestionStats> {
    return getCachedPerQuestionStats(descriptor) ?? await fetchPerQuestionStats(descriptor)
}

async function fetchPerQuestionStats(descriptor: QuizDescriptor): Promise<PerQuestionStats> {
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
