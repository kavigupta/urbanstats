from collections import defaultdict

import pandas as pd
from permacache import stable_hash


def collapse_unchanged(
    table: pd.DataFrame,
    identity_columns: list[str],
    *,
    overlap_threshold: float = 1e-4,
) -> pd.DataFrame:
    assert set(table) == set(identity_columns) | {"start_date", "end_date", "geometry"}
    identity = table[list(identity_columns)].T.apply(lambda x: stable_hash(tuple(x)))
    identity_to_indices: defaultdict[str, list[int]] = defaultdict(list)
    for idx, ident in zip(identity.index, identity):
        identity_to_indices[ident].append(idx)
    duplicate_identity_to_indices = {
        k: v for k, v in identity_to_indices.items() if len(v) > 1
    }
    duplicate_chunks = list(duplicate_identity_to_indices.values())
    updated = []
    for chunk in duplicate_chunks:
        sorted_index = table.iloc[chunk].sort_values("start_date").index
        rows = _collapse_unchanged_chunk(
            table, sorted_index.tolist(), overlap_threshold=overlap_threshold
        )
        updated.append(rows)
    remove = {idx for chunk in duplicate_chunks for idx in chunk}
    table_updated = table.loc[[idx for idx in table.index if idx not in remove]]
    table_updated = pd.concat([table_updated] + updated)
    table_updated = table_updated.reset_index(drop=True)
    return table_updated


def _collapse_unchanged_chunk(
    table: pd.DataFrame,
    indices: list[int],
    *,
    overlap_threshold: float,
) -> pd.DataFrame:
    rows = [table.iloc[indices[0]].copy()]
    for new_idx in indices[1:]:
        prev_row = rows[-1]
        current_row = table.iloc[new_idx]
        if not mergable(current_row, prev_row, overlap_threshold):
            rows.append(table.iloc[new_idx].copy())
            continue
        prev_row.end_date = current_row.end_date
    rows = pd.DataFrame(rows)
    return rows


def mergable(
    current_row: pd.Series,
    prev_row: pd.Series,
    overlap_threshold: float,
) -> bool:
    assert current_row.start_date > prev_row.end_date
    if current_row.start_date > 1 + prev_row.end_date:
        return False
    delta = 1 - prev_row.geometry.intersection(current_row.geometry).area / max(
        prev_row.geometry.area, current_row.geometry.area
    )
    return bool(delta < overlap_threshold)
