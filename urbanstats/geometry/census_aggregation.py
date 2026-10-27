from dataclasses import dataclass

import numpy as np
import pandas as pd
import tqdm
from permacache import permacache

from urbanstats.data.australia.mesh_blocks import australia_mesh_blocks
from urbanstats.data.canada.canada_blocks import load_canada_db_shapefile
from urbanstats.data.census_blocks import census_block_points
from urbanstats.geometry.weighted_statistics import geometric_median_by_group


@dataclass
class Crosswalk:
    index_shapefile: np.ndarray
    index_block: np.ndarray

    @staticmethod
    def compute_usa(year, geometry):
        return _compute_crosswalk(year, geometry)

    @staticmethod
    def compute_canada(year, geometry):
        return _compute_crosswalk_canada(year, geometry)

    @staticmethod
    def compute_australia(geometry):
        return _compute_crosswalk_australia(geometry)

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

    def compute_sum_by_region(self, values, num_regions):
        """
        Like compute_sum_by_shapefile, with a row for each of the num_regions regions, including
        regions after the last one with any blocks.
        """
        sum_array = self.compute_sum_by_shapefile(values)
        if num_regions > len(sum_array):
            sum_array = np.concatenate(
                [
                    sum_array,
                    np.zeros((num_regions - len(sum_array), *sum_array.shape[1:])),
                ]
            )
        return sum_array

    def compute_sum_by_shapefile_dataframe(self, geometry, values):
        index = geometry.load_rows().index
        sum_array = self.compute_sum_by_region(np.array(values.fillna(0)), len(index))
        return pd.DataFrame(sum_array, columns=values.columns, index=index)

    def compute_geometric_median_dataframe(self, geometry, population, lat, lon):
        index = geometry.load_rows().index
        median_lat, median_lon = geometric_median_by_group(
            self.index_shapefile,
            np.asarray(lat)[self.index_block],
            np.asarray(lon)[self.index_block],
            np.asarray(population, dtype=np.float64)[self.index_block],
            len(index),
        )
        return pd.DataFrame({"lat": median_lat, "lon": median_lon}, index=index)


@permacache("urbanstats/geometry/census_aggregation/_compute_crosswalk_3")
def _compute_crosswalk(year, geometry):
    geometry_row = census_block_points(year).fillna(0)
    return _compute_crosswalk_for_geometry_row(geometry_row, geometry)


@permacache("urbanstats/geometry/census_aggregation/_compute_crosswalk_canada_2")
def _compute_crosswalk_canada(year, geometry):
    geometry_row = load_canada_db_shapefile(year)[["geometry"]]
    return _compute_crosswalk_for_geometry_row(geometry_row, geometry)


@permacache("urbanstats/geometry/census_aggregation/_compute_crosswalk_australia_2")
def _compute_crosswalk_australia(geometry):
    geometry_row = australia_mesh_blocks()[["geometry"]]
    return _compute_crosswalk_for_geometry_row(geometry_row, geometry)


def _compute_crosswalk_for_geometry_row(geometry_row, geometry):
    s = geometry.load_rows().reset_index(drop=True)
    c = s.sjoin(
        geometry_row,
        how="inner",
        predicate="intersects",
    )
    index_shapefile, index_block = np.array(c.index), np.array(c.index_right)
    return Crosswalk(index_shapefile, index_block)


def aggregate_by_census_block(year, geometry, values):
    crosswalk = Crosswalk.compute_usa(year, geometry)
    return crosswalk.compute_sum_by_shapefile_dataframe(geometry, values)


def aggregate_by_census_block_canada(year, geometry, values):
    crosswalk = Crosswalk.compute_canada(year, geometry)
    return crosswalk.compute_sum_by_shapefile_dataframe(geometry, values)


def aggregate_by_mesh_block_australia(geometry, values):
    crosswalk = Crosswalk.compute_australia(geometry)
    return crosswalk.compute_sum_by_shapefile_dataframe(geometry, values)
