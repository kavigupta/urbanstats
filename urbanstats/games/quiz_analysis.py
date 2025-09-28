import sqlite3
import subprocess
import tempfile
import time
from collections import Counter

import numpy as np
import pandas as pd
from matplotlib import pyplot as plt
from permacache import permacache

from urbanstats.games.quiz import quiz_is_guaranteed_past

CURRENT_TIME = time.time() // 1000 * 1000  # Round to the nearest 1000 seconds

questions = [f"q{i}" for i in range(1, 1 + 5)]

named_users_basal = dict(
    vo=1000233398257748901,
    avery=1027246234047181785,
    kavi=225074120239201340,
    guava=533487794723891791,
    parth=232188494395851367,
    #     gus=65416843712317322,
    adiastra=727538863697858149,
    ellie=691958428450574907,
    # sleepy=19800660824996662,
    # antifa=1128140214864259863,
    #     ashjubilee=846814263642105530,
    april=0x1D2EFE90871F22B,
    violetncs=0x523FF09C66F52F4,
    # violetncs_mother=0xEEA892F929650B4,
    twotwofourtysix=0xFD1E9A8EFD1BD33,
    bethany=0x97815DC19AFF5D4,
)


def get_named_users():
    email_mapping, _ = get_full_statistics_table()
    named_users = {k: email_mapping.get(v, v) for k, v in named_users_basal.items()}
    return named_users


# vulture: ignore -- used in notebooks
def unique_names_each_user():
    names = {k: "" for k in get_named_users()}
    while True:
        duplicates = {v for v, count in Counter(names.values()).items() if count > 1}
        if not duplicates:
            return names
        for k, v in names.items():
            if v in duplicates:
                names[k] = v + k[len(v)]


@permacache("juxtastat_analysis/get_full_statistics_table")
def get_full_statistics_table(date=CURRENT_TIME):
    del date
    c = open_connection()
    c = c.execute(
        """SELECT JuxtaStatUserDomain.user, domain, day, corrects, time
            FROM JuxtaStatUserDomain, JuxtaStatIndividualStats
            WHERE JuxtaStatUserDomain.user = JuxtaStatIndividualStats.user"""
    )
    result = c.fetchall()
    result = pd.DataFrame(
        result, columns=["user_id", "host", "problem", "pattern", "time"]
    )
    email_mapping = get_email_mapping(c)
    result["raw_user_id"] = result.user_id
    result["user_id"] = result.user_id.apply(lambda x: email_mapping.get(x, x))
    return email_mapping, result


def get_email_mapping(c):
    # CREATE TABLE IF NOT EXISTS EmailUsers (email text, user integer PRIMARY KEY, UNIQUE(email, user))
    c.execute("SELECT email, user FROM EmailUsers")
    email_mapping = {user: email for email, user in c.fetchall()}
    return email_mapping


def open_connection():
    tf = tempfile.mktemp(suffix=".sqlite3")
    subprocess.check_call(
        [
            "scp",
            "root@persistent.urbanstats.org:/root/urbanstats-persistent-data/db.sqlite3",
            tf,
        ]
    )
    conn = sqlite3.connect(tf)
    c = conn.cursor()
    return c


def get_secure_id_for_user(user):
    assert isinstance(user, int), user
    c = open_connection()
    c = c.execute(f"SELECT secure_id from JuxtaStatUserSecureID where user={user}")
    return int(c.fetchone()[0])


def get_full_statistics(*, after_problem, debug=False):
    _, result = get_full_statistics_table()
    result = result.copy()
    time_problem = result[["time", "problem"]]
    time_problem = time_problem[time_problem.time == time_problem.time]
    result["last_in_batch"] = 0
    result.loc[
        time_problem.sort_values("problem").drop_duplicates("time", keep="last").index,
        "last_in_batch",
    ] = 1
    result.pattern = result.pattern.apply(
        lambda x: np.array([x // 2**i % 2 for i in range(5)])
    )
    for i, q in enumerate(questions):
        result[q] = result.pattern.apply(lambda x, i=i: x[i])
    result["score"] = result.pattern.apply(sum)
    # time in ms to datetime in Eastern time
    result.time = (
        pd.to_datetime(result.time, unit="ms")
        .dt.tz_localize("UTC")
        .dt.tz_convert("US/Eastern")
    )
    # subtract off day. day 49 is 2023-10-21
    result["date_challenge"] = result.problem.apply(
        lambda x: pd.Timedelta(x - 49, "d")
        + pd.Timestamp("2023-10-21", tz="US/Eastern")
    )
    result["offset"] = (result.time - result.date_challenge).dt.total_seconds() / 3600
    result = result[result.problem >= after_problem]
    if debug:
        result = result[result.host == "localhost"]
    else:
        result = result[result.host == "urbanstats.org"]
    result = result.copy().reset_index(drop=True)
    return result


# vulture: ignore -- used in notebooks
def get_dau(after_problem=49, radius=14):
    result = get_full_statistics(after_problem=after_problem, debug=False)
    num_users_by_problem = result.groupby("problem").count().user_id

    def is_valid_day(x):
        return quiz_is_guaranteed_past(x) is None and x > after_problem

    mask = [is_valid_day(x) for x in num_users_by_problem.index]
    xs, ys = num_users_by_problem.index[mask], num_users_by_problem[mask]
    ys_rolling = [ys[(x - radius <= xs) & (xs <= x + radius)].median() for x in xs]
    return xs, ys, ys_rolling


def plot_bias_for_statistic(x, y, names):
    plt.figure(dpi=200)
    idxs = np.argsort(y - x)
    plt.scatter(x, y, alpha=0.1, marker=".")
    rot = 0
    for i in [*idxs[:5], *idxs[-5:]]:
        plt.text(s=names[i], x=x[i], y=y[i], rotation=rot, size=5)
        rot += 40
        rot %= 90
    plt.xlabel("Real prob")
    plt.ylabel("Target prob")
    xlo, xhi = plt.xlim()
    ylo, yhi = plt.ylim()
    mi, ma = min(xlo, ylo), max(xhi, yhi)
    plt.plot([mi, ma], [mi, ma], color="black", lw=0.5)
    plt.xlim(mi, ma)
    plt.ylim(mi, ma)
    locs = []
    labels = []
    for i in range(int(np.floor(mi * 10)), int(np.ceil(ma * 10)) + 1):
        if i % 10 not in {0, 3, 7}:
            continue
        loc = i / 10
        if not mi <= loc <= ma:
            continue
        locs.append(loc)
        labels.append(f"1/{rounded_power(-i/10):.0f}")
    plt.xticks(locs, labels)
    plt.yticks(locs, labels)
    plt.grid()


def rounded_power(x):
    assert x > 0
    fl = int(np.floor(x))
    x -= fl
    return 10**fl * {0: 1, 3: 2, 7: 5}[round(x * 10)]


# vulture: ignore -- used in notebooks
def plot_sampling_bias(prob_res):
    qqp = prob_res["qqp"]
    geo_target = prob_res["geo_target"]
    stat_target = prob_res["stat_target"]
    ga, sa = qqp.aggregate(prob_res["ps"])
    plot_bias_for_statistic(np.log10(ga), np.log10(geo_target), qqp.all_geographies)
    plt.title("Geography")
    plt.show()
    plot_bias_for_statistic(np.log10(sa), np.log10(stat_target), qqp.all_stats)
    plt.title("Statistics")
    plt.show()
