from dataclasses import dataclass
from typing import List

import numpy as np
import pandas as pd
import tqdm
from permacache import permacache

from urbanstats.data.census_blocks import all_densities_gpd


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
    def compute_usa(year, shapefile):
        return _compute_crosswalk(year, shapefile)

    def compute_sum_by_shapefile(self, values):
        """
        values: np.ndarray of shape (max(index_block), ...)

        Returns: np.ndarray of shape (max(index_shapefile), ...)
        """
        chunk = 5
        if values.shape[1] > chunk:
            results_each = [
                self.compute_sum_by_shapefile(values[:, start : start + chunk])
                for start in tqdm.trange(
                    0, values.shape[1], chunk, desc="chunking the aggregation"
                )
            ]
            return np.concatenate(results_each, axis=1)

        result = np.zeros(
            (self.index_shapefile.max() + 1, *values.shape[1:]), dtype=np.float64
        )
        np.add.at(result, self.index_shapefile, values[self.index_block])
        return result

    def compute_sum_by_shapefile_dataframe(self, shapefile, values):
        sum_array = self.compute_sum_by_shapefile(np.array(values.fillna(0)))
        index = shapefile.load_file().index
        if len(index) > len(sum_array):
            sum_array = np.concatenate(
                [
                    sum_array,
                    np.zeros((len(index) - len(sum_array), *sum_array.shape[1:])),
                ]
            )
        return pd.DataFrame(sum_array, columns=values.columns, index=index)


@permacache(
    "urbanstats/geometry/census_aggregation/_compute_crosswalk_3",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def _compute_crosswalk(year, shapefile):
    geometry_row = all_densities_gpd(year)[["geometry"]].fillna(0)
    return _compute_crosswalk_for_geometry_row(geometry_row, shapefile)


def _compute_crosswalk_for_geometry_row(geometry_row, shapefile):
    s = shapefile.load_file().reset_index(drop=True)
    if shapefile.chunk_size is None:
        return _compute_crosswalk_direct(geometry_row, s)
    crosswalks = []
    for chunk in tqdm.trange(0, len(s), shapefile.chunk_size):
        crosswalks.append(
            _compute_crosswalk_direct(
                geometry_row, s[chunk : chunk + shapefile.chunk_size]
            )
        )
    return Crosswalk.combine(crosswalks)


def _compute_crosswalk_direct(geometry_row, s):
    c = s.sjoin(
        geometry_row,
        how="inner",
        predicate="intersects",
    )
    index_shapefile, index_block = np.array(c.index), np.array(c.index_right)
    return Crosswalk(s.index, index_shapefile, index_block)


def aggregate_by_census_block(year, shapefile, values):
    crosswalk = Crosswalk.compute_usa(year, shapefile)
    return crosswalk.compute_sum_by_shapefile_dataframe(shapefile, values)
