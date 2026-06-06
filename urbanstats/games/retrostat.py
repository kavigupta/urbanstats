import json

import numpy as np
from permacache import permacache, stable_hash

from urbanstats.games.quiz import check_quiz_is_guaranteed_past
from urbanstats.games.quiz_analysis import get_full_statistics, questions

from .fixed import retrostat as fixed_up_to


from typing import Any, Dict, List, Tuple


def week_for_day(day: int) -> int:
    # 1-7 -> 1
    # 8-14 -> 2
    # 15-21 -> 3
    return (day - 1) // 7 + 1


def day_for_week(week: int) -> List[int]:
    # 1 -> 1-7
    # 2 -> 8-14
    # 3 -> 15-21
    return list(range(7 * (week - 1) + 1, 7 * week + 1))


def questions_week_for_retrostat(retrostat_week: int) -> int:
    # week 1 -> days 50-56
    return retrostat_week + 7


@permacache("urbanstats/games/retrostat/get_quiz_data_for_retroweek")
def get_quiz_data_for_retroweek(retrostat_week: int) -> List[Dict[str, Any]]:
    for day in day_for_week(questions_week_for_retrostat(retrostat_week)):
        check_quiz_is_guaranteed_past(day)
    result = get_full_statistics(after_problem=1, debug=False)
    means = result[["problem", "score", *questions]].groupby("problem").mean()
    qdata = []
    for problem in means.index:
        if week_for_day(problem) != questions_week_for_retrostat(retrostat_week):
            continue
        with open(f"stored_quizzes/juxtastat/{problem}") as f_quiz:
            quiz_qns = json.load(f_quiz)
        for qcol, q in zip(questions, quiz_qns):
            qdata.append(
                dict(
                    q=q,
                    ease=means.loc[problem, qcol],
                )
            )
    return qdata


def get_question_pair(qdata: List[Dict[str, Any]]) -> Tuple[int, int]:
    ease = [x["ease"] for x in qdata]
    for min_ease_delta in 0.4, 0.3, 0.2, 0.1:
        valid_pairs = [
            (i, j)
            for i in range(len(qdata))
            for j in range(i)
            if ease[i] - ease[j] > min_ease_delta
        ]
        if valid_pairs:
            break
    else:
        raise ValueError("No valid pairs found")

    def cost(ij: Tuple[int, int]) -> float:
        i, j = ij
        return 2 * (ease[i] - ease[j]) + abs(ease[j] - 0.25) + abs(ease[i] - 0.75)

    i, j = min(valid_pairs, key=cost)
    return i, j


@permacache("urbanstats/games/retrostat/generate_retrostat_3")
def generate_retrostat(retrostat_week: int) -> List[Dict[str, Any]]:
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
        qdata = [x for idx, x in enumerate(qdata) if idx not in [i, j]]
    return out


def generate_retrostats(folder: str) -> None:
    for retrostat_week in range(0, fixed_up_to + 1):
        with open(f"stored_quizzes/retrostat/{retrostat_week}", "r") as f_retro:
            out = json.load(f_retro)
        output_retrostat(folder, retrostat_week, out)


def output_retrostat(folder: str, retrostat_week: int, out: List[Dict[str, Any]]) -> None:
    with open(f"{folder}/{retrostat_week}", "w") as f_out:
        json.dump(out, f_out, indent=2)

