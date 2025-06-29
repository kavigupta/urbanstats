import typing as t

from ..dependencies.authenticate import AuthenticatedRequest

# pylint: disable=no-name-in-module
from . import stats
from .utils import problem_id_for_quiz_kind, table_for_quiz_kind


def friend_request(req: AuthenticatedRequest, requestee):
    req.s.c.execute(
        "INSERT INTO FriendRequests VALUES (?, ?)",
        (requestee, req.user_id),
    )


def unfriend(req: AuthenticatedRequest, requestee):
    req.s.c.execute(
        "DELETE FROM FriendRequests WHERE requestee=? AND requester=?",
        (requestee, req.user_id),
    )


def todays_score_for(req: AuthenticatedRequest, requesters, date, quiz_kind):
    """
    For each `requseter` returns the pattern of correct answers if `(requester, requestee)` is a friend pair.
    """

    return _compute_friend_results(
        req,
        requesters,
        compute_fn=lambda c, for_user: _compute_daily_score(
            date, quiz_kind, c, for_user
        ),
    )


def infinite_results(req: AuthenticatedRequest, requesters, seed, version):
    """
    For each `requseter` returns the pattern of correct answers if `(requester, requestee)` is a friend pair.
    """

    return _compute_friend_results(
        req,
        requesters,
        compute_fn=lambda c, for_user: _infinite_results(c, for_user, seed, version),
    )


def _compute_friend_results(
    req: AuthenticatedRequest, requesters: t.List[int], compute_fn
):
    # query the table to see if each pair is a friend pair

    req.s.c.execute(
        "SELECT DISTINCT requester FROM FriendRequests WHERE requestee = ?",
        (req.user_id,),
    )
    friends = req.s.c.fetchall()
    friends = {x[0] for x in friends}

    results = []
    for requester in requesters:
        if requester in friends:
            results.append(
                dict(
                    friends=True,
                    **compute_fn(req.s.c, requester),
                )
            )
        else:
            results.append(dict(friends=False))
    return results


def _compute_daily_score(date, quiz_kind, c, for_user):
    c.execute(
        (
            f"SELECT corrects FROM {table_for_quiz_kind[quiz_kind]} "
            f"WHERE user = ?"
            f"AND {problem_id_for_quiz_kind[quiz_kind]}=?"
        ),
        (for_user, date),
    )
    res = [stats.bitvector_to_corrects(row[0]) for row in c.fetchall()]
    if len(res) == 0:
        return dict(corrects=None)
    # Return the worst score
    return dict(corrects=min(res, key=lambda corrects: corrects.count(True)))


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
        maxScoreVersion=max_score_version,
    )
