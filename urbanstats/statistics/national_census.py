from abc import abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from permacache import permacache, stable_hash

from urbanstats.acs.load import aggregated_acs_data, aggregated_acs_data_us_pr
from urbanstats.data.australia.abs_tables import sa1_table
from urbanstats.data.australia.mesh_blocks import disaggregated_from_sa1
from urbanstats.geometry.census_aggregation import aggregate_by_mesh_block_australia
from urbanstats.statistics.statistic_collection import (
    StatisticCollection,
    statcan_legacy_names,
)


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


@dataclass(frozen=True)
class AustralianCounts:
    """
    Counts from the ABS DataPack, which is by SA1, split across each SA1's mesh blocks in proportion
    to `weight` ("population" or "dwellings").
    """

    # DataPack table -> (column -> the short-header codes summed into it)
    tables: Dict[str, Dict[str, List[str]]]
    weight: str = "population"

    def compute(self, shapefile):
        return pd.concat(
            [
                australian_counts(table, cells, self.weight, shapefile.geometry)
                for table, cells in self.tables.items()
            ],
            axis=1,
        )


@permacache(
    "urbanstats/statistics/national_census/australian_counts",
    key_function=dict(cells=stable_hash),
)
def australian_counts(table, cells, weight, geometry):
    return aggregate_by_mesh_block_australia(
        geometry, disaggregated_from_sa1(sa1_table(table, cells), weight)
    )


class NationalCensusStatistics(StatisticCollection):
    """
    Statistics several countries' censuses define the same way. Each country's counts are summed
    over every region, not just the ones inside it, so regions straddling a border get both.
    """

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
        if "Canada" not in self.country_inputs():
            return {}
        return statcan_legacy_names(self)

    def countries_for_each_statistic(self):
        """Statistic -> the countries that have it. It is NaN for regions in any other."""
        return self.same_for_each_name(tuple(self.country_inputs()))

    def computed_countries(self, shapefile):
        """
        The countries to compute for the shapefile, and whether each region is covered: all its
        source countries are among them. None if there are no countries to compute.
        """
        inputs = self.country_inputs()
        countries = [c for c in inputs if c in shapefile.source_country_list]
        if not countries:
            return None
        return countries, regions_within(shapefile, countries)

    def summed_counts(self, shapefile):
        """
        The counts summed over the countries computed, NaN for regions not covered, and which
        countries those are. None if there are none.
        """
        computed = self.computed_countries(shapefile)
        if computed is None:
            return None
        countries, covered = computed
        inputs = self.country_inputs()
        counts = None
        for country in countries:
            country_counts = inputs[country].compute(shapefile).fillna(0)
            counts = (
                country_counts
                if counts is None
                else counts.add(country_counts, fill_value=0)
            )
        counts.loc[~covered] = np.nan
        return counts.copy(), countries

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        computed = self.summed_counts(shapefile)
        if computed is None:
            return {}
        counts, _ = computed
        self.mutate_counts(counts)
        return {
            name: counts[name].where(regions_within(shapefile, countries).to_numpy())
            for name, countries in self.countries_for_each_statistic().items()
        }


def regions_within(shapefile, countries):
    """Whether each region lies within the countries, indexed like shapefile.load_file()."""
    by_region = shapefile.source_countries.by_region(shapefile)
    return by_region.map(lambda cs: cs is not None and set(cs) <= set(countries))
