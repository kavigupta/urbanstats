import numpy as np
import pandas as pd


population_column = "best_population_estimate"
stable_sort_column = "longname"


def compute_ordinals_and_percentiles(frame, key_column, *, just_ordinal):
    key_column_name = key_column
    ordering = (
        frame[[stable_sort_column, key_column_name]]
        .fillna(-float("inf"))
        .sort_values(stable_sort_column)
        .sort_values(key_column_name, ascending=False, kind="stable")
        .index
    )
    # ordinals: index -> ordinal
    ordinals = np.array(
        pd.Series(np.arange(1, frame.shape[0] + 1), index=ordering)[frame.index]
    )
    if just_ordinal:
        return ordinals, None
    total_pop = frame[population_column].sum()
    # arranged_pop: ordinal - 1 -> population
    arranged_pop = np.array(frame[population_column][ordering])
    # cum_pop: ordinal - 1 -> population of all prior
    cum_pop = np.cumsum(arranged_pop)
    # percentiles_by_population: index -> percentile
    percentiles_by_population = 1 - cum_pop[ordinals - 1] / total_pop
    return ordinals, percentiles_by_population


def add_ordinals(frame, keys, *, overall_ordinal):
    assert len(set(keys)) == len(keys)
    frame = frame.copy()
    frame = frame.reset_index(drop=True)
    for k in keys:
        ordinals, percentiles_by_population = compute_ordinals_and_percentiles(
            frame, k, just_ordinal=overall_ordinal
        )
        frame[k, "overall_ordinal" if overall_ordinal else "ordinal"] = ordinals
        if overall_ordinal:
            continue
        frame[k, "total"] = frame[k].shape[0]
        frame[k, "percentile_by_population"] = percentiles_by_population
    return frame
