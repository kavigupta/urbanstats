from abc import abstractmethod
from dataclasses import dataclass
from typing import Any, Dict

import numpy as np
import pandas as pd

from urbanstats.acs.load import aggregated_acs_data, aggregated_acs_data_us_pr
from urbanstats.statistics.statistic_collection import StatisticCollection


@dataclass(frozen=True)
class ACSCounts:
    entity: Any

    def compute(self, shapefile):
        return aggregated_acs_data(2020, self.entity, shapefile.geometry)


@dataclass(frozen=True)
class ACSUSPRCounts:
    """Counts from separate US and Puerto Rico ACS tables."""

    entity_us: Any
    entity_pr: Any

    def compute(self, shapefile):
        return aggregated_acs_data_us_pr(
            2020, self.entity_us, self.entity_pr, shapefile.geometry
        )


@dataclass(frozen=True)
class StatCanCounts:
    census_tables: Any

    def compute(self, shapefile):
        return self.census_tables.compute(2021, shapefile)


class NationalCensusStatistics(StatisticCollection):
    """
    Statistics several countries' censuses define the same way. Each country's counts are summed
    over every region, not just the ones inside it, so regions straddling a border get both.
    """

    version: Dict[str, int]

    @abstractmethod
    def country_inputs(self) -> Dict[str, Any]:
        """
        Country -> an object whose compute(shapefile) gives that country's counts, summed over each
        of the shapefile's regions. Every country's counts have the same columns.
        """

    @abstractmethod
    def mutate_counts(self, counts: pd.DataFrame) -> None:
        """Turns the counts, summed over the countries, into the statistics, in place."""

    def legacy_statistic_names(self):
        # Canada's, from before the two countries' statistics were merged
        return {
            f"{name} [StatCan]": name
            for name in self.name_for_each_statistic().values()
        }

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
            country_counts = inputs[country].compute(shapefile).fillna(0)
            counts = (
                country_counts
                if counts is None
                else counts.add(country_counts, fill_value=0)
            )
        by_region = shapefile.source_countries.by_region(shapefile)
        covered = by_region.map(lambda cs: cs is not None and set(cs) <= set(countries))
        counts.loc[~covered] = np.nan
        counts = counts.copy()
        self.mutate_counts(counts)
        return {name: counts[name] for name in self.internal_statistic_names_list()}
