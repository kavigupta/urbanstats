import pandas as pd
from permacache import stable_hash
from collections import defaultdict


def collapse_unchanged(table, identity_columns, *, overlap_threshold=1e-4):
    assert set(table) == set(identity_columns) | {"start_date", "end_date", "geometry"}
    identity = table[list(identity_columns)].T.apply(lambda x: stable_hash(tuple(x)))
    identity_to_indices = defaultdict(list)
    for idx, ident in zip(identity.index, identity):
        identity_to_indices[ident].append(idx)
    identity_to_indices = {k: v for k, v in identity_to_indices.items() if len(v) > 1}
    duplicate_chunks = list(identity_to_indices.values())
    updated = []
    for chunk in duplicate_chunks:
        chunk = table.iloc[chunk].sort_values("start_date").index
        rows = [table.iloc[chunk[0]].copy()]
        for new_idx in chunk[1:]:
            prev_row = rows[-1]
            current_row = table.iloc[new_idx]
            if not mergable(current_row, prev_row, overlap_threshold):
                rows.append(table.iloc[new_idx].copy())
                continue
            prev_row.end_date = current_row.end_date
        updated.append(pd.DataFrame(rows))
    remove = {idx for chunk in duplicate_chunks for idx in chunk}
    table_updated = table.loc[[idx for idx in table.index if idx not in remove]]
    table_updated = pd.concat([table_updated] + updated)
    table_updated = table_updated.reset_index(drop=True)
    return table_updated


def mergable(current_row, prev_row, overlap_threshold):
    assert current_row.start_date > prev_row.end_date
    if current_row.start_date > 1 + prev_row.end_date:
        return False
    delta = 1 - prev_row.geometry.intersection(current_row.geometry).area / min(
        prev_row.geometry.area, current_row.geometry.area
    )
    return delta < overlap_threshold
