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
        (requestee, req.email or req.user_id),
    )


def unfriend(req: AuthenticatedRequest, requestee: int | str) -> None:
    req.s.c.execute(
        "DELETE FROM FriendRequests WHERE requestee=? AND requester IN (?, ?)",
        (requestee, req.email, req.user_id),
    )


class NegativeResult(BaseModel):
    friends: t.Literal[False]


class PositiveResult(BaseModel):
    friends: t.Literal[True]


class Corrects(PositiveResult):
    corrects: None | t.List[bool]


class InfiniteResult(PositiveResult):
    forThisSeed: t.Optional[int]  # vulture: ignore -- used by the client
    maxScore: t.Optional[int]  # vulture: ignore -- used by the client
    maxScoreSeed: t.Optional[str]  # vulture: ignore -- used by the client
    maxScoreVersion: t.Optional[int]  # vulture: ignore -- used by the client


class FriendSummaryStats(PositiveResult):
    meanScore: float  # vulture: ignore -- used by the client
    numPlays: int  # vulture: ignore -- used by the client
    currentStreak: int  # vulture: ignore -- used by the client
    maxStreak: int  # vulture: ignore -- used by the client


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


Result = t.TypeVar("Result", Corrects, InfiniteResult, FriendSummaryStats)


def _compute_friend_results(
    req: AuthenticatedRequest,
    requesters: t.List[int | str],
    compute_fn: t.Callable[[sqlite3.Cursor, t.Set[int]], Result],
) -> t.List[NegativeResult | Result]:
    # query the table to see if each pair is a friend pair
    requestees = req.associated_user_ids | ({req.email} if req.email else set[str]())

    req.s.c.execute(
        f"SELECT DISTINCT requester FROM FriendRequests WHERE requestee IN {sqlTuple(len(requestees))}",
        list(requestees),
    )
    friends = {
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


def friend_summary_stats(
    req: AuthenticatedRequest,
    requesters: t.List[int | str],
    quiz_kind: QuizKind,
) -> t.List[NegativeResult | FriendSummaryStats]:
    """
    For each `requester` returns summary statistics (mean score, # plays, current/max streak)
    if `(requester, requestee)` is a friend pair.
    """
    return _compute_friend_results(
        req,
        requesters,
        compute_fn=lambda c, for_users: _compute_summary_stats(quiz_kind, c, for_users),
    )


def _compute_summary_stats(
    quiz_kind: QuizKind, c: sqlite3.Cursor, for_users: t.Set[int]
) -> FriendSummaryStats:
    """
    Calculate mean score, number of plays, current streak, and max streak for a friend.
    """
    table = table_for_quiz_kind[quiz_kind]
    problem_column = problem_id_for_quiz_kind[quiz_kind]

    # Get all stats for this user, ordered by day/week
    c.execute(
        (
            f"SELECT {problem_column}, corrects FROM {table} "
            f"WHERE user IN {sqlTuple(len(for_users))} "
            f"ORDER BY {problem_column} ASC"
        ),
        list(for_users),
    )
    rows = c.fetchall()

    if len(rows) == 0:
        return FriendSummaryStats(
            friends=True,
            meanScore=0.0,
            numPlays=0,
            currentStreak=0,
            maxStreak=0,
        )

    # Convert to scores (number of correct answers) and track problem identifiers
    scores, problem_ids = extract_scores_and_problem_ids(quiz_kind, rows)

    # Calculate statistics
    num_plays = len(scores)
    mean_score = sum(scores) / num_plays if num_plays > 0 else 0.0

    max_streak, current_streak = compute_streaks(scores, problem_ids)

    return FriendSummaryStats(
        friends=True,
        meanScore=round(mean_score, 2),
        numPlays=num_plays,
        currentStreak=current_streak,
        maxStreak=max_streak,
    )


def compute_streaks(scores: list[int], problem_ids: list[int]) -> tuple[int, int]:
    # Calculate streaks (3+ required, missing games break the streak)
    max_streaks = [0] * len(scores)
    # pylint: disable=consider-using-enumerate
    for i in range(len(scores)):
        if scores[i] >= 3:
            if i > 0 and problem_ids[i] - problem_ids[i - 1] == 1:
                max_streaks[i] = max_streaks[i - 1] + 1
            else:
                max_streaks[i] = 1
        else:
            max_streaks[i] = 0
    max_streak = max(max_streaks) if max_streaks else 0
    current_streak = max_streaks[-1] if max_streaks else 0
    return max_streak, current_streak


def extract_scores_and_problem_ids(
    quiz_kind: QuizKind, rows: list[tuple[str, int]]
) -> tuple[list[int], list[int]]:
    scores = []
    problem_ids = []
    for row in rows:
        problem_id = row[0]
        assert isinstance(problem_id, int)
        corrects = stats.bitvector_to_corrects(row[1])
        score = sum(1 for c in corrects if c)
        scores.append(score)
        if quiz_kind == "juxtastat":
            problem_ids.append(problem_id)
        else:
            assert quiz_kind == "retrostat"
            problem_ids.append(problem_id)

    problem_ids, scores = zip(*sorted(zip(problem_ids, scores)))  # type: ignore
    return scores, problem_ids
