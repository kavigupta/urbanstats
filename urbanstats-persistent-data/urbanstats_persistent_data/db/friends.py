import sqlite3
import typing as t

from pydantic import BaseModel

from ..dependencies.authenticate import AuthenticatedRequest

# pylint: disable=no-name-in-module
from . import email, stats
from .utils import QuizKind, problem_id_for_quiz_kind, sqlTuple, table_for_quiz_kind


def friend_request(req: AuthenticatedRequest, requestee: int | str) -> None:
    req.s.c.execute(
        "INSERT INTO FriendRequests VALUES (?, ?)",
        (requestee, req.user_id),
    )


def unfriend(req: AuthenticatedRequest, requestee: int | str) -> None:
    req.s.c.execute(
        "DELETE FROM FriendRequests WHERE requestee=? AND requester=?",
        (requestee, req.user_id),
    )


class NegativeResult(BaseModel):
    friends: t.Literal[False]


class PositiveResult(BaseModel):
    friends: t.Literal[True]


class Corrects(PositiveResult):
    corrects: None | t.List[bool]


class InfiniteResult(PositiveResult):
    forThisSeed: t.Optional[int]
    maxScore: t.Optional[int]
    maxScoreSeed: t.Optional[str]
    maxScoreVersion: t.Optional[int]


def todays_score_for(
    req: AuthenticatedRequest,
    requesters: t.List[int | str],
    date: int,
    quiz_kind: QuizKind,
) -> t.List[NegativeResult | Corrects]:
    """
    For each `requseter` returns the pattern of correct answers if `(requester, requestee)` is a friend pair.
    """

    return _compute_friend_results(
        req,
        requesters,
        compute_fn=lambda c, for_users: _compute_daily_score(
            date, quiz_kind, c, for_users
        ),
    )


def infinite_results(
    req: AuthenticatedRequest, requesters: t.List[int | str], seed: str, version: int
) -> t.List[NegativeResult | InfiniteResult]:
    """
    For each `requseter` returns the pattern of correct answers if `(requester, requestee)` is a friend pair.
    """

    return _compute_friend_results(
        req,
        requesters,
        compute_fn=lambda c, for_users: _infinite_results(c, for_users, seed, version),
    )


Result = t.TypeVar("Result", Corrects, InfiniteResult)


def _compute_friend_results(
    req: AuthenticatedRequest,
    requesters: t.List[int | str],
    compute_fn: t.Callable[[sqlite3.Cursor, t.Set[int]], Result],
) -> t.List[NegativeResult | Result]:
    # query the table to see if each pair is a friend pair

    req.s.c.execute(
        f"SELECT DISTINCT requester FROM FriendRequests WHERE requestee IN {sqlTuple(len(req.associated_user_ids))}",
        list(req.associated_user_ids),
    )
    friends: t.Set[int] = {
        friend
        for x in req.s.c.fetchall()
        for friend in email.get_email_or_user_users(req.s.c, x[0])
    }

    results: t.List[NegativeResult | Result] = []
    for requester in requesters:
        associated_requesters = email.get_email_or_user_users(req.s.c, requester)
        if len(associated_requesters & friends) > 0:
            results.append(compute_fn(req.s.c, associated_requesters))
        else:
            results.append(NegativeResult(friends=False))
    return results


def _compute_daily_score(
    date: int, quiz_kind: QuizKind, c: sqlite3.Cursor, for_users: t.Set[int]
) -> Corrects:
    c.execute(
        (
            f"SELECT corrects FROM {table_for_quiz_kind[quiz_kind]} "
            f"WHERE user IN {sqlTuple(len(for_users))} "
            f"AND {problem_id_for_quiz_kind[quiz_kind]}=?"
        ),
        list(for_users) + [date],
    )
    res = [stats.bitvector_to_corrects(row[0]) for row in c.fetchall()]
    if len(res) == 0:
        return Corrects(friends=True, corrects=None)
    # Return the worst score
    return Corrects(
        friends=True, corrects=min(res, key=lambda corrects: corrects.count(True))
    )


def _infinite_results(
    c: sqlite3.Cursor, for_users: t.Set[int], seed: str, version: int
) -> InfiniteResult:
    """
    Returns the result for the given user for the given seed and version, as well
    as the maximum score and corresponding seed and version.
    """

    c.execute(
        f"SELECT score FROM JuxtaStatInfiniteStats WHERE user IN {sqlTuple(len(for_users))} AND seed=? AND version=?",
        list(for_users) + [seed, version],
    )
    res = c.fetchone()
    for_this_seed = None if res is None else res[0]

    c.execute(
        f"SELECT seed, version, score FROM JuxtaStatInfiniteStats WHERE user IN {sqlTuple(len(for_users))} "
        f"AND score=(SELECT MAX(score) FROM JuxtaStatInfiniteStats WHERE user IN {sqlTuple(len(for_users))})",
        list(for_users) + list(for_users),
    )
    res = c.fetchone()
    max_score_seed = None if res is None else res[0]
    max_score_version = None if res is None else res[1]
    max_score = None if res is None else res[2]

    return InfiniteResult(
        friends=True,
        forThisSeed=for_this_seed,
        maxScore=max_score,
        maxScoreSeed=max_score_seed,
        maxScoreVersion=max_score_version,
    )
