from abc import abstractmethod
from typing import Any, Dict

import numpy as np
import pandas as pd
import shapely
from permacache import permacache

from urbanstats.acs.load import aggregated_acs_data
from urbanstats.geometry.shapefiles.shapefile import subset_mask_key
from urbanstats.geometry.shapefiles.shapefiles.countries import COUNTRIES
from urbanstats.statistics.statistic_collection import StatisticCollection

# The share of a region's land that may lie in countries without the statistic. Above zero only
# so that slivers from mismatched borders don't remove regions.
MAX_UNCOVERED_SHARE = 0.01

# Each country's block-level counts, summed over a shapefile's regions, from that country's input
COUNTRY_COUNTS = {
    "USA": lambda entity, shapefile: aggregated_acs_data(2020, entity, shapefile),
    "Canada": lambda census_tables, shapefile: census_tables.compute(2021, shapefile),
}


class NationalCensusStatistics(StatisticCollection):
    """
    Statistics several countries' censuses define the same way. Each country's counts are summed
    over every region, not just the ones inside it, so regions straddling a border get both.
    """

    version: Dict[str, int]

    @abstractmethod
    def country_inputs(self) -> Dict[str, Any]:
        """
        Country -> the input COUNTRY_COUNTS takes for it. Every country's input produces the same
        count columns.
        """

    @abstractmethod
    def post_process(self, counts: pd.DataFrame) -> Dict[str, Any]:
        pass

    @property
    def data_source_countries(self):
        return tuple(self.country_inputs())

    def __permacache_hash__(self):
        return (self.__class__.__name__, sorted(self.version.items()))

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        inputs = self.country_inputs()
        assert set(inputs) == set(self.version), (set(inputs), set(self.version))
        countries = [c for c in inputs if c in shapefile.subset_masks]
        if not countries:
            return {}
        counts = None
        for country in countries:
            country_counts = COUNTRY_COUNTS[country](inputs[country], shapefile)
            country_counts = country_counts.fillna(0)
            counts = (
                country_counts
                if counts is None
                else counts.add(country_counts, fill_value=0)
            )
        covered = covered_by_countries(shapefile, tuple(sorted(countries)))
        counts.loc[~covered] = np.nan
        return self.post_process(counts)


@permacache(
    "urbanstats/statistics/national_census/covered_by_countries",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def covered_by_countries(shapefile, countries):
    """
    Whether each region lies within the given countries, so that their counts cover all of it.
    """
    table = shapefile.load_file()
    covered = np.zeros(len(table), dtype=bool)
    for country in countries:
        covered |= np.array(table[subset_mask_key(country)], dtype=bool)
    # Regions a country's mask leaves out may still straddle only covered countries
    others = COUNTRIES.load_file()
    is_covered_country = others.longname.isin(countries)
    tree = shapely.STRtree(others.geometry)
    for i in np.where(~covered)[0]:
        region = table.geometry.iloc[i]
        nearby = tree.query(region, predicate="intersects")
        if not is_covered_country.iloc[nearby].any():
            continue
        area = {True: 0.0, False: 0.0}
        for j in nearby:
            area[bool(is_covered_country.iloc[j])] += region.intersection(
                others.geometry.iloc[j]
            ).area
        land = area[True] + area[False]
        covered[i] = land > 0 and area[False] / land <= MAX_UNCOVERED_SHARE
    return pd.Series(covered, index=table.index)
