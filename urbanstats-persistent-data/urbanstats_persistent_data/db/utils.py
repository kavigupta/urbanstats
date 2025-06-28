from enum import Enum
import sqlite3


class QuizKind(str, Enum):
    juxtastat = "juxtastat"
    retrostat = "retrostat"


table_for_quiz_kind = {
    QuizKind.juxtastat: "JuxtaStatIndividualStats",
    QuizKind.retrostat: "JuxtaStatIndividualStatsRetrostat",
}

problem_id_for_quiz_kind = {QuizKind.juxtastat: "day", QuizKind.retrostat: "week"}


class DbSession:
    conn: sqlite3.Connection
    c: sqlite3.Cursor

    def __init__(self):
        self.conn = sqlite3.connect("db.sqlite3")
        self.c = self.conn.cursor()
        create_tables(self)


def create_tables(s: DbSession):
    # primary key is user id (as an integer)
    # day is the challenge day number
    # corrects is an integer representing the correct answers as a bitmap
    s.c.execute(
        """CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStats
        (user integer, day integer, corrects integer, time integer, PRIMARY KEY (user, day))"""
    )
    # retrostat
    s.c.execute(
        """CREATE TABLE IF NOT EXISTS JuxtaStatIndividualStatsRetrostat
        (user integer, week integer, corrects integer, time integer, PRIMARY KEY (user, week))"""
    )
    # juxtastat infinite
    s.c.execute(
        """CREATE TABLE IF NOT EXISTS JuxtaStatInfiniteStats (
            user integer,
            seed string,
            version integer,
            corrects BLOB,
            score integer,
            num_answers integer,
            time integer, 
            PRIMARY KEY (user, seed, version)
        )"""
    )

    # user to domain name
    s.c.execute(
        """
        CREATE TABLE IF NOT EXISTS JuxtaStatUserDomain (user integer PRIMARY KEY, domain text)
        """
    )
    # user to secure id
    s.c.execute(
        """
        CREATE TABLE IF NOT EXISTS JuxtaStatUserSecureID (user integer PRIMARY KEY, secure_id integer)
        """
    )
    s.c.execute(
        """
        CREATE TABLE IF NOT EXISTS FriendRequests (requestee integer, requester integer, UNIQUE(requestee, requester))
        """
    )
    # Map email <->> user
    s.c.execute(
        """
        CREATE TABLE IF NOT EXISTS EmailUsers (email text, user integer PRIMARY KEY, UNIQUE(email, user))
        """
    )
    # if table does not exist, create it
    # primary key is shortened (as an integer)
    # full is the full text
    s.c.execute(
        """CREATE TABLE IF NOT EXISTS ShortenedData
                 (shortened integer PRIMARY KEY, full text)"""
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
    #     """CREATE TABLE IF NOT EXISTS JuxtaStatDailyStats (
    #           day integer PRIMARY KEY,
    #           total integer,
    #           correct1 integer,
    #           correct2 integer,
    #           correct3 integer,
    #           correct4 integer,
    #           correct5 integer,
    #           score0 integer,
    #           score1 integer,
    #           score2 integer,
    #           score3 integer,
    #           score4 integer,
    #           score5 integer
    #     )"""
    # )
    s.conn.commit()


def get_full_database(s: DbSession):
    # join the user domain table with the individual stats table and get all rows
    s.c.execute(
        """
        SELECT JuxtaStatUserDomain.user, domain, day, corrects, time
        FROM JuxtaStatUserDomain, JuxtaStatIndividualStats
        WHERE JuxtaStatUserDomain.user = JuxtaStatIndividualStats.user
        """
    )
    return s.c.fetchall()
