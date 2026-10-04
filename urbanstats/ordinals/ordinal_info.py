from dataclasses import dataclass
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from cached_property import cached_property
from permacache import permacache, stable_hash
from scipy.sparse import csc_matrix

from urbanstats.compatibility.compatibility import forget_loaded_values
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names
from urbanstats.universe.universe_list import all_universes


@dataclass
class OrdinalInfoForColumn:
    ordinal: csc_matrix
    percentile: csc_matrix
    values: csc_matrix
    counts: (
        np.ndarray
    )  # number of non-NaN values per universe-type, length len(universe_type)


@dataclass
class CompactOrdinalInfoForColumn:
    """
    An OrdinalInfoForColumn whose matrices share the sparsity pattern of the universe type masks.
    ordinal has exactly that pattern, and percentile a subset of it, stored with 0 where it has no
    entry, which is what indexing it returned there anyway. values is per row, being the same in
    every universe type.
    """

    pattern: csc_matrix
    ordinal_data: np.ndarray
    percentile_data: np.ndarray
    values_by_row: np.ndarray
    counts: np.ndarray

    @classmethod
    def compact(
        cls, info: OrdinalInfoForColumn, pattern: csc_matrix, pattern_keys: np.ndarray
    ) -> "CompactOrdinalInfoForColumn":
        for m in (info.ordinal, info.values):
            assert np.array_equal(m.indptr, pattern.indptr)
            assert np.array_equal(m.indices, pattern.indices)
        percentile_keys = _entry_keys(info.percentile)
        positions = np.searchsorted(pattern_keys, percentile_keys)
        assert np.array_equal(pattern_keys[positions], percentile_keys)
        percentile_data = np.zeros(pattern.nnz, dtype=info.percentile.dtype)
        percentile_data[positions] = info.percentile.data
        values_by_row = np.full(pattern.shape[0], np.nan, dtype=info.values.dtype)
        np.put(values_by_row, pattern.indices, info.values.data)
        return cls(
            pattern, info.ordinal.data, percentile_data, values_by_row, info.counts
        )

    def _with_data(self, data: np.ndarray) -> csc_matrix:
        return csc_matrix(
            (data, self.pattern.indices, self.pattern.indptr),
            shape=self.pattern.shape,
            copy=False,
        )

    @property
    def ordinal(self) -> csc_matrix:
        return self._with_data(self.ordinal_data)

    @property
    def percentile(self) -> csc_matrix:
        return self._with_data(self.percentile_data)


def _entry_keys(m: csc_matrix) -> np.ndarray:
    """col * num_rows + row for each stored entry, in storage order."""
    cols = np.repeat(np.arange(m.shape[1], dtype=np.int64), np.diff(m.indptr))
    return cols * m.shape[0] + m.indices


@dataclass
class OrdinalInfo:
    universe_type: List[Tuple[str, str]]
    universe_type_to_idx: Dict[Tuple[str, str], int]
    universe_type_masks: csc_matrix
    by_column: Dict[str, CompactOrdinalInfoForColumn]
    index_order: np.ndarray
    longnames: np.ndarray

    @cached_property
    def longname_to_idx(self) -> Dict[str, int]:
        return {name: idx for idx, name in enumerate(self.longnames)}

    @property
    def types(self) -> List[str]:
        return sorted({t for _, t in self.universe_type})

    def compute_ordinals(self, universe: str, typ: str, col: str) -> np.ndarray:
        idx = self.universe_type_to_idx[universe, typ]
        mask = self.universe_type_masks[:, idx]
        # ordinals selected: alphabetical index within ut -> ordinal
        ordinals_selected = np.array(self.by_column[col].ordinal[:, idx][mask])[0]
        # index order: alphabetical index within ut -> index in `full`
        index_order = np.array(self.index_order[mask.toarray()[:, 0]])
        # reindex: index in `full[filter for ut]` -> alphabetical index within ut
        reindex = np.argsort(index_order)
        # result: index in `full[filter for ut]` -> ordinal
        result = ordinals_selected[reindex]
        # return: ordinal -> index in `full[filter for ut]`
        return np.argsort(result)

    def compute_values_and_percentiles(
        self, universe: str, typ: str, col: str
    ) -> np.ndarray:
        idx = self.universe_type_to_idx[universe, typ]
        mask = self.universe_type_masks[:, idx]
        # values selected: alphabetical index within ut -> value
        values_selected = self.by_column[col].values_by_row[mask.indices]
        # reindex: index in `full[filter for ut]` -> alphabetical index within ut
        index_order = np.array(self.index_order[mask.toarray()[:, 0]])
        reordering = np.argsort(index_order)
        return values_selected[reordering]

    def counts_by_typ_universe(self, col: str) -> Dict[Tuple[str, str], int]:
        return dict(zip(self.universe_type, self.by_column[col].counts))

    def counts_by_type_universe_col(self) -> Dict[str, Dict[Tuple[str, str], int]]:
        return {
            col: self.counts_by_typ_universe(col) for col in tqdm.tqdm(self.by_column)
        }

    def ordered_names(self, universe: str, typ: str) -> List[str]:
        mask = self.universe_type_masks[:, self.universe_type_to_idx[universe, typ]]
        indices = mask.indices
        ordering = np.argsort(self.index_order[indices])
        return np.array(self.longnames[indices])[ordering].tolist()

    def percentiles_by_universe(self, typ: str, column: str) -> List[np.ndarray]:
        all_u = all_universes()
        relevant_universes = sorted(
            {u for u, t in self.universe_type if t == typ and u in all_u},
            key=all_u.index,
        )
        ut_idxs = [self.universe_type_to_idx[u, typ] for u in relevant_universes]
        utm = self.universe_type_masks[:, ut_idxs]
        mask_inhabited = np.array(utm.sum(1) > 0)[:, 0]
        utm = utm[mask_inhabited]
        percentiles = self.by_column[column].percentile[:, ut_idxs][mask_inhabited]
        percentiles_flat = np.array(percentiles[utm])[0]
        counts_each = np.array(utm.sum(1))[:, 0]
        percentiles_jagged = np.split(percentiles_flat, np.cumsum(counts_each)[:-1])

        index_order = np.array(self.index_order[mask_inhabited])
        reindex = np.argsort(index_order)
        # pylint: disable=not-an-iterable
        percentiles_jagged_reordered = [percentiles_jagged[i] for i in reindex]
        return percentiles_jagged_reordered


def type_matches(table_type: Sequence[str], t: str) -> np.ndarray:
    if t == "overall":
        return np.ones(len(table_type), dtype=np.bool_)
    return np.array(table_type) == t


@permacache(
    "urbanstats/ordinals/ordinal_info/compute_universe_type_masks",
    key_function=dict(
        table=lambda table: stable_hash((table.universes, table.type)),
        universe_type=stable_hash,
    ),
)
def compute_universe_type_masks(
    table: Any, universe_type: List[Tuple[str, str]]
) -> csc_matrix:
    """
    Computes a mask for each universe type in the universe_type list.

    The mask is a csc_matrix with shape (table.shape[0], len(universe_type))
    Satisfying mask[i, j] == table.iloc[i].type == universe_type[j][1] and
    universe_type[j][0] in table.iloc[i].universes
    """
    universe_type_mask = csc_matrix(
        (table.shape[0], len(universe_type)), dtype=np.bool_
    )
    idxs_by_type = {
        t: np.where(type_matches(table.type, t))[0]
        for t in {t for _, t in universe_type}
    }
    for i, (u, t) in enumerate(tqdm.tqdm(universe_type)):
        idxs_for_t = idxs_by_type[t]
        mask_within_idxs = table.iloc[idxs_for_t].universes.apply(
            lambda us, u=u: u in us
        )
        idxs_relevant = idxs_for_t[mask_within_idxs]
        universe_type_mask[idxs_relevant, i] = 1
    return universe_type_mask


@permacache(
    "urbanstats/ordinals/ordinal_info/compute_ordinal_info_13",
    key_function=dict(
        universe_type_masks=lambda universe_type_masks: stable_hash(
            (universe_type_masks.indices, universe_type_masks.shape)
        ),
        universe_typ=stable_hash,
        table=lambda table: stable_hash(table.to_numpy()),
        stat_col=stable_hash,
    ),
)
def compute_ordinal_info(
    universe_type_masks: csc_matrix,
    universe_typ: List[Tuple[str, str]],
    table: Any,
    stat_col: str,
) -> OrdinalInfoForColumn:
    # pylint: disable=too-many-locals
    table_sorted = sort_by_column(table, stat_col)
    ordinal, percentile, values = [[] for _ in range(3)]
    counts_per_ut = []
    universe_type_masks_permuted = universe_type_masks[table_sorted.index]
    for ut_idx in range(len(universe_typ)):
        mask = universe_type_masks_permuted[:, ut_idx].indices
        mask.sort()
        filt_table = table_sorted.iloc[mask]

        ut_idx_arr = np.zeros(len(filt_table), dtype=np.int64) + ut_idx
        values.append((filt_table.index, ut_idx_arr, filt_table[stat_col]))
        ordinal.append((filt_table.index, ut_idx_arr, np.arange(len(filt_table))))

        # Remove NaN values from the filtered table to compute percentiles
        # We do not do this for other values, to preserve stability of sorting etc
        non_nan = ~np.isnan(filt_table[stat_col].array)
        counts_per_ut.append(np.sum(non_nan))
        filt_table_non_nan = filt_table.iloc[non_nan]
        ut_idx_arr_non_nan = ut_idx_arr[non_nan]

        cum_pop = np.cumsum(filt_table_non_nan.best_population_estimate.array[::-1])[
            ::-1
        ]
        if cum_pop.size > 0:
            cum_pop /= cum_pop[0]

        cum_pop *= 100
        cum_pop_uint8 = cum_pop.astype(np.uint8)

        percentile.append(
            (filt_table_non_nan.index[:-1], ut_idx_arr_non_nan[1:], cum_pop_uint8[1:])
        )
    ordinal_res, percentile_res, values_res = [
        to_csc_matrix(
            arr, dtype=dtype, shape=(table_sorted.shape[0], len(universe_typ))
        )
        for arr, dtype in zip(
            [ordinal, percentile, values], [np.int32, np.uint8, np.float32]
        )
    ]
    counts = np.array(counts_per_ut, dtype=np.int64)
    return OrdinalInfoForColumn(ordinal_res, percentile_res, values_res, counts)


def fully_complete_ordinals(
    sorted_by_name: Any, universe_typ: List[Tuple[str, str]]
) -> OrdinalInfo:
    universe_type_masks = compute_universe_type_masks(sorted_by_name, universe_typ)
    pattern_keys = _entry_keys(universe_type_masks)

    def load(stat_col: str) -> CompactOrdinalInfoForColumn:
        info = compute_ordinal_info(
            universe_type_masks,
            universe_typ,
            pd.DataFrame(
                {
                    stat_col: sorted_by_name[stat_col],
                    "best_population_estimate": sorted_by_name.best_population_estimate,
                }
            ),
            stat_col,
        )
        forget_loaded_values(compute_ordinal_info)
        return CompactOrdinalInfoForColumn.compact(
            info, universe_type_masks, pattern_keys
        )

    return OrdinalInfo(
        universe_typ,
        {ut: i for i, ut in enumerate(universe_typ)},
        universe_type_masks,
        {
            stat_col: load(stat_col)
            for stat_col in tqdm.tqdm(internal_statistic_names())
        },
        sorted_by_name.index_order,
        sorted_by_name.longname,
    )


def sort_by_column(sorted_by_name: Any, stat_col: str) -> Any:
    relevant = pd.DataFrame(
        {
            stat_col: sorted_by_name[stat_col],
            "best_population_estimate": sorted_by_name.best_population_estimate,
        }
    )
    selected_and_sorted = relevant.loc[
        np.argsort(np.array(sorted_by_name[stat_col]), kind="stable")
    ]
    [nan_idxs] = np.where(np.isnan(np.array(selected_and_sorted[stat_col])))
    if nan_idxs.size:
        first_nan_idx = nan_idxs[0]
        selected_and_sorted = pd.concat(
            [
                selected_and_sorted[first_nan_idx:],
                selected_and_sorted[:first_nan_idx],
            ]
        )
    selected_and_sorted = selected_and_sorted[::-1]
    return selected_and_sorted


def to_csc_matrix(
    arr: List[Tuple[np.ndarray, np.ndarray, np.ndarray]],
    dtype: Any,
    shape: Tuple[int, int],
) -> csc_matrix:
    row_idxs, col_idxs, data = [np.concatenate(x) for x in zip(*arr)]
    return csc_matrix((data, (row_idxs, col_idxs)), dtype=dtype, shape=shape)
