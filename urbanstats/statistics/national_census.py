from abc import abstractmethod
from typing import Any, Dict

import numpy as np
import pandas as pd

from urbanstats.acs.load import aggregated_acs_data
from urbanstats.statistics.statistic_collection import StatisticCollection

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
        countries = [c for c in inputs if c in shapefile.source_country_list]
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
        by_region = shapefile.source_countries.by_region(shapefile)
        covered = by_region.map(lambda cs: cs is not None and set(cs) <= set(countries))
        counts.loc[~covered] = np.nan
        return self.post_process(counts)
