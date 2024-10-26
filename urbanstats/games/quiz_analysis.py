import os

import numpy as np
import pandas as pd
import requests

from urbanstats.games.quiz import quiz_is_guaranteed_past

questions = [f"q{i}" for i in range(1, 1 + 5)]

named_users = dict(
    vo=1000233398257748901,
    avery=1027246234047181785,
    kavi=225074120239201340,
    guava=533487794723891791,
    parth=232188494395851367,
    #     gus=65416843712317322,
    adiastra=727538863697858149,
    ellie=691958428450574907,
    sleepy=19800660824996662,
    antifa=1128140214864259863,
    #     ashjubilee=846814263642105530,
    april=0x1D2EFE90871F22B,
    violetncs=0x523FF09C66F52F4,
)


def get_full_statistics(*, after_problem, debug=False):
    with open(os.path.expanduser("~/.juxtastat-persistent-token")) as f:
        token = f.read().strip()
    response = requests.post(
        "https://persistent.urbanstats.org/juxtastat/get_full_database",
        data=dict(token=token),
    )
    result = response.json()
    result = pd.DataFrame(
        result, columns=["user_id", "host", "problem", "pattern", "time"]
    )
    time_problem = result[["time", "problem"]]
    time_problem = time_problem[time_problem.time == time_problem.time]
    result["last_in_batch"] = 0
    result.loc[
        time_problem.sort_values("problem").drop_duplicates("time", keep="last").index,
        "last_in_batch",
    ] = 1
    result.pattern = result.pattern.apply(
        lambda x: np.array([x // 2**i % 2 for i in range(5)])
    )
    for i, q in enumerate(questions):
        result[q] = result.pattern.apply(lambda x: x[i])
    result["score"] = result.pattern.apply(sum)
    # time in ms to datetime in Eastern time
    result.time = (
        pd.to_datetime(result.time, unit="ms")
        .dt.tz_localize("UTC")
        .dt.tz_convert("US/Eastern")
    )
    # subtract off day. day 49 is 2023-10-21
    result["date_challenge"] = result.problem.apply(
        lambda x: pd.Timedelta(x - 49, "d")
        + pd.Timestamp("2023-10-21", tz="US/Eastern")
    )
    result["offset"] = (result.time - result.date_challenge).dt.total_seconds() / 3600
    result = result[result.problem >= after_problem]
    if debug:
        result = result[result.host == "localhost"]
    else:
        result = result[result.host == "urbanstats.org"]
    result = result.copy().reset_index(drop=True)
    return result


def get_dau(after_problem=49, radius=14):
    result = get_full_statistics(after_problem=after_problem, debug=False)
    num_users_by_problem = result.groupby("problem").count().user_id
    is_valid_day = lambda x: quiz_is_guaranteed_past(x) is None and x > after_problem
    mask = [is_valid_day(x) for x in num_users_by_problem.index]
    xs, ys = num_users_by_problem.index[mask], num_users_by_problem[mask]
    ys_rolling = [ys[(x - radius <= xs) & (xs <= x + radius)].median() for x in xs]
    return xs, ys, ys_rolling
