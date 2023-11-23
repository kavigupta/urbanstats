
export { get_daily_offset_number, get_retrostat_offset_number };

function get_daily_offset_number() {
    // fractional days since 2023-09-02
    // today's date without the time
    var today = new Date();
    var reference = new Date(2023, 8, 2); // 8 is September, since months are 0-indexed for some fucking reason
    today.setHours(0, 0, 0, 0);
    var offset = (today - reference) / (1000 * 60 * 60 * 24);
    // round to nearest day. this handles daylight savings time, since it's always a midnight-to-midnight comparison.
    // E.g., if it's 9/3 at 1am, the offset will be 9/3 at 0am - 9/2 at 0am = 1 day, which is correct.
    // Similarly, if it's 11/11 at 1am, the offset will be
    //      11/11 at 0am [NO DST] - 9/2 at 0am [DST] = (30 + 31 + 9) days + 1 hour = 70 days + 1 hour
    //      which rounded to the nearest day is 70 days, which is correct.
    offset = Math.round(offset);
    return offset;
}

function get_retrostat_offset_number() {
    const daily = get_daily_offset_number();
    // 78 through 84 --> 0
    return Math.floor((daily - 1) / 7) - 11;
}
