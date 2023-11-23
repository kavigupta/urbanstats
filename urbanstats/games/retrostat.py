import json
import numpy as np
from permacache import permacache, stable_hash

from urbanstats.games.quiz import check_quiz_is_guaranteed_past
from urbanstats.games.quiz_analysis import get_full_statistics, questions


def week_for_day(day):
    # 1-7 -> 1
    # 8-14 -> 2
    # 15-21 -> 3
    return (day - 1) // 7 + 1


def day_for_week(week):
    # 1 -> 1-7
    # 2 -> 8-14
    # 3 -> 15-21
    return list(range(7 * (week - 1) + 1, 7 * week + 1))


def questions_week_for_retrostat(retrostat_week):
    # week 1 -> days 50-56
    return retrostat_week + 7


@permacache("urbanstats/games/retrostat/get_quiz_data_for_retroweek")
def get_quiz_data_for_retroweek(retrostat_week):
    for day in day_for_week(questions_week_for_retrostat(retrostat_week)):
        check_quiz_is_guaranteed_past(day)
    result = get_full_statistics(after_problem=1, debug=False)
    means = result[["problem", "score", *questions]].groupby("problem").mean()
    qdata = []
    for problem in means.index:
        if week_for_day(problem) != questions_week_for_retrostat(retrostat_week):
            continue
        with open(f"quiz_old/{problem}") as f:
            quiz_qns = json.load(f)
        for qcol, q in zip(questions, quiz_qns):
            qdata.append(
                dict(
                    q=q,
                    ease=means.loc[problem, qcol],
                )
            )
    return qdata


def get_question_pair(qdata):
    ease = [x["ease"] for x in qdata]
    valid_pairs = [
        (i, j) for i in range(len(qdata)) for j in range(i) if ease[i] - ease[j] > 0.4
    ]

    def cost(ij):
        i, j = ij
        return 2 * (ease[i] - ease[j]) + abs(ease[j] - 0.25) + abs(ease[i] - 0.75)

    i, j = min(valid_pairs, key=cost)
    return i, j


@permacache("urbanstats/games/retrostat/generate_retrostat_2")
def generate_retrostat(retrostat_week):
    rng = np.random.RandomState(
        int(stable_hash(("retrostat_weekly", retrostat_week)), 16) % 2**32
    )
    qdata = get_quiz_data_for_retroweek(retrostat_week)
    qdata = sorted(qdata, key=lambda x: x["ease"])
    out = []
    for _ in range(5):
        i, j = get_question_pair(qdata)
        if rng.rand() < 0.5:
            i, j = j, i
        out.append(
            {
                "type": "retrostat",
                "a": qdata[i]["q"],
                "b": qdata[j]["q"],
                "a_ease": qdata[i]["ease"],
                "b_ease": qdata[j]["ease"],
            }
        )
        qdata = [x for idx, x in enumerate(qdata) if idx != i and idx != j]
    return out
