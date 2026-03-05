from dataclasses import dataclass

import numpy as np
import tqdm.auto as tqdm

from urbanstats.statistics.output_statistics_metadata import internal_statistic_names


@dataclass
class FlatOrdinals:
    start_in_array_each: np.ndarray  # N
    length_each: np.ndarray  # N
    ordinals_flat: np.ndarray  # sum(u)
    percentiles_flat: np.ndarray  # sum(u)

    def query(self, longname_idx):
        start = self.start_in_array_each[longname_idx]
        length = self.length_each[longname_idx]

        ordinals, percentiles = [
            arr[:, start : start + 2 * length].reshape(-1, 2, length)
            for arr in [self.ordinals_flat, self.percentiles_flat]
        ]
        ordinals = ordinals + 1
        return ordinals, percentiles


def compute_flat_ordinals(full, ordering):
    universes_each = (
        full[["longname", "type", "universes"]].set_index("longname").loc[full.longname]
    )
    num_universes_each = universes_each.universes.apply(len).to_numpy()
    start_in_arry_each = 2 * np.cumsum([0, *num_universes_each])[:-1]
    idx_in_sorted, ut_idxs = np.array(
        [
            [ordering.longname_to_idx[long], ordering.universe_type_to_idx[u, t_to_use]]
            for long, t, us in (
                zip(universes_each.index, universes_each.type, universes_each.universes)
            )
            for t_to_use in [t, "overall"]
            for u in us
        ]
    ).T
    ordinals_flat = np.array(
        [
            np.array(ordering.by_column[k].ordinal[idx_in_sorted, ut_idxs])[0]
            for k in tqdm.tqdm(
                internal_statistic_names(), desc="Computing flat ordinals"
            )
        ]
    )
    percentiles_flat = np.array(
        [
            np.array(ordering.by_column[k].percentile[idx_in_sorted, ut_idxs])[0]
            for k in tqdm.tqdm(
                internal_statistic_names(), desc="Computing flat percentiles"
            )
        ]
    )
    return FlatOrdinals(
        start_in_array_each=start_in_arry_each,
        length_each=num_universes_each,
        ordinals_flat=ordinals_flat,
        percentiles_flat=percentiles_flat,
    )
