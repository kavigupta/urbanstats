
export { reportToServer };

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

async function reportToServer(whole_history) {
    const user = await unique_persistent_id();
    console.log(user);
    console.log(whole_history);
    // fetch from latest_day endpoint
    const latest_day_response = await fetch(ENDPOINT + "/juxtastat/latest_day", {
        method: "POST",
        body: JSON.stringify({ user: user }),
        headers: {
            "Content-Type": "application/json",
        },
    });
    const latest_day_json = await latest_day_response.json();
    console.log(latest_day_json);
    const latest_day = latest_day_json["latest_day"];
    const filtered_days = Object.keys(whole_history).filter((day) => parseInt(day) > latest_day);
    const update = filtered_days.map((day) => {
        return [
            parseInt(day),
            whole_history[day]["correct_pattern"],
        ]
    });
    console.log(update);
    // store user stats
    await fetch(ENDPOINT + "/juxtastat/store_user_stats", {
        method: "POST",
        body: JSON.stringify({ user: user, day_stats: JSON.stringify(update) }),
        headers: {
            "Content-Type": "application/json",
        },
    });
}