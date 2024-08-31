import re
from collections import Counter

import numpy as np
import pandas as pd


def tag_international_duplicates(intl):
    intl = intl.copy()
    intl.longname = intl.longname.apply(lambda x: x + " [SN]" if "USA" in x else x)
    return intl


def isnan(x):
    return isinstance(x, (float, np.float32, np.float64)) and np.isnan(x)


def merge_international_row(row_international, row_domestic):
    for col in row_international.index:
        if col in [
            "longname",
            "area",
            "compactness",
            "type",
            "source",
            "perimiter",
            "type_category",
        ]:
            continue
        if isnan(row_domestic[col]):
            continue
        if isnan(row_international[col]) or col in [
            "universes",
            "best_population_estimate",
        ]:
            row_international[col] = row_domestic[col]
            continue
        if row_international[col] == row_domestic[col]:
            continue
        assert (
            row_international[col] != row_international[col]
        ), f"{row_international.longname} {col} {row_international[col]} {row_domestic[col]}"
    return row_international


def merge_international(table):
    full_longname_to_idx = {name: idx for name, idx in zip(table.longname, table.index)}
    intl_mask = table.longname.apply(lambda x: "[SN]" in x)
    indices_to_remove = set()
    additional_rows = []
    for idx_intl, row_international in table[intl_mask].iterrows():
        domestic_name = row_international.longname.replace(" [SN]", "")
        if domestic_name in full_longname_to_idx:
            domestic_idx = full_longname_to_idx[domestic_name]
            row_international = merge_international_row(
                row_international, table.loc[domestic_idx]
            )
            indices_to_remove.add(domestic_idx)
        indices_to_remove.add(idx_intl)
        additional_rows.append(row_international)
    table = table[[idx not in indices_to_remove for idx in table.index]]
    table = pd.concat([table, pd.DataFrame(additional_rows)])
    table.longname = table.longname.apply(lambda x: x.replace(" [SN]", ""))
    table = table.reset_index(drop=True)
    return table


def merge_international_and_domestic(intl, usa):
    intl = tag_international_duplicates(intl)
    full = pd.concat([usa, intl]).reset_index(drop=True)
    full = merge_international(full)
    del full["type_category"]
    popu = np.array(full.population)
    popu[np.isnan(popu)] = full.gpw_population[np.isnan(popu)]
    full["best_population_estimate"] = popu
    full = full.sort_values("longname")
    full = full.sort_values("best_population_estimate", ascending=False, kind="stable")
    counted = Counter(full.longname)
    duplicates = [name for name, count in counted.items() if count > 1]
    assert not duplicates, f"Duplicate names: {duplicates}"
    return full
