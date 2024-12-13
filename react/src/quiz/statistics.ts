import { ENDPOINT, QuizDescriptor, QuizHistory } from './quiz'

function create_and_store_id(key: string): string {
    // (domain name, id stored in local storage)
    // random 60 bit hex number
    // (15 hex digits)
    if (localStorage.getItem(key) === null) {
        let random_hex = ''
        for (let i = 0; i < 15; i++) {
            random_hex += Math.floor(Math.random() * 16).toString(16)[0]
        }
        // register
        localStorage.setItem(key, random_hex)
    }
    return localStorage.getItem(key)!
}

export function unique_persistent_id(): string {
    return create_and_store_id('persistent_id')
}

export function unique_secure_id(): string {
    return create_and_store_id('secure_id')
}

async function registerUser(userId: string, secureID: string): Promise<boolean> {
    // Idempotent
    const response = await fetch(`${ENDPOINT}/juxtastat/register_user`, {
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

async function reportToServerGeneric(whole_history: QuizHistory, endpoint_latest: string, endpoint_store: string, parse_day: (day: string) => number): Promise<boolean> {
    const user = unique_persistent_id()
    const secureID = unique_secure_id()
    const isError = await registerUser(user, secureID)
    if (isError) {
        return true
    }
    // fetch from latest_day endpoint
    const latest_day_response = await fetch(ENDPOINT + endpoint_latest, {
        method: 'POST',
        body: JSON.stringify({ user, secureID }),
        headers: {
            'Content-Type': 'application/json',
        },
    })
    const latest_day_json = await latest_day_response.json() as { latest_day: number }
    const latest_day = latest_day_json.latest_day
    const filtered_days = Object.keys(whole_history).filter(day => parse_day(day) > latest_day)
    const update = filtered_days.map((day) => {
        return [
            parse_day(day),
            whole_history[day].correct_pattern,
        ]
    })
    // store user stats
    await fetch(ENDPOINT + endpoint_store, {
        method: 'POST',
        body: JSON.stringify({ user, secureID, day_stats: JSON.stringify(update) }),
        headers: {
            'Content-Type': 'application/json',
        },
    })
    return false
}

export function parse_time_identifier(quiz_kind: 'juxtastat' | 'retrostat', today: string): number {
    switch (quiz_kind) {
        case 'juxtastat':
            return parse_juxtastat_day(today)
        case 'retrostat':
            return parse_retrostat_week(today)
    }
}

function parse_juxtastat_day(day: string): number {
    // return -10000 if day doesn't match -?[0-9]+
    if (!/^-?[0-9]+$/.test(day)) {
        return -10000
    }
    return parseInt(day)
}

function parse_retrostat_week(day: string): number {
    // return -10000 if day doesn't match W-?[0-9]+
    if (!/^W-?[0-9]+$/.test(day)) {
        return -10000
    }
    return parseInt(day.substring(1))
}

export async function reportToServer(whole_history: QuizHistory, kind: 'juxtastat' | 'retrostat'): Promise<boolean> {
    switch (kind) {
        case 'juxtastat':
            return await reportToServerGeneric(whole_history, '/juxtastat/latest_day', '/juxtastat/store_user_stats', parse_juxtastat_day)
        case 'retrostat':
            return await reportToServerGeneric(whole_history, '/retrostat/latest_week', '/retrostat/store_user_stats', parse_retrostat_week)
    }
}

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
            response = await fetch(`${ENDPOINT}/juxtastat/get_per_question_stats`, {
                method: 'POST',
                body: JSON.stringify({ day: descriptor.name }),
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            break
        case 'retrostat':
            response = await fetch(`${ENDPOINT}/retrostat/get_per_question_stats`, {
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
