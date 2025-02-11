import sqlite3
import time
from typing import List, Tuple

from .utils import corrects_to_bytes

table_for_quiz_kind = {
    "juxtastat": "JuxtaStatIndividualStats",
    "retrostat": "JuxtaStatIndividualStatsRetrostat",
}

problem_id_for_quiz_kind = {"juxtastat": "day", "retrostat": "week"}


def table():
    conn = sqlite3.connect("db.sqlite3")
    c = conn.cursor()
    # primary key is user id (as an integer)
    # day is the challenge day number
    # corrects is an integer representing the correct answers as a bitmap
    c.execute(
        """CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day))"""
    )
    # retrostat
    c.execute(
        """CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStatsRetrostat
        (user integer, week integer, corrects integer, time integer, PRIMARY KEY (user, week))"""
    )
    # juxtastat infinite
    c.execute(
        """CREATE TABLE IF NOT EXISTS JuxtaStatInfiniteStats
        (user integer, seed string, version integer, corrects BLOB, score integer, num_answers integer, time integer, PRIMARY KEY (user, seed, version))"""
    )

    # user to domain name
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS JuxtaStatUserDomain (user integer PRIMARY KEY, domain text)
        """
    )
    # user to secure id
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS JuxtaStatUserSecureID (user integer PRIMARY KEY, secure_id integer)
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS FriendRequests (requestee integer, requester integer, UNIQUE(requestee, requester))
        """
    )
    # ADD THESE LATER IF WE NEED THEM
    # For now, we can just calculate them from the individual stats
    # We don't have enough users to worry about performance

    # # primary key is user id (as an integer)
    # # latest_day is the latest challenge day number we have stats for
    # c.execute(
    #     """CREATE TABLE IF NOT EXISTS JuxtaStatLatestDay
    #              (user integer PRIMARY KEY, latest_day integer)"""
    # )
    # # primary key is the challenge day number (as an integer)
    # # total is the total number of players who have played the challenge
    # # correct1 to correct5 are the number of players who have answered each question correctly
    # # score0 to score5 are the number of players who have scored each score
    # c.execute(
    #     """CREATE TABLE IF NOT EXISTS JuxtaStatDailyStats
    #              (day integer PRIMARY KEY, total integer, correct1 integer, correct2 integer, correct3 integer, correct4 integer, correct5 integer, score0 integer, score1 integer, score2 integer, score3 integer, score4 integer, score5 integer)"""
    # )
    conn.commit()
    return conn, c


def register_user(user, domain):
    """
    Register a user with a secure id and domain.
    This is Trust on First Use (TOFU) authentication.
    """
    user = int(user, 16)
    conn, c = table()
    c.execute(
        "INSERT OR REPLACE INTO JuxtaStatUserDomain VALUES (?, ?)",
        (user, domain),
    )
    conn.commit()


def check_secureid(user, secure_id):
    """
    Returns True iff the secure_id is correct for the given user.

    First checks if the user is already registered, if so checks
    if the secure id is correct. If the secure id is incorrect, returns False.
    Otherwise, updates the secure id and returns True.
    """
    user = int(user, 16)
    secure_id = int(secure_id, 16)
    conn, c = table()
    c.execute(
        "SELECT secure_id FROM JuxtaStatUserSecureID WHERE user=?",
        (user,),
    )
    res = c.fetchone()
    if res is None:
        # trust on first use
        c.execute(
            "INSERT INTO JuxtaStatUserSecureID VALUES (?, ?)",
            (user, secure_id),
        )
        conn.commit()
        return True
    return res[0] == secure_id


def latest_day_from_table(user, table_name, column):
    user = int(user, 16)
    _, c = table()
    c.execute(
        f"SELECT COALESCE(MAX({column}), -100) FROM {table_name} WHERE user=?",
        (user,),
    )
    return c.fetchone()[0]


def latest_day(user):
    return latest_day_from_table(user, "JuxtaStatIndividualStats", "day")


def latest_week_retrostat(user):
    return latest_day_from_table(user, "JuxtaStatIndividualStatsRetrostat", "week")


def corrects_to_bitvector(corrects: List[bool]) -> int:
    return sum(2**i for i, correct in enumerate(corrects) if correct)


def bitvector_to_corrects(bitvector: int) -> List[bool]:
    return [bool(bitvector & (2**i)) for i in range(5)]


def store_user_stats_into_table(
    user, day_stats: List[Tuple[int, List[bool]]], table_name
):
    user = int(user, 16)
    conn, c = table()
    # ignore latest day here, it is up to the client to filter out old stats
    # we want to be able to update stats for old days
    print(day_stats)
    time_unix_millis = round(time.time() * 1000)
    c.executemany(
        f"INSERT OR REPLACE INTO {table_name} VALUES (?, ?, ?, ?)",
        [
            (user, day, corrects_to_bitvector(corrects), time_unix_millis)
            for day, corrects in day_stats
        ],
    )
    conn.commit()


def store_user_stats(user, day_stats: List[Tuple[int, List[bool]]]):
    store_user_stats_into_table(user, day_stats, "JuxtaStatIndividualStats")


def store_user_stats_retrostat(user, week_stats: List[Tuple[int, List[bool]]]):
    store_user_stats_into_table(user, week_stats, "JuxtaStatIndividualStatsRetrostat")


def has_infinite_stats(user, seeds_versions):
    user = int(user, 16)
    _, c = table()
    c.execute(
        "SELECT seed, version FROM JuxtaStatInfiniteStats WHERE user=?",
        (user,),
    )
    results = c.fetchall()
    results = set(results)
    return [(seed, version) in results for seed, version in seeds_versions]


def store_user_stats_infinite(user, seed, version, corrects: List[bool]):
    user = int(user, 16)
    conn, c = table()
    correctBytes = corrects_to_bytes(corrects)
    time_unix_millis = round(time.time() * 1000)
    c.execute(
        "INSERT OR REPLACE INTO JuxtaStatInfiniteStats VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            user,
            seed,
            version,
            correctBytes,
            sum(corrects),
            len(corrects),
            time_unix_millis,
        ),
    )
    conn.commit()


def get_per_question_stats_from_table(day, table_name, column):
    day = int(day)
    _, c = table()
    c.execute(
        f"""
        SELECT corrects
        FROM {table_name}
        INNER JOIN JuxtastatUserDomain
        ON {table_name}.user = JuxtastatUserDomain.user
        WHERE {column} = ?
        AND domain = 'urbanstats.org' OR domain = 'testproxy'
        """,
        (day,),
    )
    corrects = c.fetchall()
    corrects = [x[0] for x in corrects]
    corrects = [bitvector_to_corrects(x) for x in corrects]
    corrects = list(zip(*corrects))
    return dict(
        total=len(corrects[0]) if corrects else 0,
        per_question=[sum(x) for x in corrects],
    )


def get_per_question_stats(day):
    return get_per_question_stats_from_table(day, "JuxtaStatIndividualStats", "day")


def get_per_question_stats_retrostat(week):
    return get_per_question_stats_from_table(
        week, "JuxtaStatIndividualStatsRetrostat", "week"
    )


def get_full_database():
    _, c = table()
    # join the user domain table with the individual stats table and get all rows
    c.execute(
        """
        SELECT JuxtaStatUserDomain.user, domain, day, corrects, time
        FROM JuxtaStatUserDomain, JuxtaStatIndividualStats
        WHERE JuxtaStatUserDomain.user = JuxtaStatIndividualStats.user
        """
    )
    return c.fetchall()


def friend_request(requestee, requester):
    try:
        requestee = int(requestee, 16)
    except ValueError:
        return
    requester = int(requester, 16)
    conn, c = table()
    c.execute(
        "INSERT INTO FriendRequests VALUES (?, ?)",
        (requestee, requester),
    )
    print("ABC")
    conn.commit()


def unfriend(requestee, requester):
    requestee = int(requestee, 16)
    requester = int(requester, 16)
    conn, c = table()
    c.execute(
        "DELETE FROM FriendRequests WHERE requestee=? AND requester=?",
        (requestee, requester),
    )
    conn.commit()


def todays_score_for(requestee, requesters, date, quiz_kind):
    """
    For each `requseter` returns the pattern of correct answers if `(requester, requestee)` is a friend pair.
    """

    return _compute_friend_results(
        requestee,
        requesters,
        compute_fn=lambda c, for_user: _compute_daily_score(
            date, quiz_kind, c, for_user
        ),
    )


def infinite_results(requestee, requesters, seed, version):
    """
    For each `requseter` returns the pattern of correct answers if `(requester, requestee)` is a friend pair.
    """

    return _compute_friend_results(requestee, requesters, compute_fn=lambda c, for_user: _infinite_results(c, for_user, seed, version))


def _compute_friend_results(requestee, requesters, compute_fn):
    requestee = int(requestee, 16)

    _, c = table()
    # query the table to see if each pair is a friend pair

    c.execute(
        "SELECT requester FROM FriendRequests WHERE requestee=?",
        (requestee,),
    )
    friends = c.fetchall()
    friends = {x[0] for x in friends}

    results = []
    for requester in requesters:
        try:
            requester = int(requester, 16)
        except ValueError:
            results.append(dict(friends=False, idError="Invalid User ID"))
            continue
        if requester in friends:
            results.append(
                dict(
                    friends=True,
                    **compute_fn(c, requester),
                )
            )
        else:
            results.append(dict(friends=False))
    return results


def _compute_daily_score(date, quiz_kind, c, for_user):
    c.execute(
        f"SELECT corrects FROM {table_for_quiz_kind[quiz_kind]} WHERE user=? AND {problem_id_for_quiz_kind[quiz_kind]}=?",
        (for_user, date),
    )
    res = c.fetchone()
    if res is None:
        return dict(corrects=None)
    else:
        return dict(corrects=bitvector_to_corrects(res[0]))

def _infinite_results(c, for_user, seed, version):
    """
    Returns the result for the given user for the given seed and version, as well
    as the maximum score and corresponding seed and version.
    """

    c.execute(
        "SELECT score FROM JuxtaStatInfiniteStats WHERE user=? AND seed=? AND version=?",
        (for_user, seed, version),
    )
    res = c.fetchone()
    for_this_seed = None if res is None else res[0]

    c.execute(
        "SELECT seed, version, score FROM JuxtaStatInfiniteStats WHERE user=? AND score=(SELECT MAX(score) FROM JuxtaStatInfiniteStats WHERE user=?)",
        (for_user, for_user),
    )
    res = c.fetchone()
    max_score_seed = None if res is None else res[0]
    max_score_version = None if res is None else res[1]
    max_score = None if res is None else res[2]

    return dict(
        forThisSeed=for_this_seed,
        maxScore=max_score,
        maxScoreSeed=max_score_seed,
        maxScoreVersion=max_score_version
    )
