import { QuizDescriptorWithStats } from './quiz'

const reference = new Date(2023, 8, 2) // 2023-09-02. 8 is September, since months are 0-indexed for some fucking reason

export function getDailyOffsetNumber(): number {
    // fractional days since reference
    // today's date without the time
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let offset = (today.valueOf() - reference.valueOf()) / (1000 * 60 * 60 * 24)
    // round to nearest day. this handles daylight savings time, since it's always a midnight-to-midnight comparison.
    // E.g., if it's 9/3 at 1am, the offset will be 9/3 at 0am - 9/2 at 0am = 1 day, which is correct.
    // Similarly, if it's 11/11 at 1am, the offset will be
    //      11/11 at 0am [NO DST] - 9/2 at 0am [DST] = (30 + 31 + 9) days + 1 hour = 70 days + 1 hour
    //      which rounded to the nearest day is 70 days, which is correct.
    offset = Math.round(offset)
    return offset
}

export function getRetrostatOffsetNumber(): number {
    const daily = getDailyOffsetNumber()
    // 78 through 84 --> 0
    return Math.floor((daily - 1) / 7) - 11
}

function dayStart(offset: number): Date {
    const date = new Date(reference)
    date.setDate(date.getDate() + offset)
    return date
}

function dayEnd(offset: number): number {
    const start = dayStart(offset)
    start.setDate(start.getDate() + 1)
    return start.valueOf()
}

function weekStart(weekId: string): Date {
    // check that week_id is W + number
    if (!weekId.startsWith('W')) {
        throw new Error('week_id must start with W')
    }
    const weekNumber = parseInt(weekId.slice(1))
    return dayStart((weekNumber + 11) * 7 + 1)
}

function weekEnd(weekId: string): number {
    const start = weekStart(weekId)
    start.setDate(start.getDate() + 7)
    return start.valueOf()
}

function timeToEndOfDay(offset: number): number {
    return dayEnd(offset) - Date.now()
}

function timeToEndOfWeek(weekId: string): number {
    return weekEnd(weekId) - Date.now()
}

function renderTimeWithinDay(ms: number): string {
    // render HH:MM:SS from ms. Make sure to pad with 0s.
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const secondRemainder = seconds % 60
    const minutesRemainder = minutes % 60
    const hoursRemainder = hours % 24

    const secondsString = secondRemainder.toString().padStart(2, '0')
    const minutesString = minutesRemainder.toString().padStart(2, '0')
    const hoursString = hoursRemainder.toString().padStart(2, '0')

    return `${hoursString}:${minutesString}:${secondsString}`
}

function renderTimeWithinWeek(ms: number): string {
    // render X days, HH:MM:SS from ms. Make sure to pad with 0s.
    const msPerDay = 1000 * 60 * 60 * 24
    const days = Math.floor(ms / msPerDay)
    const withoutDays = ms % msPerDay
    const timeString = renderTimeWithinDay(withoutDays)
    // const s_if_plural = days === 1 ? '' : 's';
    return `${days}d ${timeString}`
}

export function renderTimeRemaining({ kind, name }: QuizDescriptorWithStats): string {
    switch (kind) {
        case 'juxtastat':
            return renderTimeWithinDay(timeToEndOfDay(name))
        case 'retrostat':
            return renderTimeWithinWeek(timeToEndOfWeek(name))
    }
}
