
export { reportToServer, parse_time_identifier };

const ENDPOINT = "https://persistent.urbanstats.org";

async function unique_persistent_id() {
    // (domain name, id stored in local storage)
    // random 60 bit hex number
    // (15 hex digits)
    if (localStorage.getItem("persistent_id") == undefined) {
        var random_hex = "";
        for (var i = 0; i < 15; i++) {
            random_hex += Math.floor(Math.random() * 16).toString(16)[0];
        }
        // register via server
        await fetch(ENDPOINT + "/juxtastat/register_user", {
            method: "POST",
            body: JSON.stringify({ user: random_hex, domain: window.location.hostname }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        // register
        localStorage.setItem("persistent_id", random_hex);
    }
    return localStorage.getItem("persistent_id");
}

async function reportToServerGeneric(whole_history, endpoint_latest, endpoint_store, parse_day) {
    const user = await unique_persistent_id();
    console.log(user);
    console.log(whole_history);
    // fetch from latest_day endpoint
    const latest_day_response = await fetch(ENDPOINT + endpoint_latest, {
        method: "POST",
        body: JSON.stringify({ user: user }),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const latest_day_json = await latest_day_response.json();
    console.log(latest_day_json);
    const latest_day = latest_day_json["latest_day"];
    const filtered_days = Object.keys(whole_history).filter((day) => parse_day(day) > latest_day);
    const update = filtered_days.map((day) => {
        return [
            parse_day(day),
            whole_history[day]["correct_pattern"],
        ]
    });
    console.log(update);
    // store user stats
    await fetch(ENDPOINT + endpoint_store, {
        method: "POST",
        body: JSON.stringify({ user: user, day_stats: JSON.stringify(update) }),
        headers: {
            "Content-Type": "application/json",
        },
    });
}

function parse_time_identifier(quiz_kind, today) {
    if (quiz_kind == "juxtastat") {
        return parse_juxtastat_day(today);
    }
    throw new Error("Unknown quiz kind " + quiz_kind);
}

function parse_juxtastat_day(day) {
    // return -10000 if day doesn't match -?[0-9]+
    if (/^-?[0-9]+$/.test(day) == false) {
        return -10000;
    }
    return parseInt(day);
}

async function reportToServer(whole_history) {
    await reportToServerGeneric(whole_history, "/juxtastat/latest_day", "/juxtastat/store_user_stats", parse_juxtastat_day);
}
