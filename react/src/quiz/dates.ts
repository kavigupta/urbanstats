import { QuizDescriptor } from "./quiz";

const reference = new Date(2023, 8, 2); // 2023-09-02. 8 is September, since months are 0-indexed for some fucking reason

export function get_daily_offset_number() {
    // fractional days since reference
    // today's date without the time
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let offset = (today.valueOf() - reference.valueOf()) / (1000 * 60 * 60 * 24);
    // round to nearest day. this handles daylight savings time, since it's always a midnight-to-midnight comparison.
    // E.g., if it's 9/3 at 1am, the offset will be 9/3 at 0am - 9/2 at 0am = 1 day, which is correct.
    // Similarly, if it's 11/11 at 1am, the offset will be
    //      11/11 at 0am [NO DST] - 9/2 at 0am [DST] = (30 + 31 + 9) days + 1 hour = 70 days + 1 hour
    //      which rounded to the nearest day is 70 days, which is correct.
    offset = Math.round(offset);
    return offset;
}

export function get_retrostat_offset_number() {
    const daily = get_daily_offset_number();
    // 78 through 84 --> 0
    return Math.floor((daily - 1) / 7) - 11;
}

function day_start(offset: number) {
    const date = new Date(reference);
    date.setDate(date.getDate() + offset);
    return date;
}

function day_end(offset: number) {
    const start = day_start(offset);
    start.setDate(start.getDate() + 1);
    return start.valueOf();
}

function week_start(week_id: string) {
    // check that week_id is W + number
    if (!week_id.startsWith('W')) {
        throw new Error('week_id must start with W');
    }
    const week_number = parseInt(week_id.slice(1));
    return day_start((week_number + 11) * 7 + 1);
}

function week_end(week_id: string) {
    const start = week_start(week_id);
    start.setDate(start.getDate() + 7);
    return start.valueOf();
}

function time_to_end_of_day(offset: number) {
    return day_end(offset) - Date.now();
}

function time_to_end_of_week(week_id: string) {
    return week_end(week_id) - Date.now();
}

function render_time_within_day(ms: number) {
    // render HH:MM:SS from ms. Make sure to pad with 0s.
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const seconds_remainder = seconds % 60;
    const minutes_remainder = minutes % 60;
    const hours_remainder = hours % 24;

    const seconds_string = seconds_remainder.toString().padStart(2, '0');
    const minutes_string = minutes_remainder.toString().padStart(2, '0');
    const hours_string = hours_remainder.toString().padStart(2, '0');

    return `${hours_string}:${minutes_string}:${seconds_string}`;
}

function render_time_within_week(ms: number) {
    // render X days, HH:MM:SS from ms. Make sure to pad with 0s.
    const ms_per_day = 1000 * 60 * 60 * 24;
    const days = Math.floor(ms / ms_per_day);
    const without_days = ms % ms_per_day;
    const time_string = render_time_within_day(without_days);
    // const s_if_plural = days === 1 ? '' : 's';
    return `${days}d ${time_string}`;
}

export function render_time_remaining({ kind, name }: QuizDescriptor): string {
    switch(kind) {
        case "juxtastat":
            return render_time_within_day(time_to_end_of_day(name));
        case "retrostat":
            return render_time_within_week(time_to_end_of_week(name));
    }
}