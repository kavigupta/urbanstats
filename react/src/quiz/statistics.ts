const ENDPOINT = 'https://persistent.urbanstats.org'

export function unique_persistent_id(): string {
    // (domain name, id stored in local storage)
    // random 60 bit hex number
    // (15 hex digits)
    if (localStorage.getItem('persistent_id') === null) {
        let random_hex = ''
        for (let i = 0; i < 15; i++) {
            random_hex += Math.floor(Math.random() * 16).toString(16)[0]
        }
        // register
        localStorage.setItem('persistent_id', random_hex)
    }
    return localStorage.getItem('persistent_id')!
}

async function registerUser(userId: string): Promise<void> {
    // Idempotent
    await fetch(`${ENDPOINT}/juxtastat/register_user`, {
        method: 'POST',
        body: JSON.stringify({ user: userId, domain: localStorage.getItem('testHostname') ?? window.location.hostname }),
        headers: {
            'Content-Type': 'application/json',
        },
    })
}

export type History = Record<string, { choices: ('A' | 'B')[], correct_pattern: boolean[] }>

async function reportToServerGeneric(whole_history: History, endpoint_latest: string, endpoint_store: string, parse_day: (day: string) => number): Promise<void> {
    const user = unique_persistent_id()
    await registerUser(user)
    // fetch from latest_day endpoint
    const latest_day_response = await fetch(ENDPOINT + endpoint_latest, {
        method: 'POST',
        body: JSON.stringify({ user }),
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
        body: JSON.stringify({ user, day_stats: JSON.stringify(update) }),
        headers: {
            'Content-Type': 'application/json',
        },
    })
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

export async function reportToServer(whole_history: History): Promise<void> {
    await reportToServerGeneric(whole_history, '/juxtastat/latest_day', '/juxtastat/store_user_stats', parse_juxtastat_day)
}

export async function reportToServerRetro(whole_history: History): Promise<void> {
    await reportToServerGeneric(whole_history, '/retrostat/latest_week', '/retrostat/store_user_stats', parse_retrostat_week)
}
