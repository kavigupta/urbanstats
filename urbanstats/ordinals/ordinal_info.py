from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from cached_property import cached_property
from permacache import permacache, stable_hash
from scipy.sparse import csc_matrix

from urbanstats.statistics.output_statistics_metadata import internal_statistic_names
from urbanstats.universe.universe_list import all_universes


@dataclass
class OrdinalInfoForColumn:
    ordinal: csc_matrix
    percentile: csc_matrix
    values: csc_matrix
    counts: np.ndarray  # number of non-NaN values per universe-type, length len(universe_type)


@dataclass
class OrdinalInfo:
    universe_type: List[Tuple[str, str]]
    universe_type_to_idx: Dict[Tuple[str, str], int]
    universe_type_masks: csc_matrix
    by_column: Dict[str, OrdinalInfoForColumn]
    index_order: np.ndarray
    longnames: np.ndarray

    @cached_property
    def longname_to_idx(self):
        return {name: idx for idx, name in enumerate(self.longnames)}

    @property
    def types(self):
        return sorted({t for _, t in self.universe_type})

    def compute_ordinals(self, universe, typ, col):
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

    def compute_values_and_percentiles(self, universe, typ, col):
        idx = self.universe_type_to_idx[universe, typ]
        mask = self.universe_type_masks[:, idx]
        # values selected: alphabetical index within ut -> value
        values_selected = np.array(self.by_column[col].values[:, idx][mask])[0]
        # reindex: index in `full[filter for ut]` -> alphabetical index within ut
        index_order = np.array(self.index_order[mask.toarray()[:, 0]])
        reordering = np.argsort(index_order)
        return values_selected[reordering]

    def counts_by_typ_universe(self, col):
        return dict(zip(self.universe_type, self.by_column[col].counts))

    def counts_by_type_universe_col(self):
        return {
            col: self.counts_by_typ_universe(col) for col in tqdm.tqdm(self.by_column)
        }

    def ordered_names(self, universe, typ):
        mask = self.universe_type_masks[:, self.universe_type_to_idx[universe, typ]]
        indices = mask.indices
        ordering = np.argsort(self.index_order.iloc[indices])
        return np.array(self.longnames.iloc[indices])[ordering].tolist()

    def percentiles_by_universe(self, typ, column):
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
        percentiles_jagged = [percentiles_jagged[i] for i in reindex]
        return percentiles_jagged


def type_matches(table_type, t):
    if t == "overall":
        return np.ones(len(table_type), dtype=np.bool_)
    return table_type == t


@permacache(
    "urbanstats/ordinals/ordinal_info/compute_universe_type_masks",
    key_function=dict(
        table=lambda table: stable_hash((table.universes, table.type)),
        universe_type=stable_hash,
    ),
)
def compute_universe_type_masks(table, universe_type):
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


# def compute_ordinal_info(universe_type_masks, universe_typ, sorted_by_col):
#     table, stat_col = sorted_by_col
#     ordinal, percentile, values = [
#         lil_matrix((table.shape[0], len(universe_typ)), dtype=dtype)
#         for dtype in (np.int32, np.float64, np.float64)
#     ]
#     universe_type_masks_permuted = universe_type_masks[table.index]
#     for ut_idx in tqdm.trange(len(universe_typ)):
#         mask = universe_type_masks_permuted[:, ut_idx].indices
#         mask.sort()
#         filt_table = table.iloc[mask]

#         cum_pop = np.cumsum(filt_table.best_population_estimate.array[::-1])[::-1]
#         cum_pop /= cum_pop[0]

#         ordinal[filt_table.index, ut_idx] = np.arange(len(filt_table))
#         percentile[filt_table.index[:-1], ut_idx] = cum_pop[1:]
#         values[filt_table.index, ut_idx] = filt_table[stat_col]
#     ordinal, percentile, values = [
#         csc_matrix(arr) for arr in (ordinal, percentile, values)
#     ]
#     return ordinal, percentile, values


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
def compute_ordinal_info(universe_type_masks, universe_typ, table, stat_col):
    table = sort_by_column(table, stat_col)
    ordinal, percentile, values = [[] for _ in range(3)]
    counts_per_ut = []
    universe_type_masks_permuted = universe_type_masks[table.index]
    for ut_idx in range(len(universe_typ)):
        mask = universe_type_masks_permuted[:, ut_idx].indices
        mask.sort()
        filt_table = table.iloc[mask]

        ut_idx_arr = np.zeros(len(filt_table), dtype=np.int64) + ut_idx
        values.append((filt_table.index, ut_idx_arr, filt_table[stat_col]))
        ordinal.append((filt_table.index, ut_idx_arr, np.arange(len(filt_table))))

        # Remove NaN values from the filtered table to compute percentiles
        # We do not do this for other values, to preserve stability of sorting etc
        non_nan = ~np.isnan(filt_table[stat_col].array)
        counts_per_ut.append(np.sum(non_nan))
        mask = mask[non_nan]
        filt_table = filt_table.iloc[non_nan]
        ut_idx_arr = ut_idx_arr[non_nan]

        cum_pop = np.cumsum(filt_table.best_population_estimate.array[::-1])[::-1]
        if cum_pop.size > 0:
            cum_pop /= cum_pop[0]

        cum_pop *= 100
        cum_pop = cum_pop.astype(np.uint8)

        percentile.append((filt_table.index[:-1], ut_idx_arr[1:], cum_pop[1:]))
    ordinal, percentile, values = [
        to_csc_matrix(arr, dtype=dtype, shape=(table.shape[0], len(universe_typ)))
        for arr, dtype in zip(
            [ordinal, percentile, values], [np.int32, np.uint8, np.float32]
        )
    ]
    counts = np.array(counts_per_ut, dtype=np.int64)
    return OrdinalInfoForColumn(ordinal, percentile, values, counts)


def fully_complete_ordinals(sorted_by_name, universe_typ):
    universe_type_masks = compute_universe_type_masks(sorted_by_name, universe_typ)
    return OrdinalInfo(
        universe_typ,
        {ut: i for i, ut in enumerate(universe_typ)},
        universe_type_masks,
        {
            stat_col: compute_ordinal_info(
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
            for stat_col in tqdm.tqdm(internal_statistic_names())
        },
        sorted_by_name.index_order,
        sorted_by_name.longname,
    )


def sort_by_column(sorted_by_name, stat_col):
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


def to_csc_matrix(arr, dtype, shape):
    row_idxs, col_idxs, data = [np.concatenate(x) for x in zip(*arr)]
    return csc_matrix((data, (row_idxs, col_idxs)), dtype=dtype, shape=shape)
