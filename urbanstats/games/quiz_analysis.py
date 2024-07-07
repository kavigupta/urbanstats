import os

import numpy as np
import pandas as pd
import requests

questions = [f"q{i}" for i in range(1, 1 + 5)]


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
