import base64
import time
import typing as t

from pydantic import BaseModel

from ..db.utils import (
    DbSession,
    QuizKind,
    problem_id_for_quiz_kind,
    table_for_quiz_kind,
)
from ..dependencies.authenticate import AuthenticatedRequest
from ..utils import corrects_to_bytes
from .utils import sqlTuple


def register_user(req: AuthenticatedRequest, domain: str) -> None:
    """
    Register a user with a secure id and domain.
    This is Trust on First Use (TOFU) authentication.
    """
    req.s.c.execute(
        "INSERT OR REPLACE INTO JuxtaStatUserDomain VALUES (?, ?)",
        (req.user_id, domain),
    )


def latest_day_from_table(
    req: AuthenticatedRequest, table_name: str, column: str
) -> int:
    req.s.c.execute(
        f"SELECT COALESCE(MAX({column}), -100) FROM {table_name} WHERE user IN {sqlTuple(len(req.associated_user_ids))}",
        list(req.associated_user_ids),
    )
    return t.cast(int, req.s.c.fetchone()[0])


def latest_day(req: AuthenticatedRequest) -> int:
    return latest_day_from_table(req, "JuxtaStatIndividualStats", "day")


def latest_week_retrostat(req: AuthenticatedRequest) -> int:
    return latest_day_from_table(req, "JuxtaStatIndividualStatsRetrostat", "week")


def played_mask(req: AuthenticatedRequest, quiz_kind: QuizKind) -> str:
    """
    Base64 of a little-endian bitmask of the days or weeks this user has stats for.
    """
    column = problem_id_for_quiz_kind[quiz_kind]
    # The upper bound keeps a bogus reported day from allocating a huge mask
    req.s.c.execute(
        f"SELECT {column} FROM {table_for_quiz_kind[quiz_kind]} "
        f"WHERE user IN {sqlTuple(len(req.associated_user_ids))} AND {column} >= 0 AND {column} < 100000",
        list(req.associated_user_ids),
    )
    played = [row[0] for row in req.s.c.fetchall()]
    mask = bytearray(max(played, default=-1) // 8 + 1)
    for problem_id in played:
        mask[problem_id // 8] |= 1 << (problem_id % 8)
    return base64.b64encode(mask).decode()


def corrects_to_bitvector(corrects: t.List[bool]) -> int:
    return sum(2**i for i, correct in enumerate(corrects) if correct)


def bitvector_to_corrects(bitvector: int) -> t.List[bool]:
    return [bool(bitvector & (2**i)) for i in range(5)]


def store_user_stats_into_table(
    req: AuthenticatedRequest,
    day_stats: t.List[t.Tuple[int, t.List[bool], bool]],
    table_name: str,
) -> None:
    # No filtering: the client sends only quizzes missing from played_mask, which can be old (e.g. archive) days
    time_unix_millis = round(time.time() * 1000)
    req.s.c.executemany(
        f"INSERT OR REPLACE INTO {table_name} VALUES (?, ?, ?, ?, ?)",
        [
            (
                req.user_id,
                day,
                corrects_to_bitvector(corrects),
                time_unix_millis,
                archive,
            )
            for day, corrects, archive in day_stats
        ],
    )


def store_user_stats(
    req: AuthenticatedRequest, day_stats: t.List[t.Tuple[int, t.List[bool], bool]]
) -> None:
    store_user_stats_into_table(req, day_stats, "JuxtaStatIndividualStats")


def store_user_stats_retrostat(
    req: AuthenticatedRequest, week_stats: t.List[t.Tuple[int, t.List[bool], bool]]
) -> None:
    store_user_stats_into_table(req, week_stats, "JuxtaStatIndividualStatsRetrostat")


def has_infinite_stats(
    req: AuthenticatedRequest, seeds_versions: t.List[t.Tuple[str, int]]
) -> t.List[bool]:
    req.s.c.execute(
        f"SELECT seed, version FROM JuxtaStatInfiniteStats WHERE user IN {sqlTuple(len(req.associated_user_ids))}",
        list(req.associated_user_ids),
    )
    results = set(req.s.c.fetchall())
    return [(seed, version) in results for seed, version in seeds_versions]


def store_user_stats_infinite(
    req: AuthenticatedRequest, seed: str, version: int, corrects: t.List[bool]
) -> None:
    correctBytes = corrects_to_bytes(corrects)
    time_unix_millis = round(time.time() * 1000)
    req.s.c.execute(
        "INSERT OR REPLACE INTO JuxtaStatInfiniteStats VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            req.user_id,
            seed,
            version,
            correctBytes,
            sum(corrects),
            len(corrects),
            time_unix_millis,
        ),
    )


class PerQuestionStats(BaseModel):
    total: int
    per_question: t.List[int]  # vulture: ignore -- used by the client


def get_per_question_stats_from_table(
    s: DbSession, day: int, table_name: str, column: str
) -> PerQuestionStats:
    s.c.execute(
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
    corrects = s.c.fetchall()
    corrects = [x[0] for x in corrects]
    corrects = [bitvector_to_corrects(x) for x in corrects]
    corrects = list(zip(*corrects))
    return PerQuestionStats(
        total=len(corrects[0]) if corrects else 0,
        per_question=[sum(x) for x in corrects],
    )


def get_per_question_stats(s: DbSession, day: int) -> PerQuestionStats:
    return get_per_question_stats_from_table(s, day, "JuxtaStatIndividualStats", "day")


def get_per_question_stats_retrostat(s: DbSession, week: int) -> PerQuestionStats:
    return get_per_question_stats_from_table(
        s, week, "JuxtaStatIndividualStatsRetrostat", "week"
    )
