from abc import abstractmethod

import numpy as np

from urbanstats.data.canada.canadian_da_data import CensusTables
from urbanstats.statistics.collections.household_size import (
    HouseholdSizeStatistics,
    compute_population_weighted_household_size,
)
from urbanstats.statistics.collections.same_as_us import SameAsUS
from urbanstats.statistics.collections.transportation_commute_time import (
    TransportationCommuteTimeStatistics,
)
from urbanstats.statistics.statistic_collection import CanadaStatistics
from urbanstats.statistics.utils import fractionalize
from urbanstats.utils import approximate_quantile


class CensusCanadaSameAsUS(SameAsUS, CanadaStatistics):
    name_suffix = "canada"
    source_tag = "StatCan"

    @abstractmethod
    def census_tables(self) -> CensusTables:
        pass

    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        st = self.census_tables().compute(2021, shapefile)
        return self.post_process(st)

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("canadian-census-disaggregated")


class CensusCanadaCommuteTime(CensusCanadaSameAsUS):
    version: int = 3

    def census_tables(self) -> CensusTables:
        # pylint: disable=line-too-long
        return CensusTables(
            [
                "Total - Commuting duration for the employed labour force aged 15 years and over with a usual place of work or no fixed workplace address - 25% sample data (201)"
            ],
            {
                None: [
                    "Total - Commuting duration for the employed labour force aged 15 years and over with a usual place of work or no fixed workplace address - 25% sample data (201)",
                ],
                "transportation_commute_time_15_to_29_canada": [
                    "  15 to 29 minutes",
                ],
                "transportation_commute_time_over_60_canada": [
                    "  60 minutes and over",
                ],
                "transportation_commute_time_30_to_44_canada": [
                    "  30 to 44 minutes",
                ],
                "transportation_commute_time_45_to_59_canada": [
                    "  45 to 59 minutes",
                ],
                "transportation_commute_time_under_15_canada": [
                    "  Less than 15 minutes",
                ],
            },
            "population",
        )

    def us_equivalent(self):
        return TransportationCommuteTimeStatistics()

    def post_process(self, statistic_table):
        stats_array = np.array(
            statistic_table[
                [
                    "transportation_commute_time_under_15_canada",
                    "transportation_commute_time_15_to_29_canada",
                    "transportation_commute_time_30_to_44_canada",
                    "transportation_commute_time_45_to_59_canada",
                    "transportation_commute_time_over_60_canada",
                ]
            ]
        )
        median_commute = np.array(
            [
                approximate_quantile([0, 15, 30, 45, 60, 120], s, 0.5)
                for s in stats_array
            ]
        )
        statistic_table[
            "transportation_commute_time_30_to_59_canada"
        ] = statistic_table.pop(
            "transportation_commute_time_30_to_44_canada"
        ) + statistic_table.pop(
            "transportation_commute_time_45_to_59_canada"
        )
        columns = [
            "transportation_commute_time_under_15_canada",
            "transportation_commute_time_15_to_29_canada",
            "transportation_commute_time_30_to_59_canada",
            "transportation_commute_time_over_60_canada",
        ]
        fractionalize(statistic_table, *columns)
        assert set(columns) == set(statistic_table)
        statistic_table["transportation_commute_time_median_canada"] = median_commute
        assert set(statistic_table) == set(self.internal_statistic_names_list())
        return statistic_table


class CensusCanadaHouseholdSize(CensusCanadaSameAsUS):
    version = 5

    def census_tables(self) -> CensusTables:
        return CensusTables(
            ["Total - Private households by household size - 100% data"],
            {
                None: [
                    "Total - Private households by household size - 100% data",
                ],
                "household_size_canada_1": [
                    "  1 person",
                ],
                "household_size_canada_2": [
                    "  2 persons",
                ],
                "household_size_canada_3": [
                    "  3 persons",
                ],
                "household_size_canada_4": [
                    "  4 persons",
                ],
                "household_size_canada_5_plus": [
                    "  5 or more persons",
                ],
            },
            "population",
        )

    def post_process(self, statistic_table):
        # Compute population-weighted household size before fractionalize
        compute_population_weighted_household_size(
            statistic_table,
            prefix="household_size_canada_",
            output_name="household_size_pw_canada",
            max_size=5,
        )
        return statistic_table

    def us_equivalent(self):
        return HouseholdSizeStatistics()


census_canada_same_as_us = [
    CensusCanadaCommuteTime(),
    CensusCanadaHouseholdSize(),
]
