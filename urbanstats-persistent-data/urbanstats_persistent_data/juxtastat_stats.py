import sqlite3
import time
from typing import List, Tuple


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
    # user to domain name
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS JuxtaStatUserDomain (user integer PRIMARY KEY, domain text)
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
    user = int(user, 16)
    conn, c = table()
    c.execute(
        "INSERT OR REPLACE INTO JuxtaStatUserDomain VALUES (?, ?)",
        (user, domain),
    )
    conn.commit()


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


def store_user_stats_into_table(user, day_stats: List[Tuple[int, List[bool]]], table_name):
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
        AND domain = 'urbanstats.org'
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
