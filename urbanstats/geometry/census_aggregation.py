from dataclasses import dataclass
from typing import List
import numpy as np

import pandas as pd
from permacache import permacache
import tqdm

from census_blocks import all_densities_gpd


@dataclass
class Crosswalk:
    shapefile_index_actual: List[object]
    index_shapefile: np.ndarray
    index_block: np.ndarray

    @classmethod
    def combine(cls, crosswalks):
        shapefile_index_actual = [
            idx for c in crosswalks for idx in c.shapefile_index_actual
        ]
        index_shapefile = np.concatenate([c.index_shapefile for c in crosswalks])
        index_block = np.concatenate([c.index_block for c in crosswalks])
        return cls(shapefile_index_actual, index_shapefile, index_block)

    @staticmethod
    def compute(year, shapefile):
        return _compute_crosswalk(year, shapefile)

    def compute_sum_by_shapefile(self, values):
        """
        values: np.ndarray of shape (max(index_block), ...)

        Returns: np.ndarray of shape (max(index_shapefile), ...)
        """

        result = np.zeros(
            (self.index_shapefile.max() + 1, *values.shape[1:]), dtype=np.float64
        )
        np.add.at(result, self.index_shapefile, values[self.index_block])
        return result


@permacache(
    "urbanstats/geometry/census_aggregation/_compute_crosswalk_3",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def _compute_crosswalk(year, shapefile):
    s = shapefile.load_file().reset_index(drop=True)
    if shapefile.chunk_size is None:
        return _compute_crosswalk_direct(year, s)
    crosswalks = []
    for chunk in tqdm.trange(0, len(s), shapefile.chunk_size):
        crosswalks.append(
            _compute_crosswalk_direct(year, s[chunk : chunk + shapefile.chunk_size])
        )
    return Crosswalk.combine(crosswalks)


def _compute_crosswalk_direct(year, s):
    c = s.sjoin(
        all_densities_gpd(year)[["geometry"]].fillna(0),
        how="inner",
        predicate="intersects",
    )
    index_shapefile, index_block = np.array(c.index), np.array(c.index_right)
    return Crosswalk(s.index, index_shapefile, index_block)


def aggregate_by_census_block(year, shapefile, values):
    crosswalk = Crosswalk.compute(year, shapefile)
    return pd.DataFrame(
        crosswalk.compute_sum_by_shapefile(np.array(values.fillna(0))),
        columns=values.columns,
        index=shapefile.load_file().index,
    )
