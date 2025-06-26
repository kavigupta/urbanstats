import time
from typing import List, Tuple

from ..utils import corrects_to_bytes
from .utils import table


def register_user(user, domain):
    """
    Register a user with a secure id and domain.
    This is Trust on First Use (TOFU) authentication.
    """
    conn, c = table()
    c.execute(
        "INSERT OR REPLACE INTO JuxtaStatUserDomain VALUES (?, ?)",
        (user, domain),
    )
    conn.commit()


def latest_day_from_table(user: int, table_name, column):
    _, c = table()
    c.execute(
        f"SELECT COALESCE(MAX({column}), -100) FROM {table_name} WHERE user = ?",
        (user,),
    )
    return c.fetchone()[0]


def latest_day(user: int):
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
    conn, c = table()
    # ignore latest day here, it is up to the client to filter out old stats
    # we want to be able to update stats for old days
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
    _, c = table()
    c.execute(
        "SELECT seed, version FROM JuxtaStatInfiniteStats WHERE user = ?",
        (user,),
    )
    results = c.fetchall()
    results = set(results)
    return [(seed, version) in results for seed, version in seeds_versions]


def store_user_stats_infinite(user, seed, version, corrects: List[bool]):
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
    _, c = table()
    c.execute(
        f"""
        SELECT corrects
        FROM {table_name}
        INNER JOIN JuxtastatUserDomain
        ON {table_name}.user = JuxtastatUserDomain.user
        WHERE {column} = ?
        AND (domain = 'urbanstats.org' OR domain = 'testproxy.nonexistent')
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
