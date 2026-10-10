from abc import abstractmethod
from typing import Any, Dict

import numpy as np
import pandas as pd

from urbanstats.acs.load import aggregated_acs_data
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.statistics.statistic_collection import StatisticCollection
from urbanstats.universe.universe_list import universe_by_universe_type
from urbanstats.universe.universe_provider.compute_universes import (
    compute_universes_for_shapefile,
)

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
        covered = covered_by_countries(shapefile, countries)
        counts.loc[~covered] = np.nan
        return self.post_process(counts)


def covered_by_countries(shapefile, countries):
    """
    Whether each region lies within the given countries, so that their counts cover all of it. A
    region is in a country if it has that country's universe.
    """
    universes = compute_universes_for_shapefile(shapefiles, shapefile)
    all_countries = set(universe_by_universe_type()["country"])
    table = shapefile.load_file()
    covered = []
    for longname in table.longname:
        in_countries = set(universes[longname]) & all_countries
        covered.append(bool(in_countries) and in_countries <= set(countries))
    return pd.Series(covered, index=table.index)
